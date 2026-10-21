import { useEffect, useMemo, useState } from "react";
import { api } from "../api";

type EventRow = Awaited<ReturnType<typeof api.events>>["items"][number];

export function Logs() {
  const [items, setItems] = useState<EventRow[]>([]);
  const [filter, setFilter] = useState<"all" | "error" | "warn">("all");
  const [openShot, setOpenShot] = useState<string | null>(null);

  function refresh() {
    api.events().then((r) => setItems(r.items));
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, []);

  const visible = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((e) => e.level === filter);
  }, [items, filter]);

  const errors = items.filter((e) => e.level === "error").length;

  return (
    <div>
      <div className="row">
        <h1>Logs</h1>
        <span className="muted small">{errors} errors · {items.length} events</span>
      </div>
      <p className="muted small">
        Auto-apply queue, submits, spam flags, and draft failures. Also written to{" "}
        <code>data/logs/auto-apply.jsonl</code>.
      </p>
      <div className="row" style={{ marginBottom: 12, justifyContent: "flex-start", gap: 8 }}>
        {(["all", "error", "warn"] as const).map((id) => (
          <button
            key={id}
            className={filter === id ? "btn" : "btn secondary"}
            type="button"
            onClick={() => setFilter(id)}
          >
            {id}
          </button>
        ))}
      </div>
      {visible.length === 0 && <p className="muted">No events yet.</p>}
      {visible.map((e) => (
        <article className="card compact" key={e.id}>
          <div className="row">
            <strong>
              {e.companyName ? `${e.companyName} — ${e.title}` : e.kind}
            </strong>
            <span className={`badge ${e.level === "error" ? "danger" : e.level === "warn" ? "warn" : ""}`}>
              {e.level} · {e.kind}
            </span>
          </div>
          <p className="small" style={{ margin: "6px 0" }}>
            {e.message}
          </p>
          <p className="muted small">
            {e.createdAt}
            {e.applicationId != null ? ` · app #${e.applicationId}` : ""}
            {e.matchScore != null ? ` · match ${e.matchScore}` : ""}
            {e.status ? ` · ${e.status}` : ""}
          </p>
          {e.screenshotName && (
            <button
              className="btn secondary"
              type="button"
              onClick={() => setOpenShot(e.screenshotName)}
            >
              Screenshot
            </button>
          )}
        </article>
      ))}
      {openShot && (
        <div className="card" style={{ marginTop: 12 }}>
          <div className="row">
            <strong>{openShot}</strong>
            <button className="btn secondary" type="button" onClick={() => setOpenShot(null)}>
              Close
            </button>
          </div>
          <img
            src={`/api/screenshots/${encodeURIComponent(openShot)}`}
            alt={openShot}
            style={{ width: "100%", marginTop: 8, borderRadius: 8 }}
          />
        </div>
      )}
    </div>
  );
}
