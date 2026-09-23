import { describe, expect, it } from "vitest";
import type { WorkOrder } from "@equipment-hub/contract";
import { buildDashboardSummary } from "./dashboard.js";

function makeWorkOrder(overrides: Partial<WorkOrder>): WorkOrder {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    reference: "WO-2026-0001",
    assetId: "00000000-0000-0000-0000-000000000001",
    title: "Fixture work order",
    description: "Fixture description",
    priority: "medium",
    state: "reported",
    technicianId: null,
    reportedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

const FIXTURE_WORK_ORDERS: WorkOrder[] = [
  makeWorkOrder({ id: "1", state: "reported", priority: "critical", technicianId: null }),
  makeWorkOrder({ id: "2", state: "triaged", priority: "high", technicianId: "tech-1" }),
  makeWorkOrder({ id: "3", state: "scheduled", priority: "critical", technicianId: "tech-2" }),
  makeWorkOrder({ id: "4", state: "in_progress", priority: "medium", technicianId: "tech-3" }),
  makeWorkOrder({ id: "5", state: "completed", priority: "critical", technicianId: null }),
  makeWorkOrder({ id: "6", state: "cancelled", priority: "critical", technicianId: null }),
];

describe("buildDashboardSummary", () => {
  it("counts open work orders as everything not completed or cancelled", () => {
    const summary = buildDashboardSummary(FIXTURE_WORK_ORDERS);

    expect(summary.totalOpen).toBe(4);
  });

  it("counts critical-priority work orders among the open ones only", () => {
    const summary = buildDashboardSummary(FIXTURE_WORK_ORDERS);

    expect(summary.criticalOpen).toBe(2);
  });

  it("counts open work orders with no technician assigned", () => {
    const summary = buildDashboardSummary(FIXTURE_WORK_ORDERS);

    expect(summary.unassigned).toBe(1);
  });

  it("counts every work order by state, including states with zero matches", () => {
    const summary = buildDashboardSummary(FIXTURE_WORK_ORDERS);

    expect(summary.byState).toEqual({
      reported: 1,
      triaged: 1,
      scheduled: 1,
      in_progress: 1,
      completed: 1,
      cancelled: 1,
    });
  });

  it("returns zeroed counts for an empty list", () => {
    const summary = buildDashboardSummary([]);

    expect(summary).toEqual({
      totalOpen: 0,
      criticalOpen: 0,
      unassigned: 0,
      byState: {
        reported: 0,
        triaged: 0,
        scheduled: 0,
        in_progress: 0,
        completed: 0,
        cancelled: 0,
      },
    });
  });

  it("does not count a completed critical unassigned work order as open", () => {
    const summary = buildDashboardSummary([
      makeWorkOrder({ id: "1", state: "completed", priority: "critical", technicianId: null }),
    ]);

    expect(summary.totalOpen).toBe(0);
    expect(summary.criticalOpen).toBe(0);
    expect(summary.unassigned).toBe(0);
  });
});
