import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Asset, WorkOrder } from "@equipment-hub/contract";
import WorkOrderBoard from "./WorkOrderBoard";

const assets: Asset[] = [
  { id: "asset-1", tag: "PUMP-01", name: "Feed Pump", location: "Building A" },
  { id: "asset-2", tag: "HVAC-02", name: "Rooftop Unit", location: "Building B" },
];

const workOrders: WorkOrder[] = [
  {
    id: "wo-1",
    reference: "WO-2026-0001",
    assetId: "asset-1",
    title: "Pump leaking",
    description: "Visible leak near seal",
    priority: "high",
    state: "reported",
    technicianId: null,
    reportedAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
  },
  {
    id: "wo-2",
    reference: "WO-2026-0002",
    assetId: "asset-2",
    title: "Unit noisy",
    description: "Loud rattling on startup",
    priority: "medium",
    state: "scheduled",
    technicianId: "tech-1",
    reportedAt: "2026-01-02T00:00:00.000Z",
    updatedAt: "2026-01-02T00:00:00.000Z",
  },
];

describe("WorkOrderBoard", () => {
  it("renders a row per work order with resolved asset details, priority, state, and technician assignment", () => {
    render(<WorkOrderBoard workOrders={workOrders} assets={assets} selectedId={null} onSelect={vi.fn()} />);

    const firstRow = screen.getByRole("button", { name: "WO-2026-0001" }).closest("tr");
    expect(firstRow).not.toBeNull();
    expect(firstRow).toHaveTextContent("PUMP-01");
    expect(firstRow).toHaveTextContent("Feed Pump");
    expect(firstRow).toHaveTextContent("Pump leaking");
    expect(firstRow).toHaveTextContent("High");
    expect(firstRow).toHaveTextContent("Reported");
    expect(firstRow).toHaveTextContent("Unassigned");

    const secondRow = screen.getByRole("button", { name: "WO-2026-0002" }).closest("tr");
    expect(secondRow).toHaveTextContent("HVAC-02");
    expect(secondRow).toHaveTextContent("Rooftop Unit");
    expect(secondRow).toHaveTextContent("Assigned");
  });

  it("marks the selected row and calls onSelect with the work order id when its reference is clicked", async () => {
    const user = userEvent.setup();
    const onSelect = vi.fn();

    render(<WorkOrderBoard workOrders={workOrders} assets={assets} selectedId="wo-2" onSelect={onSelect} />);

    const selectedRow = screen.getByRole("button", { name: "WO-2026-0002" }).closest("tr");
    expect(selectedRow).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: "WO-2026-0001" }));

    expect(onSelect).toHaveBeenCalledWith("wo-1");
  });
});
