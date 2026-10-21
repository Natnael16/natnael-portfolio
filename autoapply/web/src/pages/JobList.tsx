import { useEffect, useState } from "react";
import { api, type Application } from "../api";

export function JobList({
  title,
  query,
  empty,
  intro,
}: {
  title: string;
  query?: "submitted" | "failed";
  empty: string;
  intro?: string;
}) {
  const [items, setItems] = useState<Application[]>([]);
  const [busy, setBusy] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api
      .history(query)
      .then((r) => setItems(r.items))
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"));
  }

  useEffect(() => {
    refresh();
  }, [query]);

  return (
    <div>
      <h1>{title}</h1>
      {intro && <p className="muted small">{intro}</p>}
      {error && <p className="error">{error}</p>}
      {items.length === 0 && <p className="muted">{empty}</p>}
      {items.map((item) => (
        <article className="card" key={item.id}>
          <a href={`#/inbox/${item.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            <div className="row">
              <strong>
                {item.job.companyName} — {item.job.title}
              </strong>
              <span className={`badge ${item.status === "submitted" ? "ok" : item.status === "failed" ? "danger" : ""}`}>
                {item.status}
              </span>
            </div>
            <p className="muted small">{item.submittedAt || item.updatedAt}</p>
            {item.match?.summary && <p>{item.match.summary}</p>}
          </a>
          {item.error && <p className="error">{item.error}</p>}
          {item.status === "queued_submit" && (
            <p className="muted small">Waiting in the auto-submit queue. See Logs for the full trail.</p>
          )}
          {item.status === "submitting" && (
            <p className="muted small">Submitting now — one attempt, so this job is not sent twice.</p>
          )}
          {query === "failed" && (
            <button
              className="btn secondary"
              disabled={busy === item.id}
              onClick={async () => {
                setBusy(item.id);
                setError(null);
                try {
                  await api.retry(item.id);
                  refresh();
                } catch (e) {
                  setError(e instanceof Error ? e.message : "Retry failed");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === item.id ? "Retrying…" : "Retry extract / draft"}
            </button>
          )}
        </article>
      ))}
    </div>
  );
}
