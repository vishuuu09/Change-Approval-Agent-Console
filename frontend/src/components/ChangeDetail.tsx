import { useCallback, useEffect, useState } from "react";
import { ApiError, approve, execute, getAudit, getChange, reject } from "../api";
import { availableActions } from "../permissions";
import type { AuditEntry, Change, User } from "../types";
import { GateStepper } from "./GateStepper";
import { StatusBadge } from "./StatusBadge";

interface Props {
  changeId: number;
  user: User;
  onChanged: () => void;
}

export function ChangeDetail({ changeId, user, onChanged }: Props) {
  const [change, setChange] = useState<Change | null>(null);
  const [audit, setAudit] = useState<AuditEntry[]>([]);
  const [comment, setComment] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    try {
      const [c, a] = await Promise.all([getChange(changeId), getAudit(changeId)]);
      setChange(c);
      setAudit(a);
      setError(null);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't load this request.");
    }
  }, [changeId]);

  useEffect(() => {
    setChange(null);
    setComment("");
    void load();
  }, [load]);

  async function act(fn: () => Promise<unknown>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      await load();
      onChanged();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "That action failed. Try again.");
    } finally {
      setBusy(false);
    }
  }

  if (error && !change) return <p className="error" role="alert">{error}</p>;
  if (!change) return <p className="muted" role="status">Loading request…</p>;

  const actions = availableActions(user, change);

  return (
    <article aria-labelledby="detail-heading" className="panel">
      <header className="detail-head">
        <h2 id="detail-heading">{change.title}</h2>
        <StatusBadge status={change.status} />
      </header>
      <p className="muted small">Requested by {change.created_by} on {new Date(change.created_at).toLocaleString()}</p>
      <p>{change.description}</p>

      <GateStepper status={change.status} />

      {change.plan && (
        <section aria-labelledby="plan-heading">
          <h3 id="plan-heading">Agent’s plan</h3>
          <p>{change.plan.summary}</p>
          <ol className="plan">
            {change.plan.steps.map((s) => (
              <li key={s.order}>
                <span>{s.action}</span>
                <span className={`risk risk-${s.risk}`}>{s.risk} risk</span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {change.reviewed_by && (
        <p className="small">
          Reviewed by {change.reviewed_by}
          {change.review_comment ? `: ${change.review_comment}` : "."}
        </p>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      {actions.note && <p className="muted">{actions.note}</p>}

      {actions.canReview && (
        <div className="review">
          <label htmlFor="comment">Comment (optional)</label>
          <textarea id="comment" rows={2} maxLength={500} value={comment} onChange={(e) => setComment(e.target.value)} />
          <div className="row">
            <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => approve(change.id, comment))}>Approve</button>
            <button type="button" className="btn btn-danger" disabled={busy} onClick={() => act(() => reject(change.id, comment))}>Reject</button>
          </div>
        </div>
      )}

      {actions.canExecute && (
        <button type="button" className="btn btn-primary" disabled={busy} onClick={() => act(() => execute(change.id))}>
          Execute change
        </button>
      )}

      <section aria-labelledby="audit-heading">
        <h3 id="audit-heading">Audit trail</h3>
        <ul className="audit">
          {audit.map((a, i) => (
            <li key={i}>
              <span className="audit-action">{a.action.replace("_", " ")}</span>
              <span className="muted small"> by {a.actor} · {new Date(a.ts).toLocaleString()}</span>
              {a.detail && <div className="small">{a.detail}</div>}
            </li>
          ))}
        </ul>
      </section>
    </article>
  );
}
