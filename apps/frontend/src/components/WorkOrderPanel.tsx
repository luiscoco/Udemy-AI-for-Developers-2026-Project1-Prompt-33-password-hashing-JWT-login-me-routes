import { useState } from "react";
import type { Asset, Technician, WorkOrder, WorkOrderAction, WorkOrderState } from "@equipment-hub/contract";
import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";

const FINAL_STATES: readonly WorkOrderState[] = ["completed", "cancelled"];

const ACTION_LABELS: Record<WorkOrderAction, string> = {
  triage: "Triage",
  schedule: "Schedule",
  start: "Start",
  complete: "Complete",
  cancel: "Cancel",
};

// This mirrors apps/backend/src/domain/workOrderLifecycle.ts's TRANSITIONS table so the
// panel can render the right buttons without a round trip. It is duplicated here only for
// this training exercise — in a real app the frontend should ask the backend which actions
// are allowed (e.g. via the work order payload) instead of hardcoding a second copy of the
// lifecycle rules, since the two copies can silently drift apart.
function actionsForState(state: WorkOrderState): WorkOrderAction[] {
  switch (state) {
    case "reported":
      return ["triage"];
    case "triaged":
      return ["schedule", "cancel"];
    case "scheduled":
      return ["start", "cancel"];
    case "in_progress":
      return ["complete"];
    case "completed":
    case "cancelled":
      return [];
    default:
      return [];
  }
}

interface WorkOrderPanelProps {
  workOrder: WorkOrder | null;
  assets: Asset[];
  technicians: Technician[];
  busy: boolean;
  onAssign: (workOrderId: string, technicianId: string) => void;
  onAction: (workOrderId: string, action: WorkOrderAction) => void;
}

function WorkOrderPanel({ workOrder, assets, technicians, busy, onAssign, onAction }: WorkOrderPanelProps) {
  const [selectedTechnicianId, setSelectedTechnicianId] = useState("");

  if (!workOrder) {
    return <div className="work-order-panel work-order-panel--empty">Select a work order</div>;
  }

  const asset = assets.find((candidate) => candidate.id === workOrder.assetId);
  const technician = technicians.find((candidate) => candidate.id === workOrder.technicianId);
  const isFinal = FINAL_STATES.includes(workOrder.state);
  const actions = actionsForState(workOrder.state);

  function handleAssign() {
    if (!workOrder || !selectedTechnicianId) {
      return;
    }
    onAssign(workOrder.id, selectedTechnicianId);
  }

  return (
    <div className="work-order-panel">
      <h2>{workOrder.reference}</h2>
      <dl className="detail-list">
        <dt>Asset</dt>
        <dd>{asset ? `${asset.tag} — ${asset.name}` : "Unknown asset"}</dd>
        <dt>Location</dt>
        <dd>{asset ? asset.location : "Unknown location"}</dd>
        <dt>Title</dt>
        <dd>{workOrder.title}</dd>
        <dt>Description</dt>
        <dd>{workOrder.description}</dd>
        <dt>Priority</dt>
        <dd>
          <PriorityBadge priority={workOrder.priority} />
        </dd>
        <dt>State</dt>
        <dd>
          <StatusBadge state={workOrder.state} />
        </dd>
        <dt>Technician</dt>
        <dd>{technician ? technician.name : "Unassigned"}</dd>
        <dt>Reported at</dt>
        <dd>{workOrder.reportedAt}</dd>
        <dt>Updated at</dt>
        <dd>{workOrder.updatedAt}</dd>
      </dl>

      {isFinal ? (
        <p className="panel-note">This work order is {workOrder.state} and can no longer be changed.</p>
      ) : (
        <>
          <div className="form-field form-field--inline">
            <label htmlFor="work-order-technician">Technician</label>
            <select
              id="work-order-technician"
              value={selectedTechnicianId}
              onChange={(event) => setSelectedTechnicianId(event.target.value)}
              disabled={busy}
            >
              <option value="">Select a technician</option>
              {technicians.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.name}
                </option>
              ))}
            </select>
            <button className="btn" type="button" onClick={handleAssign} disabled={busy || !selectedTechnicianId}>
              Assign
            </button>
          </div>

          <div className="button-group">
            {actions.map((action) => (
              <button
                className="btn btn--primary"
                key={action}
                type="button"
                onClick={() => onAction(workOrder.id, action)}
                disabled={busy}
              >
                {ACTION_LABELS[action]}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default WorkOrderPanel;
