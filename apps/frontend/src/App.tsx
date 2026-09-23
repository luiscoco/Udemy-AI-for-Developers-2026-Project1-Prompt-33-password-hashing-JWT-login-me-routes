import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import type {
  Asset,
  DashboardSummary,
  NewWorkOrder,
  Priority,
  Technician,
  WorkOrder,
  WorkOrderAction,
  WorkOrderState,
} from "@equipment-hub/contract";
import { PRIORITIES, STATES } from "@equipment-hub/contract";
import {
  assignTechnician,
  ClientApiError,
  createWorkOrder,
  getDashboardSummary,
  listAssets,
  listTechnicians,
  listWorkOrders,
  transitionWorkOrder,
} from "./api/client";
import WorkOrderBoard from "./components/WorkOrderBoard";
import WorkOrderPanel from "./components/WorkOrderPanel";

function describeError(err: unknown, fallback: string): string {
  if (err instanceof ClientApiError) {
    return err.details && Object.keys(err.details).length > 0
      ? `${err.message} (${JSON.stringify(err.details)})`
      : err.message;
  }
  return err instanceof Error ? err.message : fallback;
}

function App() {
  const [workOrders, setWorkOrders] = useState<WorkOrder[]>([]);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [stateFilter, setStateFilter] = useState<WorkOrderState | "all">("all");
  const [priorityFilter, setPriorityFilter] = useState<Priority | "all">("all");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadAll() {
      setLoading(true);
      setError(null);
      try {
        const [workOrdersResult, assetsResult, techniciansResult, summaryResult] = await Promise.all([
          listWorkOrders(),
          listAssets(),
          listTechnicians(),
          getDashboardSummary(),
        ]);

        if (cancelled) {
          return;
        }

        setWorkOrders(workOrdersResult);
        setAssets(assetsResult);
        setTechnicians(techniciansResult);
        setSummary(summaryResult);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load data");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadAll();

    return () => {
      cancelled = true;
    };
  }, []);

  const selectedWorkOrder = useMemo(
    () => workOrders.find((workOrder) => workOrder.id === selectedId) ?? null,
    [workOrders, selectedId],
  );

  const filteredWorkOrders = useMemo(
    () =>
      workOrders.filter((workOrder) => {
        if (stateFilter !== "all" && workOrder.state !== stateFilter) {
          return false;
        }
        if (priorityFilter !== "all" && workOrder.priority !== priorityFilter) {
          return false;
        }
        return true;
      }),
    [workOrders, stateFilter, priorityFilter],
  );

  async function refreshSummary() {
    const nextSummary = await getDashboardSummary();
    setSummary(nextSummary);
  }

  function applyWorkOrderUpdate(updated: WorkOrder) {
    setWorkOrders((prev) => prev.map((workOrder) => (workOrder.id === updated.id ? updated : workOrder)));
  }

  async function applyAction(action: WorkOrderAction) {
    if (!selectedWorkOrder) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await transitionWorkOrder(selectedWorkOrder.id, action);
      applyWorkOrderUpdate(updated);
      await refreshSummary();
    } catch (err) {
      setError(describeError(err, "Failed to update work order"));
    } finally {
      setBusy(false);
    }
  }

  async function assignSelectedTechnician(technicianId: string) {
    if (!selectedWorkOrder) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const updated = await assignTechnician(selectedWorkOrder.id, technicianId);
      applyWorkOrderUpdate(updated);
      await refreshSummary();
    } catch (err) {
      setError(describeError(err, "Failed to assign technician"));
    } finally {
      setBusy(false);
    }
  }

  async function reportWorkOrder(input: NewWorkOrder) {
    setBusy(true);
    setError(null);
    try {
      const created = await createWorkOrder(input);
      setWorkOrders((prev) => [created, ...prev]);
      setSelectedId(created.id);
      await refreshSummary();
    } catch (err) {
      setError(describeError(err, "Failed to report work order"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="app-shell">
        <h1>Equipment Maintenance Hub</h1>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <h1>Equipment Maintenance Hub</h1>
      {error && (
        <div className="alert" role="alert">
          {error}
        </div>
      )}

      {summary && (
        <dl className="stat-grid" aria-label="Dashboard summary">
          <div className="stat-card">
            <dt>Open</dt>
            <dd>{summary.totalOpen}</dd>
          </div>
          <div className="stat-card stat-card--critical">
            <dt>Critical open</dt>
            <dd>{summary.criticalOpen}</dd>
          </div>
          <div className="stat-card">
            <dt>Unassigned</dt>
            <dd>{summary.unassigned}</dd>
          </div>
        </dl>
      )}

      <section className="panel filters" aria-label="Filters">
        <div className="form-field">
          <label htmlFor="state-filter">State</label>
          <select
            id="state-filter"
            value={stateFilter}
            onChange={(event) => setStateFilter(event.target.value as WorkOrderState | "all")}
          >
            <option value="all">All</option>
            {STATES.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>

        <div className="form-field">
          <label htmlFor="priority-filter">Priority</label>
          <select
            id="priority-filter"
            value={priorityFilter}
            onChange={(event) => setPriorityFilter(event.target.value as Priority | "all")}
          >
            <option value="all">All</option>
            {PRIORITIES.map((priority) => (
              <option key={priority} value={priority}>
                {priority}
              </option>
            ))}
          </select>
        </div>
      </section>

      <section className="panel">
        <ReportWorkOrderForm assets={assets} busy={busy} onSubmit={reportWorkOrder} />
      </section>

      <section className="panel">
        <WorkOrderBoard
          workOrders={filteredWorkOrders}
          assets={assets}
          selectedId={selectedId}
          onSelect={setSelectedId}
        />
      </section>

      <section className="panel">
        <WorkOrderPanel
          workOrder={selectedWorkOrder}
          assets={assets}
          technicians={technicians}
          busy={busy}
          onAssign={(_workOrderId, technicianId) => {
            void assignSelectedTechnician(technicianId);
          }}
          onAction={(_workOrderId, action) => {
            void applyAction(action);
          }}
        />
      </section>
    </div>
  );
}

interface ReportWorkOrderFormProps {
  assets: Asset[];
  busy: boolean;
  onSubmit: (input: NewWorkOrder) => void;
}

function ReportWorkOrderForm({ assets, busy, onSubmit }: ReportWorkOrderFormProps) {
  const [assetId, setAssetId] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState<Priority>("medium");
  const [formError, setFormError] = useState<string | null>(null);

  function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const missing: string[] = [];
    if (!assetId) missing.push("Asset");
    if (!title) missing.push("Title");
    if (!description) missing.push("Description");

    if (missing.length > 0) {
      setFormError(`Please fill in: ${missing.join(", ")}.`);
      return;
    }

    setFormError(null);
    onSubmit({ assetId, title, description, priority });
    setAssetId("");
    setTitle("");
    setDescription("");
    setPriority("medium");
  }

  return (
    <form className="report-form" onSubmit={handleSubmit} aria-label="Report work order">
      {formError && (
        <div className="alert" role="alert">
          {formError}
        </div>
      )}

      <div className="form-field">
        <label htmlFor="new-work-order-asset">Asset</label>
        <select
          id="new-work-order-asset"
          value={assetId}
          onChange={(event) => setAssetId(event.target.value)}
          disabled={busy}
          required
        >
          <option value="">Select an asset</option>
          {assets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.tag} — {asset.name}
            </option>
          ))}
        </select>
      </div>

      <div className="form-field">
        <label htmlFor="new-work-order-title">Title</label>
        <input
          id="new-work-order-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          disabled={busy}
          required
        />
      </div>

      <div className="form-field form-field--wide">
        <label htmlFor="new-work-order-description">Description</label>
        <textarea
          id="new-work-order-description"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={busy}
          required
        />
      </div>

      <div className="form-field">
        <label htmlFor="new-work-order-priority">Priority</label>
        <select
          id="new-work-order-priority"
          value={priority}
          onChange={(event) => setPriority(event.target.value as Priority)}
          disabled={busy}
        >
          {PRIORITIES.map((candidate) => (
            <option key={candidate} value={candidate}>
              {candidate}
            </option>
          ))}
        </select>
      </div>

      <div className="form-actions">
        <button className="btn btn--primary" type="submit" disabled={busy}>
          Report work order
        </button>
      </div>
    </form>
  );
}

export default App;
