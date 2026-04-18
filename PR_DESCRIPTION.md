## Approach

The data model follows the suggested shape closely: a `service_requests` table for the core record, an append-only `service_request_events` table for status history, and a `service_request_comments` table with a `visibility` column (`public | internal`). Authorization is enforced entirely at the tRPC layer via `customerProcedure` and `adminProcedure` — both built on `protectedProcedure` — so role checks are never duplicated inline. Status transitions are governed by a single pure `canTransition(from, to): boolean` function, making the logic trivially testable and impossible to diverge across call sites.

## Trade-offs

- **Field-level security via DB filter, not post-processing.** `getMine` uses a `WHERE visibility = 'public'` clause rather than fetching everything and filtering in JavaScript. This means internal comments are never materialized in the server process for a customer request — they can't accidentally leak through serialization, logging, or future refactors.
- **No pagination.** The README lists this as an explicit non-goal. `listAll` fetches all matching rows; a `limit` + cursor could be added later in one small `input` extension.
- **Server Components for detail pages.** The portal and admin detail pages are Server Components that fetch directly from the DB, avoiding a client round-trip. The interactive parts (status change, add comment) are extracted into focused `"use client"` components (`AdminRequestActions`), keeping the serialization boundary narrow.
- **Reference generation.** I went with a timestamp + random suffix (`SR-<base36ts>-<4chars>`) over a sequential counter to avoid a race condition under concurrent inserts without a DB sequence. A proper `SEQUENCE` would be cleaner in production but adds migration complexity for a take-home.
- **`jsdom` environment for all tests.** The vitest config uses `jsdom` globally (needed for the form component test). Integration tests that hit the DB work fine in jsdom — the environment only affects browser globals, not Node/Postgres I/O.

## What I'd do next with more time

- **Pagination** on the admin queue — cursor-based with `id` as the tiebreaker.
- **Optimistic updates** on the status-change buttons so the UI reflects the change immediately without a full `router.refresh()`.
- **Email notification stubs** — a `sendNotification(requestId, event)` hook called from `updateStatus` and `addComment`, behind a feature flag.
- **Rate limiting** on `create` per customer — prevent accidental or malicious spam via a Redis counter.
- **E2E tests** with Playwright covering the full login → submit → admin triage flow, which would catch the integration between NextAuth session, tRPC context, and DB in a way unit tests don't.

## How to run

```bash
# Prerequisites: Node 22, pnpm 10+, Docker Desktop

pnpm install
docker compose up -d
cp .env.example .env
pnpm db:push
pnpm db:seed
pnpm dev          # → http://localhost:3000

pnpm test         # unit + component tests run without DB
                  # integration tests need DATABASE_URL from .env
pnpm typecheck
pnpm lint
```

Log in as `customer@example.com` (portal) or `admin@example.com` (admin). Any password is accepted.

## Time spent

~6 hours.
