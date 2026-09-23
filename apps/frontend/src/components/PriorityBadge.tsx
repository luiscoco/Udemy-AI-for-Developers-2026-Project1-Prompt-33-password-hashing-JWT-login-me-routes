import type { Priority } from "@equipment-hub/contract";

const PRIORITY_LABELS: Record<Priority, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

const PRIORITY_MARKERS: Record<Priority, string> = {
  low: "▽",
  medium: "▬",
  high: "▲",
  critical: "‼",
};

interface PriorityBadgeProps {
  priority: Priority;
}

function PriorityBadge({ priority }: PriorityBadgeProps) {
  return (
    <span className={`priority-badge priority-badge--${priority}`}>
      <span className="priority-badge__marker" aria-hidden="true">
        {PRIORITY_MARKERS[priority]}
      </span>
      <span className="priority-badge__label">{PRIORITY_LABELS[priority]}</span>
    </span>
  );
}

export default PriorityBadge;
