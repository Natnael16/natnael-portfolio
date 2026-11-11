"use client";

import { useState } from "react";
import { PROJECTS } from "@/lib/data";
import { SectionHead } from "@/components/ui/SectionHead";
import { MINI_CSS, MiniUI } from "@/components/ui/MiniUI";
import { TechLogo } from "@/components/ui/TechLogo";

export function Work() {
  const [open, setOpen] = useState(0);

  return (
    <section id="work" className="section" aria-labelledby="work-title">
      <div className="wrap">
        <SectionHead index={3} label="Selected work" title="Things I've" accent="built." id="work-title" />
        <div className="work rv" role="list">
          {PROJECTS.map((p, i) => {
            const isOpen = open === i;
            return (
              <article
                key={p.id}
                role="listitem"
                className={`panel ${isOpen ? "is-open" : ""}`}
                onMouseEnter={() => setOpen(i)}
                onFocus={() => setOpen(i)}
                aria-labelledby={`p-${p.id}`}
              >
                <button
                  className="panel-spine"
                  onClick={() => setOpen(i)}
                  aria-expanded={isOpen}
                  aria-controls={`p-body-${p.id}`}
                  tabIndex={isOpen ? -1 : 0}
                >
                  <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="spine-title">{p.title}</span>
                  <span className="spine-plus" aria-hidden="true">
                    +
                  </span>
                </button>
                <div id={`p-body-${p.id}`} className="panel-body" hidden={!isOpen}>
                  <div className="panel-copy">
                    <p className="tag">
                      {String(i + 1).padStart(2, "0")} — {p.kicker}
                    </p>
                    <h3 id={`p-${p.id}`} className="panel-title">
                      {p.title}
                    </h3>
                    <p className="panel-period mono">{p.period}</p>
                    <p className="panel-desc">{p.description}</p>
                    <ul className="panel-features">
                      {p.features.map((f) => (
                        <li key={f}>{f}</li>
                      ))}
                    </ul>
                    <ul className="panel-tech" aria-label="Tech">
                      {p.tech.map((t) => (
                        <li key={t}>
                          <TechLogo name={t} size={14} />
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <figure className="panel-ui">
                    <MiniUI kind={p.ui} />
                    <figcaption className="mono">Illustrative UI</figcaption>
                  </figure>
                </div>
              </article>
            );
          })}
        </div>
      </div>
      <style>{`
        .work { display: flex; gap: 10px; height: min(78svh, 600px); margin-top: clamp(40px, 6vw, 72px); }
        .panel { position: relative; flex: 1; min-width: 0; border-radius: 26px; background: var(--card); box-shadow: inset 0 0 0 1px var(--line);
          overflow: hidden; transition: flex .8s var(--ease), box-shadow .6s var(--ease); }
        .panel.is-open { flex: 8; box-shadow: inset 0 0 0 1px var(--line), 0 30px 80px -40px rgba(13,13,13,.35); }
        .panel-spine { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: space-between;
          padding: 22px 0; width: 100%; transition: opacity .4s var(--ease); }
        .panel.is-open .panel-spine { opacity: 0; pointer-events: none; }
        .panel-spine .mono { font-size: 12px; color: var(--mute); }
        .spine-title { writing-mode: vertical-rl; transform: rotate(180deg); font-weight: 700; font-size: 20px; letter-spacing: -.03em; white-space: nowrap; }
        .spine-plus { width: 34px; height: 34px; border-radius: 50%; box-shadow: inset 0 0 0 1px var(--line); display: grid; place-items: center; font-size: 18px;
          transition: transform .5s var(--ease), background .4s var(--ease), color .4s var(--ease); }
        .panel-spine:hover .spine-plus { transform: rotate(90deg); background: var(--ink); color: var(--paper); }
        .panel-body { position: absolute; inset: 0; display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, .95fr); gap: 28px; padding: clamp(24px, 3vw, 40px);
          min-width: 760px; animation: body-in .8s var(--ease) both .15s; }
        .panel-body[hidden] { display: none; }
        @keyframes body-in { from { opacity: 0; transform: translateY(12px); } }
        .panel-copy { display: flex; flex-direction: column; min-height: 0; overflow: auto; }
        .panel-title { margin: 14px 0 0; font-size: clamp(32px, 3.6vw, 52px); letter-spacing: -.045em; line-height: 1; }
        .panel-period { margin: 8px 0 0; font-size: 12px; color: var(--mute); }
        .panel-desc { margin: 18px 0 0; color: var(--ink-2); line-height: 1.55; font-size: 15.5px; }
        .panel-features { list-style: none; padding: 0; margin: 20px 0 0; display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
        .panel-features li { font-size: 14px; padding-left: 16px; position: relative; }
        .panel-features li::before { content: ""; position: absolute; left: 0; top: .55em; width: 6px; height: 6px; border-radius: 50%; background: var(--ink); }
        .panel-tech { list-style: none; padding: 0; margin: auto 0 0; padding-top: 20px; display: flex; flex-wrap: wrap; gap: 6px; }
        .panel-tech li { display: inline-flex; align-items: center; gap: 6px; height: 30px; padding: 0 12px; border-radius: 999px; font-size: 12.5px;
          background: var(--paper); box-shadow: inset 0 0 0 1px var(--line); }
        .panel-ui { margin: 0; display: flex; flex-direction: column; gap: 8px; min-height: 0; animation: wipe 1s var(--ease) both .25s; }
        @keyframes wipe { from { clip-path: inset(0 0 0 100% round 18px); } to { clip-path: inset(0 0 0 0 round 18px); } }
        .panel-ui figcaption { font-size: 10.5px; color: var(--faint); text-align: right; letter-spacing: .04em; text-transform: uppercase; }
        @media (max-width: 1100px) { .panel-body { min-width: 0; grid-template-columns: minmax(0,1fr); } .panel-ui { display: none; } }
        @media (max-width: 760px) {
          .work { flex-direction: column; height: auto; }
          .panel { flex: none; transition: none; }
          .panel-spine { position: relative; flex-direction: row; padding: 18px 20px; gap: 14px; }
          .panel.is-open .panel-spine { display: none; }
          .spine-title { writing-mode: horizontal-tb; transform: none; flex: 1; text-align: left; font-size: 18px; }
          .panel-body { position: relative; padding: 24px 20px; }
          .panel-ui { display: flex; height: 300px; }
          .panel-features { grid-template-columns: 1fr; }
        }
      `}</style>
      <style>{MINI_CSS}</style>
    </section>
  );
}
