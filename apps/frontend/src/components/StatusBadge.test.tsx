import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { WorkOrderState } from "@equipment-hub/contract";
import StatusBadge from "./StatusBadge";

const EXPECTED_LABELS: Record<WorkOrderState, string> = {
  reported: "Reported",
  triaged: "Triaged",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

describe("StatusBadge", () => {
  it.each(Object.entries(EXPECTED_LABELS) as [WorkOrderState, string][])(
    "renders a readable label for state %s",
    (state, label) => {
      render(<StatusBadge state={state} />);

      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it("includes a non-color text marker alongside the label", () => {
    render(<StatusBadge state="cancelled" />);

    const badge = screen.getByText("Cancelled").closest(".status-badge");
    expect(badge?.querySelector(".status-badge__marker")).toHaveTextContent("✕");
  });
});
