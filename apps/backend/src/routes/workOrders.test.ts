import { beforeEach, describe, expect, it } from "vitest";
import type { Asset, Technician, WorkOrder } from "@equipment-hub/contract";
import { createApp } from "../app.js";
import type { Repository, WorkOrderFilters } from "../data/repository.js";

const ASSETS: Asset[] = [
  { id: "asset-1", tag: "HVAC-01", name: "Rooftop Air Handler Unit 1", location: "Building A - Roof" },
  { id: "asset-2", tag: "PUMP-04", name: "Chilled Water Circulation Pump 4", location: "Plant Room B - Level 1" },
];

const TECHNICIANS: Technician[] = [
  { id: "tech-1", name: "Elena Vasquez", specialty: "Electrical" },
  { id: "tech-2", name: "Marcus Chen", specialty: "Mechanical" },
];

const WORK_ORDERS: WorkOrder[] = [
  {
    id: "wo-1",
    reference: "WO-2026-1001",
    assetId: "asset-1",
    title: "No cooling output from rooftop AHU-1",
    description: "Supply air is no longer cold.",
    priority: "critical",
    state: "reported",
    technicianId: null,
    reportedAt: "2026-09-20T08:15:00Z",
    updatedAt: "2026-09-20T08:15:00Z",
  },
  {
    id: "wo-2",
    reference: "WO-2026-1002",
    assetId: "asset-2",
    title: "UPS-03 battery self-test warning",
    description: "Recurring battery self-test failure warning.",
    priority: "medium",
    state: "reported",
    technicianId: null,
    reportedAt: "2026-09-19T14:02:00Z",
    updatedAt: "2026-09-19T14:02:00Z",
  },
  {
    id: "wo-3",
    reference: "WO-2026-1003",
    assetId: "asset-1",
    title: "Spindle vibration exceeds tolerance",
    description: "Vibration readings above threshold.",
    priority: "high",
    state: "triaged",
    technicianId: "tech-2",
    reportedAt: "2026-09-10T09:00:00Z",
    updatedAt: "2026-09-11T13:45:00Z",
  },
  {
    id: "wo-4",
    reference: "WO-2026-1004",
    assetId: "asset-2",
    title: "Pump-04 seal leak reported by operator",
    description: "A slow drip at the mechanical seal housing.",
    priority: "medium",
    state: "scheduled",
    technicianId: "tech-1",
    reportedAt: "2026-08-20T09:15:00Z",
    updatedAt: "2026-08-25T14:00:00Z",
  },
  {
    id: "wo-5",
    reference: "WO-2026-1005",
    assetId: "asset-1",
    title: "Replaced air filters on AHU-1",
    description: "Routine filter replacement completed.",
    priority: "low",
    state: "completed",
    technicianId: "tech-2",
    reportedAt: "2026-07-10T08:00:00Z",
    updatedAt: "2026-07-12T16:30:00Z",
  },
];

function createFixtureRepository(): Repository {
  const assets = ASSETS.map((asset) => ({ ...asset }));
  const technicians = TECHNICIANS.map((technician) => ({ ...technician }));
  const workOrders = WORK_ORDERS.map((workOrder) => ({ ...workOrder }));

  return {
    listAssets() {
      return assets.map((asset) => ({ ...asset }));
    },

    listTechnicians() {
      return technicians.map((technician) => ({ ...technician }));
    },

    listWorkOrders(filters?: WorkOrderFilters) {
      return workOrders
        .filter((workOrder) => !filters?.state || workOrder.state === filters.state)
        .filter((workOrder) => !filters?.priority || workOrder.priority === filters.priority)
        .map((workOrder) => ({ ...workOrder }));
    },

    getWorkOrder(id: string) {
      const found = workOrders.find((workOrder) => workOrder.id === id);
      return found ? { ...found } : undefined;
    },

    saveWorkOrder(updated: WorkOrder) {
      const index = workOrders.findIndex((workOrder) => workOrder.id === updated.id);

      if (index === -1) {
        workOrders.push({ ...updated });
        return;
      }

      workOrders[index] = { ...updated };
    },

    assetExists(id: string) {
      return assets.some((asset) => asset.id === id);
    },

    technicianExists(id: string) {
      return technicians.some((technician) => technician.id === id);
    },

    references() {
      return workOrders.map((workOrder) => workOrder.reference);
    },

    findUserByEmail() {
      return undefined;
    },

    findUserById() {
      return undefined;
    },
  };
}

describe("work order routes", () => {
  let repository: Repository;
  let app: ReturnType<typeof createApp>;

  beforeEach(() => {
    repository = createFixtureRepository();
    app = createApp(repository);
  });

  describe("GET /api/work-orders", () => {
    it("returns all fixture rows", async () => {
      const response = await app.inject({ method: "GET", url: "/api/work-orders" });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toHaveLength(WORK_ORDERS.length);
      expect(response.json().map((workOrder: WorkOrder) => workOrder.id).sort()).toEqual(
        WORK_ORDERS.map((workOrder) => workOrder.id).sort(),
      );
    });

    it("filters by state independently", async () => {
      const response = await app.inject({ method: "GET", url: "/api/work-orders?state=reported" });

      expect(response.statusCode).toBe(200);
      const body = response.json() as WorkOrder[];
      expect(body).toHaveLength(2);
      expect(body.every((workOrder) => workOrder.state === "reported")).toBe(true);
    });

    it("filters by priority independently", async () => {
      const response = await app.inject({ method: "GET", url: "/api/work-orders?priority=medium" });

      expect(response.statusCode).toBe(200);
      const body = response.json() as WorkOrder[];
      expect(body).toHaveLength(2);
      expect(body.every((workOrder) => workOrder.priority === "medium")).toBe(true);
    });

    it("combines state and priority filters", async () => {
      const response = await app.inject({
        method: "GET",
        url: "/api/work-orders?state=reported&priority=medium",
      });

      expect(response.statusCode).toBe(200);
      const body = response.json() as WorkOrder[];
      expect(body).toHaveLength(1);
      expect(body[0]?.id).toBe("wo-2");
    });

    it("returns 400 for an invalid state filter", async () => {
      const response = await app.inject({ method: "GET", url: "/api/work-orders?state=bogus" });

      expect(response.statusCode).toBe(400);
    });

    it("returns 400 for an invalid priority filter", async () => {
      const response = await app.inject({ method: "GET", url: "/api/work-orders?priority=bogus" });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("GET /api/work-orders/:id", () => {
    it("returns 404 for an unknown work order id", async () => {
      const response = await app.inject({ method: "GET", url: "/api/work-orders/missing" });

      expect(response.statusCode).toBe(404);
    });
  });

  describe("POST /api/work-orders", () => {
    it("returns 400 when the asset is unknown", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/work-orders",
        payload: {
          assetId: "missing-asset",
          title: "New issue",
          description: "Something broke",
          priority: "low",
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe("POST /api/work-orders/:id/transitions", () => {
    it("returns 200 and the new state for a legal transition", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/work-orders/wo-1/transitions",
        payload: { action: "triage" },
      });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toMatchObject({ id: "wo-1", state: "triaged" });
    });

    it("returns 409 for an illegal transition", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/work-orders/wo-1/transitions",
        payload: { action: "complete" },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("POST /api/work-orders/:id/assignment", () => {
    it("returns 404 when assigning an unknown technician", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/work-orders/wo-1/assignment",
        payload: { technicianId: "missing-tech" },
      });

      expect(response.statusCode).toBe(404);
    });

    it("returns 409 when assigning a technician to a completed work order", async () => {
      const response = await app.inject({
        method: "POST",
        url: "/api/work-orders/wo-5/assignment",
        payload: { technicianId: "tech-1" },
      });

      expect(response.statusCode).toBe(409);
    });
  });

  describe("GET /api/dashboard/summary", () => {
    it("reflects correct totals after a mutation", async () => {
      const before = await app.inject({ method: "GET", url: "/api/dashboard/summary" });
      expect(before.statusCode).toBe(200);
      expect(before.json()).toMatchObject({ totalOpen: 4, criticalOpen: 1, unassigned: 2 });

      const assignResponse = await app.inject({
        method: "POST",
        url: "/api/work-orders/wo-1/assignment",
        payload: { technicianId: "tech-1" },
      });
      expect(assignResponse.statusCode).toBe(200);

      const after = await app.inject({ method: "GET", url: "/api/dashboard/summary" });
      expect(after.statusCode).toBe(200);
      expect(after.json()).toMatchObject({ totalOpen: 4, criticalOpen: 1, unassigned: 1 });
    });
  });
});
