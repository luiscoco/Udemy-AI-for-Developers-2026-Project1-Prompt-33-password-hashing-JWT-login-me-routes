import { describe, expect, it } from "vitest";
import { ACTIONS, STATES } from "@equipment-hub/contract";
import type { WorkOrderAction, WorkOrderState } from "@equipment-hub/contract";
import { allowedActions, canAssignTechnician, transition } from "./workOrderLifecycle.js";

const LEGAL_TRANSITIONS: Record<WorkOrderState, Partial<Record<WorkOrderAction, WorkOrderState>>> = {
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

const FINAL_STATES: WorkOrderState[] = ["completed", "cancelled"];
const CANCELLABLE_STATES: WorkOrderState[] = ["triaged", "scheduled"];

describe("transition", () => {
  for (const state of STATES) {
    for (const action of ACTIONS) {
      const expectedNext = LEGAL_TRANSITIONS[state][action];

      if (expectedNext) {
        it(`allows "${action}" from "${state}", moving to "${expectedNext}"`, () => {
          const result = transition(state, action);

          expect(result).toEqual({ ok: true, state: expectedNext });
        });
      } else {
        it(`rejects "${action}" from "${state}"`, () => {
          const result = transition(state, action);

          expect(result.ok).toBe(false);
        });
      }
    }
  }

  it("names the allowed actions in the reason when any exist", () => {
    const result = transition("triaged", "start");

    expect(result).toEqual({
      ok: false,
      reason: 'Action "start" is not allowed from state "triaged"',
    });
  });

  for (const state of FINAL_STATES) {
    it(`rejects every action from the final state "${state}"`, () => {
      for (const action of ACTIONS) {
        const result = transition(state, action);

        expect(result.ok).toBe(false);
      }
    });
  }

  it("accepts cancel only from triaged and scheduled", () => {
    for (const state of STATES) {
      const result = transition(state, "cancel");

      if (CANCELLABLE_STATES.includes(state)) {
        expect(result).toEqual({ ok: true, state: "cancelled" });
      } else {
        expect(result.ok).toBe(false);
      }
    }
  });
});

describe("allowedActions", () => {
  for (const state of STATES) {
    const expected = Object.keys(LEGAL_TRANSITIONS[state]) as WorkOrderAction[];

    it(`returns ${JSON.stringify(expected)} for state "${state}"`, () => {
      expect(allowedActions(state)).toEqual(expected);
    });
  }

  for (const state of FINAL_STATES) {
    it(`returns an empty array for final state "${state}"`, () => {
      expect(allowedActions(state)).toEqual([]);
    });
  }
});

describe("canAssignTechnician", () => {
  it("allows assignment for every non-final state", () => {
    for (const state of STATES) {
      expect(canAssignTechnician(state)).toBe(!FINAL_STATES.includes(state));
    }
  });
});
