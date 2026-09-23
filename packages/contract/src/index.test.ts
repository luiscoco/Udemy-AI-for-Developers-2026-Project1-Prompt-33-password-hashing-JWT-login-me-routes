import { describe, expect, it } from "vitest";
import { ACTIONS, PRIORITIES, ROLES, STATES } from "./index.js";

function hasNoDuplicates(values: readonly string[]): boolean {
  return new Set(values).size === values.length;
}

describe("STATES", () => {
  it("includes all six expected work order states", () => {
    expect(STATES).toEqual(
      expect.arrayContaining([
        "reported",
        "triaged",
        "scheduled",
        "in_progress",
        "completed",
        "cancelled",
      ]),
    );
    expect(STATES).toHaveLength(6);
  });

  it("contains no duplicates", () => {
    expect(hasNoDuplicates(STATES)).toBe(true);
  });
});

describe("ACTIONS", () => {
  it("includes all five expected actions", () => {
    expect(ACTIONS).toEqual(
      expect.arrayContaining(["triage", "schedule", "start", "complete", "cancel"]),
    );
    expect(ACTIONS).toHaveLength(5);
  });

  it("contains no duplicates", () => {
    expect(hasNoDuplicates(ACTIONS)).toBe(true);
  });
});

describe("PRIORITIES", () => {
  it("includes all four expected priorities", () => {
    expect(PRIORITIES).toEqual(expect.arrayContaining(["low", "medium", "high", "critical"]));
    expect(PRIORITIES).toHaveLength(4);
  });

  it("contains no duplicates", () => {
    expect(hasNoDuplicates(PRIORITIES)).toBe(true);
  });
});

describe("ROLES", () => {
  it("includes all three expected roles", () => {
    expect(ROLES).toEqual(expect.arrayContaining(["technician", "supervisor", "admin"]));
    expect(ROLES).toHaveLength(3);
  });

  it("contains no duplicates", () => {
    expect(hasNoDuplicates(ROLES)).toBe(true);
  });
});

describe("generated type module", () => {
  it("is importable without runtime errors", async () => {
    await expect(import("./types.gen.js")).resolves.toBeDefined();
  });
});
