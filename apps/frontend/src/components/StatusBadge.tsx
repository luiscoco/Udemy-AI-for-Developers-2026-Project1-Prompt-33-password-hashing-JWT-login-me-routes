import type { WorkOrderState } from "@equipment-hub/contract";

const STATE_LABELS: Record<WorkOrderState, string> = {
  reported: "Reported",
  triaged: "Triaged",
  scheduled: "Scheduled",
  in_progress: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const STATE_MARKERS: Record<WorkOrderState, string> = {
  reported: "○",
  triaged: "◐",
  scheduled: "▤",
  in_progress: "▶",
  completed: "✓",
  cancelled: "✕",
};

interface StatusBadgeProps {
  state: WorkOrderState;
}

function StatusBadge({ state }: StatusBadgeProps) {
  return (
    <span className={`status-badge status-badge--${state}`}>
      <span className="status-badge__marker" aria-hidden="true">
        {STATE_MARKERS[state]}
      </span>
      <span className="status-badge__label">{STATE_LABELS[state]}</span>
    </span>
  );
}

export default StatusBadge;
