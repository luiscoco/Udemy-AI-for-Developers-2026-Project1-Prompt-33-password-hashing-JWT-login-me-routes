import { STATES } from "@equipment-hub/contract";
import type { DashboardSummary, WorkOrder } from "@equipment-hub/contract";

const OPEN_EXCLUDED_STATES = new Set(["completed", "cancelled"]);

export function buildDashboardSummary(workOrders: WorkOrder[]): DashboardSummary {
  const openWorkOrders = workOrders.filter((workOrder) => !OPEN_EXCLUDED_STATES.has(workOrder.state));

  const byState = Object.fromEntries(STATES.map((state) => [state, 0])) as Record<string, number>;
  for (const workOrder of workOrders) {
    byState[workOrder.state] = (byState[workOrder.state] ?? 0) + 1;
  }

  return {
    totalOpen: openWorkOrders.length,
    criticalOpen: openWorkOrders.filter((workOrder) => workOrder.priority === "critical").length,
    unassigned: openWorkOrders.filter((workOrder) => workOrder.technicianId === null).length,
    byState,
  };
}
