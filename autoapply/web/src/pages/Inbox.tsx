import { useEffect, useState } from "react";
import { api, type Application } from "../api";


export function Inbox() {
  const [items, setItems] = useState<Application[]>([]);
  const [autoCount, setAutoCount] = useState(0);
  const [reviewCount, setReviewCount] = useState(0);
  const [manualCount, setManualCount] = useState(0);
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
        setManualCount(r.manualCount);
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

  async function act(item: Application, action: "applied" | "skip") {
    setBusy(item.id);
    setError(null);
    try {
      if (action === "applied") await api.markSubmitted(item.id);
      else await api.skip(item.id);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(null);
    }
  }

  const manual = items.filter((item) => item.status === "apply_manual");
  const drafted = items.filter((item) => item.status !== "apply_manual");

  return (
    <div>
      <div className="row">
        <h1>Inbox</h1>
        <span className="muted small">
          {manualCount} to apply yourself · {reviewCount} to review · {autoCount} auto-submit
          {queuedCount > 0 ? ` · ${queuedCount} applying` : ""}
        </span>
      </div>
      {manual.length > 0 && (
        <section style={{ marginBottom: 24 }}>
          <h2>Apply yourself</h2>
          <p className="muted small">
            Matches from LinkedIn, remote job boards, Greenhouse and Lever. The agent cannot submit these
            forms, so open the posting, apply, then mark it applied.
          </p>
          {manual.map((item) => (
            <article className="card" key={item.id}>
              <div className="row">
                <h2 className="list-title">
                  {item.job.companyName} — {item.job.title}
                </h2>
                <span className="badge ok">
                  {item.job.sourceLabel} · {item.matchScore ?? "—"}
                </span>
              </div>
              <p className="muted small">
                {[item.job.location, item.job.compensation, item.job.publishedAt?.slice(0, 10)].filter(Boolean).join(" · ")}
              </p>
              <p>{item.match?.summary}</p>
              {item.match?.evidence && item.match.evidence.length > 0 && (
                <ul className="small">
                  {item.match.evidence.slice(0, 3).map((e) => (
                    <li key={e}>{e}</li>
                  ))}
                </ul>
              )}
              {item.match?.legit?.flags && item.match.legit.flags.length > 0 && (
                <p className="flags">Check before applying: {item.match.legit.flags.map((f) => f.reason).join("; ")}</p>
              )}
              <div className="row" style={{ justifyContent: "flex-start", marginTop: 8, gap: 8 }}>
                <a className="btn" href={item.job.applyUrl} target="_blank" rel="noopener noreferrer">
                  Open &amp; apply
                </a>
                <button className="btn secondary" disabled={busy === item.id} onClick={() => void act(item, "applied")}>
                  Mark applied
                </button>
                <button className="btn secondary" disabled={busy === item.id} onClick={() => void act(item, "skip")}>
                  Skip
                </button>
              </div>
            </article>
          ))}
        </section>
      )}
      <h2>Drafted by the agent</h2>
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
      {drafted.length === 0 && queuedCount === 0 && (
        <p className="muted">Nothing drafted. Run a scan from Runs.</p>
      )}
      {drafted.map((item) => (
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
