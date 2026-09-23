import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Asset, DashboardSummary, Technician, WorkOrder } from "@equipment-hub/contract";
import App from "./App";
import * as apiClient from "./api/client";

vi.mock("./api/client", async () => {
  const actual = await vi.importActual<typeof import("./api/client")>("./api/client");
  return {
    ...actual,
    listWorkOrders: vi.fn(),
    listAssets: vi.fn(),
    listTechnicians: vi.fn(),
    getDashboardSummary: vi.fn(),
    assignTechnician: vi.fn(),
    transitionWorkOrder: vi.fn(),
    createWorkOrder: vi.fn(),
  };
});

const assets: Asset[] = [{ id: "asset-1", tag: "PUMP-01", name: "Feed Pump", location: "Building A" }];

const technicians: Technician[] = [{ id: "tech-1", name: "Jamie Rivera", specialty: "Mechanical" }];

const baseWorkOrder: WorkOrder = {
  id: "wo-1",
  reference: "WO-2026-0001",
  assetId: "asset-1",
  title: "Pump leaking",
  description: "Visible leak near seal",
  priority: "high",
  state: "triaged",
  technicianId: null,
  reportedAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

const summary: DashboardSummary = {
  totalOpen: 1,
  criticalOpen: 0,
  unassigned: 1,
  byState: { triaged: 1 },
};

describe("App integration", () => {
  it("selects a triaged work order, assigns a technician, schedules it, and refreshes the dashboard summary", async () => {
    const user = userEvent.setup();

    const listWorkOrdersMock = vi.mocked(apiClient.listWorkOrders);
    const listAssetsMock = vi.mocked(apiClient.listAssets);
    const listTechniciansMock = vi.mocked(apiClient.listTechnicians);
    const getDashboardSummaryMock = vi.mocked(apiClient.getDashboardSummary);
    const assignTechnicianMock = vi.mocked(apiClient.assignTechnician);
    const transitionWorkOrderMock = vi.mocked(apiClient.transitionWorkOrder);

    listWorkOrdersMock.mockResolvedValue([baseWorkOrder]);
    listAssetsMock.mockResolvedValue(assets);
    listTechniciansMock.mockResolvedValue(technicians);
    getDashboardSummaryMock.mockResolvedValue(summary);

    const assignedWorkOrder: WorkOrder = { ...baseWorkOrder, technicianId: "tech-1" };
    assignTechnicianMock.mockResolvedValue(assignedWorkOrder);

    const scheduledWorkOrder: WorkOrder = { ...assignedWorkOrder, state: "scheduled" };
    transitionWorkOrderMock.mockResolvedValue(scheduledWorkOrder);

    render(<App />);

    // 1. Loads the mocked dashboard and work-order board.
    expect(await screen.findByRole("button", { name: "WO-2026-0001" })).toBeInTheDocument();
    expect(await screen.findByLabelText("Dashboard summary")).toBeInTheDocument();
    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(1);

    // 2. Selects the triaged work order.
    await user.click(screen.getByRole("button", { name: "WO-2026-0001" }));
    expect(screen.getByRole("heading", { name: "WO-2026-0001" })).toBeInTheDocument();

    // 3. Assigns a technician.
    await user.selectOptions(screen.getByLabelText("Technician"), "tech-1");
    await user.click(screen.getByRole("button", { name: "Assign" }));

    expect(assignTechnicianMock).toHaveBeenCalledWith("wo-1", "tech-1");
    await screen.findAllByText("Jamie Rivera");
    const technicianTerm = screen.getByText("Technician", { selector: "dt" });
    expect(technicianTerm.nextElementSibling).toHaveTextContent("Jamie Rivera");
    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(2);

    // 4. Schedules the work order.
    await user.click(screen.getByRole("button", { name: "Schedule" }));
    expect(transitionWorkOrderMock).toHaveBeenCalledWith("wo-1", "schedule");

    // 5. Verifies the board and panel show scheduled.
    const boardRow = (await screen.findByRole("button", { name: "WO-2026-0001" })).closest("tr");
    expect(boardRow).not.toBeNull();
    expect(within(boardRow as HTMLElement).getByText("Scheduled")).toBeInTheDocument();

    const panel = screen.getByRole("heading", { name: "WO-2026-0001" }).closest("div") as HTMLElement;
    expect(within(panel).getByText("Scheduled")).toBeInTheDocument();

    // 6. Verifies the dashboard summary refresh function was called after each mutation.
    expect(getDashboardSummaryMock).toHaveBeenCalledTimes(3);
  });
});
