import { useState, type FormEvent } from "react";
import { ApiError, createChange } from "../api";

export function NewChange({ onCreated, onCancel }: { onCreated: (id: number) => void; onCancel: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const created = await createChange(title, description);
      onCreated(created.id);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section aria-labelledby="new-heading" className="panel">
      <h2 id="new-heading">New change request</h2>
      <p className="muted">The agent will draft a plan. You can't run it until an approver approves.</p>
      <form onSubmit={submit} className="form">
        <label htmlFor="title">Title</label>
        <input id="title" value={title} onChange={(e) => setTitle(e.target.value)} minLength={3} maxLength={120} required />
        <label htmlFor="description">What needs to change?</label>
        <textarea id="description" rows={5} value={description} onChange={(e) => setDescription(e.target.value)} minLength={10} maxLength={2000} required />
        {error && <p className="error" role="alert">{error}</p>}
        <div className="row">
          <button type="submit" className="btn btn-primary" disabled={busy}>{busy ? "Drafting plan…" : "Draft plan"}</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </section>
  );
}
