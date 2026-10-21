import { useEffect, useMemo, useState, type FormEvent } from "react";
import { api } from "../api";

const PAGE = 40;

type Company = {
  id: number;
  slug: string;
  name: string;
  source?: string;
  enabled: boolean;
  lastFetchedAt: string | null;
  lastError: string | null;
};

export function Companies() {
  const [items, setItems] = useState<Company[]>([]);
  const [total, setTotal] = useState(0);
  const [enabledCount, setEnabledCount] = useState(0);
  const [discovering, setDiscovering] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [slug, setSlug] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  function refresh() {
    api.companies().then((r) => {
      setItems(r.items);
      setTotal(r.total);
      setEnabledCount(r.enabled);
      setDiscovering(r.discovering);
      setScanning(r.scanning);
    });
  }

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 2500);
    return () => clearInterval(t);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter(
      (c) => c.slug.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
    );
  }, [items, query]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pages - 1);
  const visible = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);

  async function add(e: FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      await api.addCompany(slug);
      setSlug("");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not add board");
    }
  }

  async function discover() {
    setError(null);
    try {
      await api.discoverCompanies();
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discover failed");
    }
  }

  return (
    <div>
      <h1>Companies</h1>
      <p className="muted">
        Every public Ashby board we can verify is stored and scanned. There is no company cap.
        Discovery pulls Wayback, Common Crawl, URLScan, HN, YC name guesses, careers embeds, and{" "}
        <code>company.ashbyhq.com</code> hosts, then keeps only slugs that return 200 on Ashby’s posting API.
        Greenhouse and Lever boards are added automatically when a LinkedIn or remote-board posting applies
        through them, or paste a board link below.
      </p>
      <p className="muted small">
        {enabledCount} enabled / {total} boards
        {discovering ? " · discovering…" : ""}
        {scanning ? " · scan running…" : ""}
      </p>
      {error && <p className="error">{error}</p>}
      <div className="row" style={{ marginBottom: 12, flexWrap: "wrap" }}>
        <button className="btn" disabled={discovering || scanning} onClick={() => void discover()}>
          {discovering ? "Discovering…" : "Discover all Ashby boards"}
        </button>
        <button
          className="btn secondary"
          type="button"
          onClick={async () => {
            await api.enableAllCompanies();
            refresh();
          }}
        >
          Enable all
        </button>
      </div>
      <form className="row" onSubmit={add} style={{ marginBottom: 12 }}>
        <input
          placeholder="Ashby slug, or a jobs.ashbyhq.com / boards.greenhouse.io / jobs.lever.co link"
          value={slug}
          onChange={(e) => setSlug(e.target.value)}
        />
        <button className="btn" type="submit">
          Add
        </button>
      </form>
      <input
        placeholder="Filter boards…"
        value={query}
        onChange={(e) => {
          setQuery(e.target.value);
          setPage(0);
        }}
        style={{ width: "100%", marginBottom: 12 }}
      />
      {visible.map((c) => (
        <article className="card compact" key={c.id}>
          <div className="row">
            <div>
              <strong>{c.name}</strong>{" "}
              <span className="muted">
                {c.source ?? "ashby"}/{c.slug}
              </span>
              {c.lastError && <p className="error small">{c.lastError}</p>}
              <p className="muted small">{c.lastFetchedAt ?? "never fetched"}</p>
            </div>
            <label className="small muted">
              <input
                type="checkbox"
                checked={c.enabled}
                onChange={async (e) => {
                  await api.patchCompany(c.id, e.target.checked);
                  refresh();
                }}
              />{" "}
              enabled
            </label>
          </div>
        </article>
      ))}
      {filtered.length === 0 && <p className="muted">No boards match.</p>}
      {pages > 1 && (
        <div className="row">
          <button className="btn secondary" disabled={safePage <= 0} onClick={() => setPage(safePage - 1)}>
            Previous
          </button>
          <span className="muted small">
            {safePage + 1} / {pages}
          </span>
          <button
            className="btn secondary"
            disabled={safePage >= pages - 1}
            onClick={() => setPage(safePage + 1)}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
