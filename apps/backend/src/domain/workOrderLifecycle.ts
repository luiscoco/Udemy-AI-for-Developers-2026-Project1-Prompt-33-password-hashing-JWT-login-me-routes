import type { WorkOrderAction, WorkOrderState } from "@equipment-hub/contract";

export type TransitionResult =
  | { ok: true; state: WorkOrderState }
  | { ok: false; reason: string };

const TRANSITIONS: Record<WorkOrderState, Partial<Record<WorkOrderAction, WorkOrderState>>> = {
  reported: {
    triage: "triaged",
  },
  triaged: {
    schedule: "scheduled",
    cancel: "cancelled",
  },
  scheduled: {
    start: "in_progress",
    cancel: "cancelled",
  },
  in_progress: {
    complete: "completed",
  },
  completed: {},
  cancelled: {},
};

export function transition(state: WorkOrderState, action: WorkOrderAction): TransitionResult {
  const nextState = TRANSITIONS[state][action];

  if (!nextState) {
    return { ok: false, reason: `Action "${action}" is not allowed from state "${state}"` };
  }

  return { ok: true, state: nextState };
}

export function allowedActions(state: WorkOrderState): WorkOrderAction[] {
  return Object.keys(TRANSITIONS[state]) as WorkOrderAction[];
}

export function canAssignTechnician(state: WorkOrderState): boolean {
  return state !== "completed" && state !== "cancelled";
}
