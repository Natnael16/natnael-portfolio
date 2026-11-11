"use client";

import { useState } from "react";
import { FAMILIES, SKILLS, type Family } from "@/lib/data";
import { useInView } from "@/lib/hooks";
import { SectionHead } from "@/components/ui/SectionHead";
import { TechLogo } from "@/components/ui/TechLogo";

export function Stack() {
  const [family, setFamily] = useState<Family | null>(null);
  const [picked, setPicked] = useState(0);
  const [gridRef, shown] = useInView<HTMLDivElement>({ threshold: 0.15 });
  const skill = SKILLS[picked];

  return (
    <section id="stack" className="section" aria-labelledby="stack-title">
      <div className="wrap">
        <SectionHead index={2} label="Stack" title="The periodic table of" accent="my stack." id="stack-title" />

        <div className="stack-chips rv" role="group" aria-label="Filter by family">
          <button className={family === null ? "is-on" : ""} aria-pressed={family === null} onClick={() => setFamily(null)}>
            All <span className="mono">{SKILLS.length}</span>
          </button>
          {FAMILIES.map((f) => (
            <button key={f} className={family === f ? "is-on" : ""} aria-pressed={family === f} onClick={() => setFamily(f)}>
              {f} <span className="mono">{SKILLS.filter((s) => s.family === f).length}</span>
            </button>
          ))}
        </div>

        <div className="stack-layout">
          <div ref={gridRef} className={`stack-grid ${shown ? "is-shown" : ""}`}>
            {SKILLS.map((s, i) => {
              const col = i % 8;
              const row = Math.floor(i / 8);
              const dim = family !== null && s.family !== family;
              return (
                <button
                  key={s.name}
                  className={`el ${dim ? "is-dim" : ""} ${picked === i ? "is-picked" : ""}`}
                  style={{ "--d": `${(row + col) * 40}ms` } as React.CSSProperties}
                  onMouseEnter={() => setPicked(i)}
                  onFocus={() => setPicked(i)}
                  onClick={() => setPicked(i)}
                  aria-label={`${s.name}, ${s.family}`}
                  aria-describedby="stack-inspector"
                >
                  <span className="el-n mono">{String(i + 1).padStart(2, "0")}</span>
                  <span className="el-sym">{s.symbol}</span>
                  <span className="el-name">{s.name}</span>
                </button>
              );
            })}
          </div>

          <aside id="stack-inspector" className="stack-inspector card" aria-live="polite">
            <div className="insp-logo" key={skill.name}>
              <TechLogo name={skill.name} size={150} />
            </div>
            <p className="tag">
              {String(picked + 1).padStart(2, "0")} · {skill.family}
            </p>
            <h3 className="insp-name">{skill.name}</h3>
            <p className="insp-used">
              {skill.usedIn.length ? (
                <>
                  <span className="mono">Used in</span> {skill.usedIn.join(", ")}
                </>
              ) : (
                <span className="mono">In the toolkit</span>
              )}
            </p>
          </aside>
        </div>
      </div>
      <style>{`
        .stack-chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 40px; }
        .stack-chips button { height: 38px; padding: 0 16px; border-radius: 999px; font-size: 14px; box-shadow: inset 0 0 0 1px var(--line);
          background: var(--card); transition: background .4s var(--ease), color .4s var(--ease); }
        .stack-chips button .mono { font-size: 11px; color: var(--faint); margin-left: 4px; }
        .stack-chips button.is-on { background: var(--ink); color: var(--paper); }
        .stack-chips button.is-on .mono { color: var(--faint); }
        .stack-layout { display: grid; grid-template-columns: minmax(0,1fr) 320px; gap: 24px; margin-top: 28px; align-items: start; }
        .stack-grid { display: grid; grid-template-columns: repeat(8, minmax(0,1fr)); gap: 8px; }
        .el { position: relative; aspect-ratio: 1; border-radius: 14px; background: var(--card); box-shadow: inset 0 0 0 1px var(--line);
          display: flex; flex-direction: column; justify-content: space-between; padding: 9px 10px; text-align: left; min-width: 0;
          opacity: 0; transform: scale(.85) translateY(10px);
          transition: opacity .7s var(--ease) var(--d), transform .7s var(--ease) var(--d), background .3s var(--ease), color .3s var(--ease); }
        .stack-grid.is-shown .el { opacity: 1; transform: none; }
        .stack-grid.is-shown .el.is-dim { opacity: .25; }
        .el:hover, .el.is-picked { background: var(--ink); color: var(--paper); transition-delay: 0s; }
        .el-n { font-size: 10px; color: var(--faint); }
        .el-sym { font-size: clamp(18px, 2.2vw, 30px); font-weight: 700; letter-spacing: -.04em; line-height: 1; }
        .el-name { font-size: 10.5px; line-height: 1.15; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: inherit; opacity: .7; }
        .stack-inspector { position: sticky; top: 96px; padding: 28px; min-height: 380px; }
        .insp-logo { height: 170px; display: grid; place-items: center; color: var(--ink); animation: pop .6s var(--ease); }
        .insp-logo img, .insp-logo svg { width: 150px; height: 150px; object-fit: contain; }
        @keyframes pop { from { transform: scale(.7); opacity: 0; } }
        .insp-name { margin: 10px 0 0; font-size: 34px; letter-spacing: -.04em; line-height: 1.05; }
        .insp-used { margin: 12px 0 0; color: var(--ink-2); font-size: 15px; line-height: 1.5; }
        .insp-used .mono { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--mute); margin-right: 6px; }
        @media (max-width: 1000px) {
          .stack-layout { grid-template-columns: minmax(0,1fr); }
          .stack-inspector { position: static; min-height: 0; display: grid; grid-template-columns: 96px minmax(0,1fr); gap: 0 18px; align-items: center; padding: 20px; }
          .insp-logo { grid-row: span 3; height: 96px; }
          .insp-logo img, .insp-logo svg { width: 80px; height: 80px; }
          .insp-name { font-size: 26px; margin: 4px 0 0; }
          .insp-used { margin-top: 4px; }
        }
        @media (max-width: 640px) { .stack-grid { grid-template-columns: repeat(4, minmax(0,1fr)); } }
      `}</style>
    </section>
  );
}
