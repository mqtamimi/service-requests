import { describe, it, expect } from "vitest";
import { canTransition } from "../src/lib/transitions";

describe("canTransition", () => {
  // ── Allowed transitions ────────────────────────────────────────────────
  it("allows submitted → in_progress", () => {
    expect(canTransition("submitted", "in_progress")).toBe(true);
  });

  it("allows submitted → rejected", () => {
    expect(canTransition("submitted", "rejected")).toBe(true);
  });

  it("allows in_progress → resolved", () => {
    expect(canTransition("in_progress", "resolved")).toBe(true);
  });

  it("allows in_progress → rejected", () => {
    expect(canTransition("in_progress", "rejected")).toBe(true);
  });

  it("allows resolved → closed", () => {
    expect(canTransition("resolved", "closed")).toBe(true);
  });

  // ── Disallowed transitions ─────────────────────────────────────────────
  it("disallows submitted → resolved (skip step)", () => {
    expect(canTransition("submitted", "resolved")).toBe(false);
  });

  it("disallows submitted → closed (skip multiple steps)", () => {
    expect(canTransition("submitted", "closed")).toBe(false);
  });

  it("disallows in_progress → submitted (backward)", () => {
    expect(canTransition("in_progress", "submitted")).toBe(false);
  });

  it("disallows in_progress → closed (skip step)", () => {
    expect(canTransition("in_progress", "closed")).toBe(false);
  });

  it("disallows resolved → submitted (backward)", () => {
    expect(canTransition("resolved", "submitted")).toBe(false);
  });

  it("disallows resolved → in_progress (backward)", () => {
    expect(canTransition("resolved", "in_progress")).toBe(false);
  });

  it("disallows resolved → rejected (after resolution)", () => {
    expect(canTransition("resolved", "rejected")).toBe(false);
  });

  it("disallows rejected → any status (terminal)", () => {
    expect(canTransition("rejected", "submitted")).toBe(false);
    expect(canTransition("rejected", "in_progress")).toBe(false);
    expect(canTransition("rejected", "resolved")).toBe(false);
    expect(canTransition("rejected", "closed")).toBe(false);
  });

  it("disallows closed → any status (terminal)", () => {
    expect(canTransition("closed", "submitted")).toBe(false);
    expect(canTransition("closed", "in_progress")).toBe(false);
    expect(canTransition("closed", "resolved")).toBe(false);
    expect(canTransition("closed", "rejected")).toBe(false);
  });

  it("disallows self-transitions", () => {
    expect(canTransition("submitted", "submitted")).toBe(false);
    expect(canTransition("in_progress", "in_progress")).toBe(false);
  });
});
