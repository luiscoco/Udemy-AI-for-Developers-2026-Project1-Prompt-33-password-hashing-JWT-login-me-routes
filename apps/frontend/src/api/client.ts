import type {
  Asset,
  AssignmentCommand,
  DashboardSummary,
  NewWorkOrder,
  Priority,
  Technician,
  TransitionCommand,
  WorkOrder,
  WorkOrderAction,
  WorkOrderState,
} from "@equipment-hub/contract";

export class ClientApiError extends Error {
  readonly status: number;
  readonly details?: Record<string, unknown>;

  constructor(status: number, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "ClientApiError";
    this.status = status;
    this.details = details;
  }
}

async function requestJson<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
  });

  if (!response.ok) {
    let message = response.statusText || "Request failed";
    let details: Record<string, unknown> | undefined;

    try {
      const body = (await response.json()) as { message?: string; details?: Record<string, unknown> };
      if (body?.message) {
        message = body.message;
      }
      details = body?.details;
    } catch {
      // Response body was not valid JSON; fall back to the status text.
    }

    throw new ClientApiError(response.status, message, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export function listAssets(): Promise<Asset[]> {
  return requestJson<Asset[]>("/api/assets");
}

export function listTechnicians(): Promise<Technician[]> {
  return requestJson<Technician[]>("/api/technicians");
}

export interface WorkOrderFilters {
  state?: WorkOrderState;
  priority?: Priority;
}

export function listWorkOrders(filters?: WorkOrderFilters): Promise<WorkOrder[]> {
  const params = new URLSearchParams();
  if (filters?.state) {
    params.set("state", filters.state);
  }
  if (filters?.priority) {
    params.set("priority", filters.priority);
  }
  const query = params.toString();
  return requestJson<WorkOrder[]>(`/api/work-orders${query ? `?${query}` : ""}`);
}

export function getWorkOrder(id: string): Promise<WorkOrder> {
  return requestJson<WorkOrder>(`/api/work-orders/${encodeURIComponent(id)}`);
}

export function createWorkOrder(input: NewWorkOrder): Promise<WorkOrder> {
  return requestJson<WorkOrder>("/api/work-orders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function assignTechnician(id: string, technicianId: string): Promise<WorkOrder> {
  const command: AssignmentCommand = { technicianId };
  return requestJson<WorkOrder>(`/api/work-orders/${encodeURIComponent(id)}/assignment`, {
    method: "POST",
    body: JSON.stringify(command),
  });
}

export function transitionWorkOrder(id: string, action: WorkOrderAction): Promise<WorkOrder> {
  const command: TransitionCommand = { action };
  return requestJson<WorkOrder>(`/api/work-orders/${encodeURIComponent(id)}/transitions`, {
    method: "POST",
    body: JSON.stringify(command),
  });
}

export function getDashboardSummary(): Promise<DashboardSummary> {
  return requestJson<DashboardSummary>("/api/dashboard/summary");
}
