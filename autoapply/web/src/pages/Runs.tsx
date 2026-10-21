import { useEffect, useState } from "react";
import { api } from "../api";

export function Runs() {
  const [items, setItems] = useState<
    Array<{
      id: number;
      status: string;
      startedAt: string;
      finishedAt: string | null;
      statsJson: string | null;
      error: string | null;
    }>
  >([]);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api.runs().then((r) => setItems(r.items));
  }
  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, []);

  const running = items.some((r) => r.status === "running");

  async function run() {
    setError(null);
    try {
      await api.runOnce();
      refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Run failed");
    }
  }

  return (
    <div>
      <div className="row">
        <h1>Runs</h1>
        <button className="btn" disabled={running} onClick={() => void run()}>
          {running ? "Running…" : "Run scan now"}
        </button>
      </div>
      <p className="muted small">
        Each scan reads the job feeds (remote boards, LinkedIn) and company boards, drops scams and
        roles you cannot work from, and puts close (~50%+) matches in Inbox. Ashby matches are drafted;
        the rest are listed under Apply yourself.
        The agent rewrites a bad critique and fills empty fields from the résumé before tagging.
        90%+ wait for your Approve. 50–89% are tagged auto-submit until you click Start auto apply.
      </p>
      {error && <p className="error">{error}</p>}
      {items.map((r) => (
        <article className="card" key={r.id}>
          <div className="row">
            <strong>
              #{r.id} {r.status}
            </strong>
            <span className="muted small">{r.startedAt}</span>
          </div>
          {r.statsJson && <pre className="small muted">{prettyStats(r.statsJson)}</pre>}
          {r.error && <p className="error">{r.error}</p>}
        </article>
      ))}
    </div>
  );
}

function prettyStats(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}
