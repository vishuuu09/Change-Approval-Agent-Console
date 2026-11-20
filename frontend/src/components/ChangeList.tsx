import type { Change } from "../types";
import { StatusBadge } from "./StatusBadge";

interface Props {
  changes: Change[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  filter: string;
  onFilter: (value: string) => void;
  loading: boolean;
  error: string | null;
}

export function ChangeList({ changes, selectedId, onSelect, filter, onFilter, loading, error }: Props) {
  return (
    <section aria-labelledby="list-heading">
      <div className="list-head">
        <h2 id="list-heading">Requests</h2>
        <div>
          <label htmlFor="filter" className="visually-hidden">Filter by status</label>
          <select id="filter" value={filter} onChange={(e) => onFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending_approval">Awaiting approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
            <option value="executed">Executed</option>
            <option value="planning_failed">Planning failed</option>
          </select>
        </div>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      {loading && <p className="muted" role="status">Loading requests…</p>}
      {!loading && !error && changes.length === 0 && (
        <p className="muted">No requests here yet. Engineers can create one with “New request”.</p>
      )}
      <ul className="list">
        {changes.map((c) => (
          <li key={c.id}>
            <button type="button" className="list-item" aria-current={c.id === selectedId ? "true" : undefined} onClick={() => onSelect(c.id)}>
              <span className="list-title">{c.title}</span>
              <span className="list-meta">
                <StatusBadge status={c.status} />
                <span className="muted small">by {c.created_by}</span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
