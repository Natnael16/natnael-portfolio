import { useEffect, useState } from "react";
import { api, type Application } from "../api";

export function Inbox() {
  const [items, setItems] = useState<Application[]>([]);
  const [autoCount, setAutoCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [queuedCount, setQueuedCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<number | null>(null);
  const [startingAuto, setStartingAuto] = useState(false);

  function refresh() {
    api
      .inbox()
      .then((r) => {
        setItems(r.items);
        setAutoCount(r.autoCount);
        setReviewCount(r.reviewCount);
        setQueuedCount(r.queuedCount);
      })
      .catch((e) => setError(e.message));
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, []);

  async function startAuto() {
    setStartingAuto(true);
    setError(null);
    try {
      const result = await api.startAutoApply();
      if (result.queued === 0) {
        setError("No auto-submit jobs in Inbox.");
      }
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start auto apply");
    } finally {
      setStartingAuto(false);
    }
  }

  return (
    <div>
      <div className="row">
        <h1>Inbox</h1>
        <span className="muted small">
          {reviewCount} to review · {autoCount} auto-submit
          {queuedCount > 0 ? ` · ${queuedCount} applying` : ""}
        </span>
      </div>
      <p className="muted small">
        After a scan, every match lands here. 90%+ need Approve. 50–89% are tagged auto-submit and wait
        until you click Start auto apply. The agent rewrites a bad critique and fills empty fields from
        the résumé before tagging.
      </p>
      <div className="row" style={{ marginBottom: 16, justifyContent: "flex-start" }}>
        <button className="btn" disabled={startingAuto || autoCount === 0} onClick={() => void startAuto()}>
          {startingAuto ? "Starting…" : autoCount === 0 && queuedCount > 0 ? "Auto apply running…" : "Start auto apply"}
        </button>
      </div>
      {queuedCount > 0 && (
        <p className="muted small">
          {queuedCount} application{queuedCount === 1 ? " is" : "s are"} in the apply queue. Submits stay 5 minutes apart.
        </p>
      )}
      {error && <p className="error">{error}</p>}
      {items.length === 0 && queuedCount === 0 && (
        <p className="muted">Nothing in Inbox. Run a scan from Runs.</p>
      )}
      {items.map((item) => (
        <article className="card" key={item.id}>
          <a href={`#/inbox/${item.id}`} style={{ color: "inherit", textDecoration: "none" }}>
            <div className="row">
              <h2 className="list-title">
                {item.job.companyName} — {item.job.title}
              </h2>
              <span className={`badge ${item.status === "auto_submit" ? "ok" : "warn"}`}>
                {item.status === "auto_submit" ? "auto submit" : "pending approval"} · {item.matchScore ?? "—"}
              </span>
            </div>
            <p className="muted small">
              {item.match?.confidence} · {item.job.location} · {item.job.workplaceType}
            </p>
            <p>{item.match?.summary}</p>
            {item.flags?.filter((f) => f.required).length > 0 && (
              <p className="flags">{item.flags.filter((f) => f.required).length} required flags</p>
            )}
          </a>
          <div className="row" style={{ justifyContent: "flex-start", marginTop: 8 }}>
            <button
              className="btn secondary"
              disabled={busy === item.id}
              onClick={async (e) => {
                e.preventDefault();
                setBusy(item.id);
                setError(null);
                try {
                  const result = await api.refill(item.id);
                  if (result.status && result.status !== "pending_approval" && result.status !== "auto_submit") {
                    setError(`${item.job.title} finished as ${result.status} after refill.`);
                  }
                  refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Refill failed");
                } finally {
                  setBusy(null);
                }
              }}
            >
              {busy === item.id ? "Refilling…" : "Refill"}
            </button>
          </div>
        </article>
      ))}
    </div>
  );
}
