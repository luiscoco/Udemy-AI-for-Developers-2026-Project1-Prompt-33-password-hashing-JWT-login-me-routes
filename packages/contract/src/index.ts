import type { components } from "./types.gen.js";

export type WorkOrderState = components["schemas"]["WorkOrderState"];
export type WorkOrderAction = components["schemas"]["WorkOrderAction"];
export type Priority = components["schemas"]["Priority"];
export type Role = components["schemas"]["Role"];

export const STATES = [
  "reported",
  "triaged",
  "scheduled",
  "in_progress",
  "completed",
  "cancelled",
] as const satisfies readonly WorkOrderState[];

export const ACTIONS = [
  "triage",
  "schedule",
  "start",
  "complete",
  "cancel",
] as const satisfies readonly WorkOrderAction[];

export const PRIORITIES = [
  "low",
  "medium",
  "high",
  "critical",
] as const satisfies readonly Priority[];

export const ROLES = ["technician", "supervisor", "admin"] as const satisfies readonly Role[];

// Compile-time check: each runtime array's element type must be mutually
// assignable with its generated union type, so the array stays in sync
// with the OpenAPI enum (neither missing nor extra members).
type AssertSame<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
type _StatesCheck = AssertSame<(typeof STATES)[number], WorkOrderState>;
type _ActionsCheck = AssertSame<(typeof ACTIONS)[number], WorkOrderAction>;
type _PrioritiesCheck = AssertSame<(typeof PRIORITIES)[number], Priority>;
type _RolesCheck = AssertSame<(typeof ROLES)[number], Role>;
const _statesCheck: _StatesCheck = true;
const _actionsCheck: _ActionsCheck = true;
const _prioritiesCheck: _PrioritiesCheck = true;
const _rolesCheck: _RolesCheck = true;
void _statesCheck;
void _actionsCheck;
void _prioritiesCheck;
void _rolesCheck;

export type Asset = components["schemas"]["Asset"];
export type Technician = components["schemas"]["Technician"];
export type WorkOrder = components["schemas"]["WorkOrder"];
export type NewWorkOrder = components["schemas"]["NewWorkOrder"];
export type TransitionCommand = components["schemas"]["TransitionCommand"];
export type AssignmentCommand = components["schemas"]["AssignmentCommand"];
export type DashboardSummary = components["schemas"]["DashboardSummary"];
export type User = components["schemas"]["User"];
export type LoginRequest = components["schemas"]["LoginRequest"];
export type LoginResponse = components["schemas"]["LoginResponse"];
export type ApiError = components["schemas"]["ApiError"];
