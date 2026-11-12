import type { Project } from "@/lib/data";

/**
 * Grayscale sketches of what each product does. Labelled "Illustrative UI" on screen so they
 * are never mistaken for real screenshots; the numbers in them are the ones from the résumé.
 */
export function MiniUI({ kind }: { kind: Project["ui"] }) {
  return (
    <div className={`mini mini-${kind}`} aria-hidden="true">
      <div className="mini-bar">
        <i />
        <i />
        <i />
      </div>
      <div className="mini-body">{BODIES[kind]}</div>
    </div>
  );
}

const BODIES: Record<Project["ui"], React.ReactNode> = {
  adify: (
    <>
      <div className="m-row">
        <div className="m-thumb m-play" />
        <div className="m-col">
          <b>Product video · rendering</b>
          <div className="m-progress">
            <span style={{ width: "72%" }} />
          </div>
          <small>LLM script → scenes → video</small>
        </div>
      </div>
      <div className="m-row">
        <div className="m-thumb" />
        <div className="m-col">
          <b>Shopify catalogue sync</b>
          <small>Automation running</small>
        </div>
        <span className="m-pill">Live</span>
      </div>
      <div className="m-cards">
        <div>
          <small>Plan</small>
          <b>Billing</b>
        </div>
        <div>
          <small>AI cost</small>
          <b>↓</b>
        </div>
        <div>
          <small>Latency</small>
          <b>↓</b>
        </div>
      </div>
    </>
  ),
  search: (
    <>
      <div className="m-search">
        <span>⌕</span> quarterly maintenance report
      </div>
      <div className="m-meta mono">BM25 + vector · cached</div>
      {[92, 81, 74, 60].map((w, i) => (
        <div className="m-hit" key={w}>
          <div className="m-doc" />
          <div className="m-col">
            <div className="m-line" style={{ width: `${w}%` }} />
            <div className="m-line thin" style={{ width: `${w - 22}%` }} />
          </div>
          <span className="m-score mono">{(0.97 - i * 0.08).toFixed(2)}</span>
        </div>
      ))}
      <div className="m-meta mono">~92% faster than SQL LIKE</div>
    </>
  ),
  kiosk: (
    <>
      <div className="m-kds">
        {["#104", "#105", "#106"].map((n, i) => (
          <div key={n} className={i === 0 ? "is-hot" : ""}>
            <b>{n}</b>
            <div className="m-line" />
            <div className="m-line thin" />
            <small>{["Preparing", "Queued", "Ready"][i]}</small>
          </div>
        ))}
      </div>
      <div className="m-row">
        <div className="m-col">
          <b>Delivery relay</b>
          <small>Courier assigned</small>
        </div>
        <span className="m-pill">Kiosk</span>
        <span className="m-pill">App</span>
      </div>
    </>
  ),
  sync: (
    <>
      <div className="m-hub">
        <div className="m-core">SKU</div>
        {["Shopify", "Amazon", "Etsy", "Square", "eBay", "Clover"].map((p, i) => (
          <span key={p} style={{ "--a": `${i * 60}deg` } as React.CSSProperties}>
            {p}
          </span>
        ))}
      </div>
      <div className="m-meta mono">6 channels · near-real-time · −52% API time</div>
    </>
  ),
  reviews: (
    <>
      {[
        ["Restaurant", "★★★★★"],
        ["Restaurant", "★★★★☆"],
        ["Restaurant", "★★★★★"],
      ].map(([t, s], i) => (
        <div className="m-row" key={i}>
          <div className="m-thumb" />
          <div className="m-col">
            <b>{t}</b>
            <small>{s}</small>
          </div>
        </div>
      ))}
      <div className="m-cards">
        <div>
          <small>Users</small>
          <b>920+</b>
        </div>
        <div>
          <small>Reviews</small>
          <b>5,970+</b>
        </div>
        <div>
          <small>Dishes</small>
          <b>15,880+</b>
        </div>
      </div>
    </>
  ),
};

/** Rendered once by the Work section. */
export const MINI_CSS = `
.mini { --ink: #0d0d0d; --ink-2: #3a3a3a; --mute: #77756f; --faint: #a9a6a0; --line: rgba(13,13,13,.1); --soft: #e9e6e0;
  width: 100%; height: 100%; border-radius: 18px; background: #fafaf8; box-shadow: inset 0 0 0 1px var(--line), 0 24px 60px -30px rgba(13,13,13,.35);
  display: flex; flex-direction: column; overflow: hidden; font-size: 12px; color: var(--ink-2); }
.mini-bar { display: flex; gap: 6px; padding: 10px 12px; border-bottom: 1px solid var(--line); background: #fff; }
.mini-bar i { width: 8px; height: 8px; border-radius: 50%; background: var(--soft); }
.mini-body { flex: 1; padding: 14px; display: flex; flex-direction: column; gap: 10px; min-height: 0; }
.mini b { color: var(--ink); font-weight: 600; font-size: 12.5px; }
.mini small { color: var(--mute); font-size: 11px; }
.m-row { display: flex; align-items: center; gap: 10px; background: #fff; border-radius: 12px; padding: 10px; box-shadow: inset 0 0 0 1px var(--line); }
.m-col { display: flex; flex-direction: column; gap: 5px; flex: 1; min-width: 0; }
.m-thumb { width: 44px; height: 44px; border-radius: 10px; background: linear-gradient(135deg, #d9d6d0, #bdbab4); flex: none; position: relative; }
.m-play::after { content: ""; position: absolute; left: 17px; top: 14px; border-left: 12px solid #fff; border-top: 8px solid transparent; border-bottom: 8px solid transparent; }
.m-progress { height: 6px; border-radius: 6px; background: var(--soft); overflow: hidden; }
.m-progress span { display: block; height: 100%; background: var(--ink); border-radius: 6px; animation: m-grow 2.4s var(--ease) infinite alternate; }
@keyframes m-grow { from { width: 30%; } }
.m-pill { font-size: 10px; padding: 3px 8px; border-radius: 999px; background: var(--ink); color: #fff; }
.m-cards { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-top: auto; }
.m-cards > div { background: #fff; border-radius: 12px; padding: 10px; box-shadow: inset 0 0 0 1px var(--line); display: flex; flex-direction: column; gap: 4px; }
.m-cards b { font-size: 16px; letter-spacing: -.03em; }
.m-search { background: #fff; border-radius: 999px; padding: 10px 14px; box-shadow: inset 0 0 0 1px var(--line); color: var(--ink); }
.m-search span { margin-right: 6px; color: var(--mute); }
.m-meta { font-size: 10px; color: var(--mute); }
.m-hit { display: flex; align-items: center; gap: 10px; }
.m-doc { width: 26px; height: 32px; border-radius: 4px; background: #fff; box-shadow: inset 0 0 0 1px var(--line); flex: none; }
.m-line { height: 7px; border-radius: 4px; background: #cfccc6; }
.m-line.thin { height: 5px; background: var(--soft); }
.m-score { font-size: 10px; color: var(--ink); }
.m-kds { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; flex: 1; }
.m-kds > div { background: #fff; border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 6px; box-shadow: inset 0 0 0 1px var(--line); }
.m-kds > div.is-hot { background: var(--ink); color: #fff; }
.m-kds > div.is-hot b, .m-kds > div.is-hot small { color: #fff; }
.m-kds > div.is-hot .m-line { background: #555; }
.m-kds small { margin-top: auto; }
.m-hub { position: relative; flex: 1; min-height: 160px; }
.m-core { position: absolute; left: 50%; top: 50%; width: 58px; height: 58px; margin: -29px; border-radius: 50%; background: var(--ink); color: #fff;
  display: grid; place-items: center; font-weight: 700; font-size: 12px; box-shadow: 0 0 0 10px rgba(13,13,13,.06), 0 0 0 22px rgba(13,13,13,.03);
  animation: m-pulse 2.2s ease-in-out infinite; }
@keyframes m-pulse { 50% { box-shadow: 0 0 0 14px rgba(13,13,13,.08), 0 0 0 30px rgba(13,13,13,.03); } }
.m-hub span { position: absolute; left: 50%; top: 50%; font-size: 10.5px; padding: 4px 9px; border-radius: 999px; background: #fff; color: var(--ink);
  box-shadow: inset 0 0 0 1px var(--line); white-space: nowrap;
  transform: translate(-50%, -50%) rotate(var(--a)) translateY(-74px) rotate(calc(-1 * var(--a))); }
`;
