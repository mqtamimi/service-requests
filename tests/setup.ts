process.env.DATABASE_URL =
  "postgresql://postgres:postgres@localhost:5432/service_requests";

import "@testing-library/jest-dom/vitest";
import { afterEach } from "vitest";
import { cleanup } from "@testing-library/react";
import { Pool } from "pg";
import { vi } from "vitest";

vi.mock("next/server", () => ({}));
vi.mock("next-auth", () => ({
  default: () => ({}),
}));
afterEach(() => {
  cleanup();
});


/**
 * Truncate all application tables. Use in integration tests:
 *   import { truncateAllTables } from "../setup";
 *   beforeEach(async () => { await truncateAllTables(); });
 *
 * Not used by unit tests that don't touch the DB.
 */
export async function truncateAllTables(): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL not set");
  const pool = new Pool({ connectionString: url });
  try {
    const result = await pool.query<{ tablename: string }>(
      `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
    );
    const names = result.rows
      .map((r) => `"${r.tablename}"`)
      .filter((n) => !n.includes("drizzle_migrations"))
      .join(", ");
    if (names.length > 0) {
      await pool.query(`TRUNCATE ${names} RESTART IDENTITY CASCADE`);
    }
  } finally {
    await pool.end();
  }
}
