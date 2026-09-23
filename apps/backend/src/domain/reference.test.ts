import { describe, expect, it } from "vitest";
import { nextWorkOrderReference } from "./reference.js";

describe("nextWorkOrderReference", () => {
  it("returns 0001 when no reference exists for that year", () => {
    expect(nextWorkOrderReference([], 2026)).toBe("WO-2026-0001");
  });

  it("ignores references from older years", () => {
    const existing = ["WO-2025-0001", "WO-2025-0002"];

    expect(nextWorkOrderReference(existing, 2026)).toBe("WO-2026-0001");
  });

  it("handles unsorted input references", () => {
    const existing = ["WO-2026-0003", "WO-2026-0001", "WO-2026-0002"];

    expect(nextWorkOrderReference(existing, 2026)).toBe("WO-2026-0004");
  });

  it("allows gaps in the sequence and uses max + 1", () => {
    const existing = ["WO-2026-0001", "WO-2026-0009"];

    expect(nextWorkOrderReference(existing, 2026)).toBe("WO-2026-0010");
  });

  it("safely ignores unrelated strings", () => {
    const existing = ["not-a-reference", "WO-2026-000X", "", "WO-2026-0001-extra", "WO-2026-0002"];

    expect(nextWorkOrderReference(existing, 2026)).toBe("WO-2026-0003");
  });
});
