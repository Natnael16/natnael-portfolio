"use client";

import { useEffect, useRef, useState } from "react";
import { PATH } from "@/lib/data";
import { useScrollProgress } from "@/lib/hooks";
import { SectionHead } from "@/components/ui/SectionHead";

export function Path() {
  const [listRef, progress] = useScrollProgress<HTMLDivElement>("center");
  const stops = useRef<Array<HTMLLIElement | null>>([]);
  const [lit, setLit] = useState(0);

  // A stop lights up once the drawn spine reaches its dot.
  useEffect(() => {
    const list = listRef.current;
    if (!list) return;
    const reach = progress * list.offsetHeight;
    setLit(stops.current.filter((s) => s && s.offsetTop + 18 <= reach).length);
  }, [progress, listRef]);

  return (
    <section id="path" className="section" aria-labelledby="path-title">
      <div className="wrap path-wrap">
        <div className="path-head">
          <SectionHead index={5} label="Path" title="How I got" accent="here." id="path-title" />
          <p className="path-note rv">Education and work as one line, oldest first.</p>
        </div>
        <div ref={listRef} className="path">
          <span className="path-spine" aria-hidden="true">
            <span style={{ transform: `scaleY(${progress})` }} />
          </span>
          <ol>
          {PATH.map((s, i) => (
            <li
              key={`${s.year}-${s.place}`}
              ref={(el) => {
                stops.current[i] = el;
              }}
              className={`stop ${i < lit ? "is-lit" : ""}`}
            >
              <span className="stop-dot" aria-hidden="true" />
              <span className="stop-year mono">{s.year}</span>
              <div className="stop-body">
                <h3>{s.title}</h3>
                <p className="stop-place">
                  {s.place}
                  <span className="stop-kind mono">{s.kind === "education" ? "Learning" : "Work"}</span>
                </p>
                <p className="stop-detail">{s.detail}</p>
              </div>
            </li>
          ))}
          <li className={`stop stop-next ${lit >= PATH.length ? "is-lit" : ""}`}>
            <span className="stop-dot" aria-hidden="true" />
            <span className="stop-year mono">Next</span>
            <div className="stop-body stop-card">
              <h3>
                Your team<span className="serif-accent">?</span>
              </h3>
              <p className="stop-detail">Open to senior full-stack and AI engineering roles, remote.</p>
            </div>
          </li>
          </ol>
        </div>
      </div>
      <style>{`
        .path-wrap { display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, 1.4fr); gap: clamp(32px, 6vw, 96px); align-items: start; }
        .path-head { position: sticky; top: 120px; }
        .path-note { margin: 24px 0 0; color: var(--mute); max-width: 32ch; }
        .path { position: relative; padding-left: 36px; }
        .path ol { list-style: none; margin: 0; padding: 0; }
        .path-spine { position: absolute; left: 7px; top: 8px; bottom: 8px; width: 2px; background: var(--soft); border-radius: 2px; }
        .path-spine > span { position: absolute; inset: 0; background: var(--ink); transform-origin: 50% 0; border-radius: 2px; }
        .stop { position: relative; display: grid; grid-template-columns: 64px minmax(0,1fr); gap: 16px; padding-bottom: 44px;
          opacity: .32; transition: opacity .6s var(--ease); }
        .stop.is-lit { opacity: 1; }
        .stop-dot { position: absolute; left: -36px; top: 6px; width: 16px; height: 16px; border-radius: 50%; background: var(--paper);
          box-shadow: inset 0 0 0 2px var(--faint); transition: box-shadow .5s var(--ease), background .5s var(--ease); }
        .stop.is-lit .stop-dot { background: var(--ink); box-shadow: inset 0 0 0 2px var(--ink), 0 0 0 6px rgba(13,13,13,.07); }
        .stop-year { font-size: 13px; color: var(--mute); padding-top: 4px; }
        .stop-body h3 { margin: 0; font-size: clamp(22px, 2.2vw, 30px); letter-spacing: -.035em; line-height: 1.1; }
        .stop-place { margin: 6px 0 0; color: var(--ink-2); display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
        .stop-kind { font-size: 10px; text-transform: uppercase; letter-spacing: .06em; color: var(--mute); padding: 3px 8px; border-radius: 999px;
          box-shadow: inset 0 0 0 1px var(--line); }
        .stop-detail { margin: 10px 0 0; color: var(--mute); line-height: 1.55; max-width: 56ch; }
        .stop-card { border: 1.5px dashed rgba(13,13,13,.25); border-radius: 22px; padding: 22px; }
        .stop-next { padding-bottom: 0; }
        @media (max-width: 900px) {
          .path-wrap { grid-template-columns: minmax(0,1fr); }
          .path-head { position: static; }
          .stop { grid-template-columns: minmax(0,1fr); gap: 4px; }
        }
      `}</style>
    </section>
  );
}
