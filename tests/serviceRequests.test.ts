import { describe, it, expect, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { eq } from "drizzle-orm";
import { truncateAllTables } from "./setup";
import { db } from "../src/server/db";
import {
  users,
  serviceRequests,
  serviceRequestEvents,
  serviceRequestComments,
} from "../src/server/db/schema";
import { serviceRequestsRouter } from "../src/server/trpc/serviceRequests";
import type { createTRPCContext } from "../src/server/trpc/trpc";

// ── Helpers ────────────────────────────────────────────────────────────────

type Role = "customer" | "admin";
type Ctx = Awaited<ReturnType<typeof createTRPCContext>>;

function makeCtx(userId: string, role: Role): Ctx {
  return {
    db,
    session: {
      user: { id: userId, role, email: `${role}@test.com`, name: role },
      expires: new Date(Date.now() + 3_600_000).toISOString(),
    },
  } as Ctx;
}

function noSessionCtx(): Ctx {
  return { db, session: null } as unknown as Ctx;
}

// ── Fixtures ───────────────────────────────────────────────────────────────

let customerId: string;
let otherCustomerId: string;
let adminId: string;

beforeEach(async () => {
  await truncateAllTables();

  const [c] = await db
    .insert(users)
    .values({ email: "customer@test.com", name: "Casey", role: "customer" })
    .returning();
  const [o] = await db
    .insert(users)
    .values({ email: "other@test.com", name: "Other", role: "customer" })
    .returning();
  const [a] = await db
    .insert(users)
    .values({ email: "admin@test.com", name: "Avery", role: "admin" })
    .returning();

  customerId = c!.id;
  otherCustomerId = o!.id;
  adminId = a!.id;
});

async function insertRequest(overrides: {
  customerId: string;
  reference?: string;
  status?: "submitted" | "in_progress" | "resolved" | "rejected" | "closed";
}) {
  const [req] = await db
    .insert(serviceRequests)
    .values({
      reference: overrides.reference ?? `SR-TEST-${Date.now()}`,
      customerId: overrides.customerId,
      type: "other",
      priority: "low",
      description: "a valid description here",
      status: overrides.status ?? "submitted",
    })
    .returning();
  return req!;
}

// ── Authorization ──────────────────────────────────────────────────────────

describe("authorization", () => {
  it("unauthenticated user cannot call create", async () => {
    const c = serviceRequestsRouter.createCaller(noSessionCtx());
    await expect(
      c.create({ type: "other", priority: "low", description: "test description here" }),
    ).rejects.toThrow(TRPCError);
  });

  it("customer cannot call admin listAll", async () => {
    const c = serviceRequestsRouter.createCaller(makeCtx(customerId, "customer"));
    await expect(c.listAll({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("customer cannot call admin getOne", async () => {
    const req = await insertRequest({ customerId });
    const c = serviceRequestsRouter.createCaller(makeCtx(customerId, "customer"));
    await expect(c.getOne({ id: req.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("customer cannot call updateStatus", async () => {
    const req = await insertRequest({ customerId });
    const c = serviceRequestsRouter.createCaller(makeCtx(customerId, "customer"));
    await expect(
      c.updateStatus({ id: req.id, toStatus: "in_progress" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("customer cannot call addComment", async () => {
    const req = await insertRequest({ customerId });
    const c = serviceRequestsRouter.createCaller(makeCtx(customerId, "customer"));
    await expect(
      c.addComment({ requestId: req.id, body: "hi", visibility: "public" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("customer cannot read another customer's request via getMine", async () => {
    const req = await insertRequest({ customerId: otherCustomerId });
    const c = serviceRequestsRouter.createCaller(makeCtx(customerId, "customer"));
    await expect(c.getMine({ id: req.id })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("admin cannot call customer-only listMine", async () => {
    const c = serviceRequestsRouter.createCaller(makeCtx(adminId, "admin"));
    await expect(c.listMine()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

// ── Field-level visibility ─────────────────────────────────────────────────

describe("getMine strips internal comments", () => {
  it("returns only public comments in getMine — internal notes are absent from the payload", async () => {
    const req = await insertRequest({ customerId });

    await db.insert(serviceRequestComments).values([
      {
        requestId: req.id,
        authorId: adminId,
        visibility: "public",
        body: "Public reply",
      },
      {
        requestId: req.id,
        authorId: adminId,
        visibility: "internal",
        body: "SECRET internal note",
      },
    ]);

    const result = await serviceRequestsRouter
      .createCaller(makeCtx(customerId, "customer"))
      .getMine({ id: req.id });

    expect(result.comments).toHaveLength(1);
    expect(result.comments[0]!.body).toBe("Public reply");

    // Internal note must not appear anywhere in the serialized response
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain("SECRET internal note");
    expect(serialized).not.toContain('"internal"');
  });
});

// ── create ─────────────────────────────────────────────────────────────────

describe("create", () => {
  it("creates a request and writes a submitted event", async () => {
    const c = serviceRequestsRouter.createCaller(makeCtx(customerId, "customer"));
    const req = await c.create({
      type: "outage",
      priority: "high",
      description: "The service is completely down and we need help immediately.",
    });

    const events = await db
      .select()
      .from(serviceRequestEvents)
      .where(eq(serviceRequestEvents.requestId, req.id));

    expect(events).toHaveLength(1);
    expect(events[0]!.toStatus).toBe("submitted");
    expect(events[0]!.fromStatus).toBeNull();
    expect(events[0]!.actorId).toBe(customerId);
  });

  it("rejects description shorter than 10 characters", async () => {
    const c = serviceRequestsRouter.createCaller(makeCtx(customerId, "customer"));
    await expect(
      c.create({ type: "other", priority: "low", description: "short" }),
    ).rejects.toThrow();
  });
});

// ── updateStatus ───────────────────────────────────────────────────────────

describe("updateStatus", () => {
  it("writes a status-change event on updateStatus", async () => {
    const req = await insertRequest({ customerId });
    const adminCaller = serviceRequestsRouter.createCaller(makeCtx(adminId, "admin"));

    await adminCaller.updateStatus({ id: req.id, toStatus: "in_progress" });

    const events = await db
      .select()
      .from(serviceRequestEvents)
      .where(eq(serviceRequestEvents.requestId, req.id));

    const transition = events.find((e) => e.fromStatus === "submitted");
    expect(transition).toBeDefined();
    expect(transition!.toStatus).toBe("in_progress");
    expect(transition!.actorId).toBe(adminId);
  });

  it("rejects a skip-step transition (submitted → closed)", async () => {
    const req = await insertRequest({ customerId });
    const adminCaller = serviceRequestsRouter.createCaller(makeCtx(adminId, "admin"));
    await expect(
      adminCaller.updateStatus({ id: req.id, toStatus: "closed" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects a backward transition (in_progress → submitted)", async () => {
    const req = await insertRequest({ customerId, status: "in_progress" });
    const adminCaller = serviceRequestsRouter.createCaller(makeCtx(adminId, "admin"));
    await expect(
      adminCaller.updateStatus({ id: req.id, toStatus: "submitted" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("rejects transitions from a terminal state (rejected → anything)", async () => {
    const req = await insertRequest({ customerId, status: "rejected" });
    const adminCaller = serviceRequestsRouter.createCaller(makeCtx(adminId, "admin"));
    await expect(
      adminCaller.updateStatus({ id: req.id, toStatus: "in_progress" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
