import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { Priority } from "@equipment-hub/contract";
import PriorityBadge from "./PriorityBadge";

const EXPECTED_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

describe("PriorityBadge", () => {
  it.each(Object.entries(EXPECTED_LABELS) as [Priority, string][])(
    "renders a readable label for priority %s",
    (priority, label) => {
      render(<PriorityBadge priority={priority} />);

      expect(screen.getByText(label)).toBeInTheDocument();
    },
  );

  it("includes a non-color text marker alongside the label", () => {
    render(<PriorityBadge priority="critical" />);

    const badge = screen.getByText("Critical").closest(".priority-badge");
    expect(badge?.querySelector(".priority-badge__marker")).toHaveTextContent("‼");
  });
});
