import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import type { ApiError, AssignmentCommand, NewWorkOrder, Priority, TransitionCommand, WorkOrderState } from "@equipment-hub/contract";
import { ACTIONS, PRIORITIES, STATES } from "@equipment-hub/contract";
import type { Repository, WorkOrderFilters } from "../data/repository.js";
import { nextWorkOrderReference } from "../domain/reference.js";
import { canAssignTechnician, transition } from "../domain/workOrderLifecycle.js";

function errorBody(message: string, details?: Record<string, unknown>): ApiError {
  return details ? { message, details } : { message };
}

export function registerWorkOrderRoutes(app: FastifyInstance, repository: Repository): void {
  app.get("/api/work-orders", async (request, reply) => {
    const { state, priority } = request.query as { state?: string; priority?: string };

    if (state !== undefined && !STATES.includes(state as (typeof STATES)[number])) {
      return reply.status(400).send(errorBody(`Invalid state filter "${state}"`));
    }

    if (priority !== undefined && !PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) {
      return reply.status(400).send(errorBody(`Invalid priority filter "${priority}"`));
    }

    const filters: WorkOrderFilters = {};

    if (state !== undefined) {
      filters.state = state as WorkOrderState;
    }

    if (priority !== undefined) {
      filters.priority = priority as Priority;
    }

    return await repository.listWorkOrders(filters);
  });

  app.get("/api/work-orders/:id", async (request, reply) => {
    const { id } = request.params as { id: string };
    const workOrder = await repository.getWorkOrder(id);

    if (!workOrder) {
      return reply.status(404).send(errorBody(`No work order exists with id "${id}"`));
    }

    return workOrder;
  });

  app.post("/api/work-orders", async (request, reply) => {
    const body = request.body as Partial<NewWorkOrder> | undefined;

    if (!body || typeof body.assetId !== "string" || typeof body.title !== "string" || typeof body.description !== "string") {
      return reply.status(400).send(errorBody("assetId, title, and description are required"));
    }

    const priority = body.priority;

    if (!PRIORITIES.includes(priority as (typeof PRIORITIES)[number])) {
      return reply.status(400).send(errorBody(`Invalid priority "${priority}"`));
    }

    if (!(await repository.assetExists(body.assetId))) {
      return reply.status(400).send(errorBody(`No asset exists with id "${body.assetId}"`));
    }

    const now = new Date().toISOString();
    const workOrder = {
      id: randomUUID(),
      reference: nextWorkOrderReference(await repository.references(), new Date().getUTCFullYear()),
      assetId: body.assetId,
      title: body.title,
      description: body.description,
      priority: priority as Priority,
      state: "reported" as const,
      technicianId: null,
      reportedAt: now,
      updatedAt: now,
    };

    await repository.saveWorkOrder(workOrder);

    return reply.status(201).send(workOrder);
  });

  app.post("/api/work-orders/:id/assignment", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<AssignmentCommand> | undefined;

    if (!body || typeof body.technicianId !== "string") {
      return reply.status(400).send(errorBody("technicianId is required"));
    }

    const workOrder = await repository.getWorkOrder(id);

    if (!workOrder) {
      return reply.status(404).send(errorBody(`No work order exists with id "${id}"`));
    }

    if (!(await repository.technicianExists(body.technicianId))) {
      return reply.status(404).send(errorBody(`No technician exists with id "${body.technicianId}"`));
    }

    if (!canAssignTechnician(workOrder.state)) {
      return reply.status(409).send(errorBody(`Cannot assign a technician to a work order in state "${workOrder.state}"`));
    }

    const updated = {
      ...workOrder,
      technicianId: body.technicianId,
      updatedAt: new Date().toISOString(),
    };

    await repository.saveWorkOrder(updated);

    return updated;
  });

  app.post("/api/work-orders/:id/transitions", async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Partial<TransitionCommand> | undefined;

    if (!body || !ACTIONS.includes(body.action as (typeof ACTIONS)[number])) {
      return reply.status(400).send(errorBody(`Invalid action "${body?.action}"`));
    }

    const workOrder = await repository.getWorkOrder(id);

    if (!workOrder) {
      return reply.status(404).send(errorBody(`No work order exists with id "${id}"`));
    }

    const result = transition(workOrder.state, body.action as (typeof ACTIONS)[number]);

    if (!result.ok) {
      return reply.status(409).send(errorBody(result.reason));
    }

    const updated = {
      ...workOrder,
      state: result.state,
      updatedAt: new Date().toISOString(),
    };

    await repository.saveWorkOrder(updated);

    return updated;
  });
}
