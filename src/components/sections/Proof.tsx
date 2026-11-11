"use client";

import { useEffect, useRef, useState } from "react";
import { PROOF, type Proof as ProofItem } from "@/lib/data";
import { prefersReducedMotion } from "@/lib/hooks";
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
    <span className="proof-num" aria-hidden="true">
      {item.prefix && <span className="proof-affix">{item.prefix}</span>}
      {format(n, item.decimals)}
      {item.suffix && <span className="proof-affix">{item.suffix}</span>}
    </span>
  );
}

export function Proof() {
  const section = useRef<HTMLElement>(null);
  const track = useRef<HTMLDivElement>(null);
  const bar = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number | null>(null);
  const [active, setActive] = useState(0);
  const [seen, setSeen] = useState<boolean[]>(() => PROOF.map(() => false));

  // The section is as tall as the viewport plus the track's horizontal travel.
  useEffect(() => {
    const measure = () => {
      const t = track.current;
      if (!t) return;
      const travel = Math.max(0, t.scrollWidth - window.innerWidth);
      setHeight(window.innerHeight + travel);
    };
    measure();
    const ro = new ResizeObserver(measure);
    if (track.current) ro.observe(track.current);
    window.addEventListener("resize", measure);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const s = section.current;
      const t = track.current;
      if (!s || !t) return;
      const rect = s.getBoundingClientRect();
      const travel = Math.max(0, t.scrollWidth - window.innerWidth);
      const p = travel > 0 ? Math.min(1, Math.max(0, -rect.top / (rect.height - window.innerHeight))) : 0;
      t.style.transform = `translate3d(${-p * travel}px,0,0)`;
      if (bar.current) bar.current.style.transform = `scaleX(${p})`;

      // Lift the card nearest the middle of the screen; count up any card that is on screen.
      const mid = window.innerWidth / 2;
      let best = 0;
      let bestDist = Infinity;
      const cards = Array.from(t.querySelectorAll<HTMLElement>("[data-card]"));
      const onScreen: number[] = [];
      cards.forEach((c, i) => {
        const r = c.getBoundingClientRect();
        const d = Math.abs(r.left + r.width / 2 - mid);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
        if (r.left < window.innerWidth * 0.92 && r.right > 0 && rect.top < window.innerHeight * 0.6) onScreen.push(i);
      });
      setActive(best);
      if (onScreen.length) setSeen((prev) => (onScreen.every((i) => prev[i]) ? prev : prev.map((v, i) => v || onScreen.includes(i))));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [height]);

  return (
    <section id="proof" ref={section} className="proof" style={height ? { height } : undefined} aria-labelledby="proof-title">
      <div className="proof-sticky">
        <div className="wrap proof-head">
          <SectionHead index={4} label="Proof" title="Numbers that" accent="held up." id="proof-title" />
          <div className="proof-progress" aria-hidden="true">
            <div ref={bar} />
          </div>
        </div>
        <div ref={track} className="proof-track">
          {PROOF.map((item, i) => (
            <article
              key={item.label}
              data-card
              className={`proof-card ${active === i ? "is-active" : ""}`}
              style={{ "--tint": item.logo?.tint ?? "#0d0d0d" } as React.CSSProperties}
            >
              <div className="proof-top">
                <div className="proof-logo">
                  {item.logo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={`/logos/${item.logo.file}.svg`} alt={item.logo.alt} width={34} height={34} loading="lazy" />
                  ) : (
                    <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {ICONS[item.icon ?? "star"]}
                    </svg>
                  )}
                </div>
                <span className="mono proof-index">
                  {String(i + 1).padStart(2, "0")} / {String(PROOF.length).padStart(2, "0")}
                </span>
              </div>
              <div className="proof-bottom">
                <div>
                  <h3 className="proof-label">{item.label}</h3>
                  <p className="proof-caption mono">{item.caption}</p>
                  <p className="proof-detail">{item.detail}</p>
                </div>
                <Count item={item} run={seen[i]} />
                <span className="sr-only">
                  {item.prefix}
                  {format(item.value, item.decimals)}
                  {item.suffix}
                </span>
              </div>
            </article>
          ))}
          <p className="proof-end">
            and counting <span aria-hidden="true">→</span>
          </p>
        </div>
      </div>
      <style>{`
        .proof { position: relative; height: 300vh; }
        .proof-sticky { position: sticky; top: 0; height: 100svh; display: flex; flex-direction: column; justify-content: center; overflow: hidden; gap: clamp(24px, 5vh, 56px); }
        .proof-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; }
        .proof-head .h-section { font-size: clamp(36px, 5vw, 80px); }
        .proof-progress { width: min(240px, 30vw); height: 2px; background: var(--soft); border-radius: 2px; overflow: hidden; margin-bottom: 14px; flex: none; }
        .proof-progress > div { height: 100%; background: var(--ink); transform-origin: 0 50%; transform: scaleX(0); }
        .proof-track { display: flex; align-items: center; gap: 20px; width: max-content; padding: 20px var(--gutter); will-change: transform; }
        .proof-card { width: clamp(300px, 40vw, 540px); height: clamp(260px, 36vh, 310px); border-radius: 28px; background: var(--card);
          box-shadow: inset 0 0 0 1px var(--line); padding: 24px 26px; display: flex; flex-direction: column; justify-content: space-between; flex: none;
          transition: transform .7s var(--ease), box-shadow .7s var(--ease); }
        .proof-card.is-active { transform: translateY(-12px); box-shadow: inset 0 0 0 1px var(--line), 0 40px 80px -36px rgba(13,13,13,.35); }
        .proof-top { display: flex; align-items: flex-start; justify-content: space-between; }
        .proof-logo { position: relative; width: 72px; height: 72px; border-radius: 20px; display: grid; place-items: center; background: var(--paper);
          box-shadow: inset 0 0 0 1px var(--line); color: var(--ink); }
        .proof-logo::before { content: ""; position: absolute; inset: -6px; border-radius: 26px; background: var(--tint); opacity: .1; filter: blur(14px);
          z-index: -1; transition: opacity .7s var(--ease); }
        .proof-card.is-active .proof-logo::before { opacity: .32; }
        .proof-index { font-size: 12px; color: var(--mute); }
        .proof-bottom { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; }
        .proof-label { margin: 0; font-size: 20px; letter-spacing: -.03em; line-height: 1.1; }
        .proof-caption { margin: 6px 0 0; font-size: 11px; color: var(--mute); text-transform: uppercase; letter-spacing: .05em; }
        .proof-detail { margin: 10px 0 0; font-size: 13.5px; color: var(--ink-2); line-height: 1.45; max-width: 26ch; }
        .proof-num { font-weight: 700; font-size: clamp(48px, 6vw, 92px); letter-spacing: -.06em; line-height: .85; white-space: nowrap; font-variant-numeric: tabular-nums; }
        .proof-affix { font-size: .5em; letter-spacing: -.03em; color: var(--mute); }
        .proof-end { flex: none; margin: 0 8vw 0 24px; font-family: var(--font-serif); font-style: italic; font-size: clamp(32px, 4vw, 56px); color: var(--mute); white-space: nowrap; }
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
        @media (max-width: 640px) {
          .proof-head { flex-direction: column; align-items: flex-start; gap: 16px; }
          .proof-card { width: 84vw; height: auto; min-height: 300px; padding: 20px; gap: 20px; }
          .proof-bottom { flex-direction: column; align-items: flex-start; }
          .proof-num { font-size: 56px; }
        }
      `}</style>
    </section>
  );
}
