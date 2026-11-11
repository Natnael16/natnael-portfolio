"use client";

import { useEffect, useState } from "react";
import { PROOF, type Proof as ProofItem } from "@/lib/data";
import { prefersReducedMotion, useInView } from "@/lib/hooks";
import { SectionHead } from "@/components/ui/SectionHead";

const ICONS: Record<NonNullable<ProofItem["icon"]>, React.ReactNode> = {
  users: <path d="M9 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 9a6 6 0 0 1 12 0M16 4.5a3.5 3.5 0 0 1 0 6.5M21 20a6 6 0 0 0-3.5-5.4" />,
  bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
  search: <path d="M10.5 17a6.5 6.5 0 1 0 0-13 6.5 6.5 0 0 0 0 13Zm4.6-1.9L20 20M8 10.5h5" />,
  stream: <path d="M3 7h12M3 12h18M3 17h9M17 4l3 3-3 3M14 14l3 3-3 3" />,
  clock: <path d="M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18Zm0-13v4l3 2" />,
  star: <path d="m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" />,
};

function format(n: number, decimals = 0) {
  return n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

function Count({ item, run }: { item: ProofItem; run: boolean }) {
  const [n, setN] = useState(0);
  useEffect(() => {
    if (!run) return;
    if (prefersReducedMotion()) return setN(item.value);
    let frame = 0;
    const t0 = performance.now();
    const tick = (t: number) => {
      const p = Math.min(1, (t - t0) / 1400);
      setN(item.value * (1 - Math.pow(1 - p, 4)));
      if (p < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, item.value]);
  return (
    <p className="impact-num" aria-hidden="true">
      {item.prefix && <span className="impact-affix">{item.prefix}</span>}
      {format(n, item.decimals)}
      {item.suffix && <span className="impact-affix">{item.suffix}</span>}
    </p>
  );
}

/** Engineering results at a glance: a plain grid that counts up once when it comes into view. */
export function Proof() {
  const [gridRef, shown] = useInView<HTMLUListElement>({ threshold: 0.2 });

  return (
    <section id="proof" className="section" aria-labelledby="proof-title">
      <div className="wrap">
        <SectionHead index={2} label="Impact" title="Numbers that" accent="held up." id="proof-title" />
        <ul ref={gridRef} className="impact">
          {PROOF.map((item, i) => (
            <li key={item.label} className="impact-card rv" style={{ "--i": i, "--tint": item.logo?.tint ?? "#0d0d0d" } as React.CSSProperties}>
              <div className="impact-top">
                <span className="impact-icon">
                  {item.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/logos/${item.logo.file}.svg`} alt={item.logo.alt} width={22} height={22} loading="lazy" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {ICONS[item.icon ?? "star"]}
                    </svg>
                  )}
                </span>
                <span className="impact-caption mono">{item.caption}</span>
              </div>
              <Count item={item} run={shown} />
              <span className="sr-only">
                {item.prefix}
                {format(item.value, item.decimals)}
                {item.suffix}
              </span>
              <h3 className="impact-label">{item.label}</h3>
              <p className="impact-detail">{item.detail}</p>
            </li>
          ))}
        </ul>
      </div>
      <style>{`
        .impact { list-style: none; padding: 0; margin: clamp(36px, 5vw, 64px) 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; }
        .impact-card { background: var(--card); border-radius: 24px; box-shadow: inset 0 0 0 1px var(--line); padding: 22px 24px 24px;
          display: flex; flex-direction: column; transition: transform .5s var(--ease), box-shadow .5s var(--ease), opacity .9s var(--ease); }
        .impact-card:hover { transform: translateY(-4px); box-shadow: inset 0 0 0 1px var(--line), 0 30px 60px -36px rgba(13,13,13,.35); }
        .impact-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
        .impact-icon { position: relative; width: 40px; height: 40px; border-radius: 12px; display: grid; place-items: center; background: var(--paper);
          box-shadow: inset 0 0 0 1px var(--line); color: var(--ink); flex: none; }
        .impact-icon::before { content: ""; position: absolute; inset: -4px; border-radius: 16px; background: var(--tint); opacity: .12; filter: blur(10px); z-index: -1; }
        .impact-caption { font-size: 11px; color: var(--mute); text-transform: uppercase; letter-spacing: .05em; text-align: right; }
        .impact-num { margin: 22px 0 0; font-weight: 700; font-size: clamp(44px, 4.6vw, 72px); letter-spacing: -.06em; line-height: .9; white-space: nowrap;
          font-variant-numeric: tabular-nums; }
        .impact-affix { font-size: .5em; letter-spacing: 0; color: var(--mute); margin-left: .12em; }
        .impact-affix:first-child { margin-left: 0; margin-right: .1em; }
        .impact-label { margin: 12px 0 0; font-size: 18px; letter-spacing: -.025em; }
        .impact-detail { margin: 6px 0 0; font-size: 14px; color: var(--mute); line-height: 1.45; }
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        @media (max-width: 900px) { .impact { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
        @media (max-width: 560px) {
          .impact { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
          .impact-card { padding: 16px; border-radius: 20px; }
          .impact-icon { width: 34px; height: 34px; }
          .impact-caption { font-size: 9.5px; }
          .impact-num { font-size: 38px; margin-top: 16px; }
          .impact-label { font-size: 15px; }
          .impact-detail { display: none; }
        }
      `}</style>
    </section>
  );
}
