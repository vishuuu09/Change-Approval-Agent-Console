import { useCallback, useEffect, useState } from "react";
import { ApiError, hasToken, listChanges, me, setToken } from "./api";
import { ChangeDetail } from "./components/ChangeDetail";
import { ChangeList } from "./components/ChangeList";
import { Login } from "./components/Login";
import { NewChange } from "./components/NewChange";
import type { Change, User } from "./types";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [booting, setBooting] = useState(hasToken());
  const [changes, setChanges] = useState<Change[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [listError, setListError] = useState<string | null>(null);

  const signOut = useCallback(() => {
    setToken(null);
    setUser(null);
    setSelected(null);
    setChanges([]);
  }, []);

  useEffect(() => {
    if (!hasToken()) return;
    me()
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setBooting(false));
  }, []);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setChanges(await listChanges(filter || undefined));
      setListError(null);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) signOut();
      else setListError(err instanceof ApiError ? err.message : "Couldn't load requests.");
    } finally {
      setLoading(false);
    }
  }, [filter, signOut]);

  useEffect(() => {
    if (user) void refresh();
  }, [user, refresh]);

  if (booting) return <p className="muted pad" role="status">Loading…</p>;

  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <header className="topbar">
        <h1>Change-Approval Console</h1>
        {user && (
          <div className="row">
            <span className="small">{user.username} ({user.role})</span>
            <button type="button" className="btn" onClick={signOut}>Sign out</button>
          </div>
        )}
      </header>

      {!user ? (
        <Login onSignedIn={setUser} />
      ) : (
        <div className="layout">
          <aside className="sidebar">
            {user.role === "engineer" && (
              <button type="button" className="btn btn-primary wide" onClick={() => { setCreating(true); setSelected(null); }}>
                New request
              </button>
            )}
            <ChangeList
              changes={changes}
              selectedId={selected}
              onSelect={(id) => { setSelected(id); setCreating(false); }}
              filter={filter}
              onFilter={setFilter}
              loading={loading}
              error={listError}
            />
          </aside>
          <main id="main" className="content" tabIndex={-1}>
            {creating ? (
              <NewChange
                onCancel={() => setCreating(false)}
                onCreated={(id) => { setCreating(false); setSelected(id); void refresh(); }}
              />
            ) : selected !== null ? (
              <ChangeDetail changeId={selected} user={user} onChanged={refresh} />
            ) : (
              <p className="muted">Select a request to review its plan and audit trail.</p>
            )}
          </main>
        </div>
      )}
    </>
  );
}
