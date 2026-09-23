import { useMemo } from "react";
import type { Asset, WorkOrder } from "@equipment-hub/contract";
import PriorityBadge from "./PriorityBadge";
import StatusBadge from "./StatusBadge";

interface WorkOrderBoardProps {
  workOrders: WorkOrder[];
  assets: Asset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

function WorkOrderBoard({ workOrders, assets, selectedId, onSelect }: WorkOrderBoardProps) {
  const assetsById = useMemo(() => new Map(assets.map((asset) => [asset.id, asset])), [assets]);

  return (
    <div className="table-wrapper">
      <table className="board-table">
        <thead>
          <tr>
            <th scope="col">Reference</th>
            <th scope="col">Asset</th>
            <th scope="col">Title</th>
            <th scope="col">Priority</th>
            <th scope="col">State</th>
            <th scope="col">Technician</th>
          </tr>
        </thead>
        <tbody>
          {workOrders.map((workOrder) => {
            const asset = assetsById.get(workOrder.assetId);
            const isSelected = workOrder.id === selectedId;

            return (
              <tr key={workOrder.id} aria-selected={isSelected}>
                <td>
                  <button
                    className="link-button"
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => onSelect(workOrder.id)}
                  >
                    {workOrder.reference}
                  </button>
                </td>
                <td>{asset ? `${asset.tag} — ${asset.name}` : "Unknown asset"}</td>
                <td>{workOrder.title}</td>
                <td>
                  <PriorityBadge priority={workOrder.priority} />
                </td>
                <td>
                  <StatusBadge state={workOrder.state} />
                </td>
                <td>{workOrder.technicianId ? "Assigned" : "Unassigned"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default WorkOrderBoard;
