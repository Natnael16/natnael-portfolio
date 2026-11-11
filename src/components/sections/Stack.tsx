import { FAMILIES, SKILLS, type Family } from "@/lib/data";
import { SectionHead } from "@/components/ui/SectionHead";
import { TechLogo } from "@/components/ui/TechLogo";

/** Strongest areas first, so a skim of the first rows answers "can he do our stack?". */
const ORDER: Family[] = ["Frontend", "Backend", "AI", "Languages", "Data", "Cloud", "Mobile"];

export function Stack() {
  const families = ORDER.filter((f) => FAMILIES.includes(f));
  return (
    <section id="stack" className="section" aria-labelledby="stack-title">
      <div className="wrap">
        <SectionHead index={4} label="Stack" title="Tools I ship" accent="with." id="stack-title" />
        <dl className="stack">
          {families.map((family, i) => (
            <div key={family} className="stack-row rv" style={{ "--i": i } as React.CSSProperties}>
              <dt className="mono">{family}</dt>
              <dd>
                <ul>
                  {SKILLS.filter((s) => s.family === family).map((s) => (
                    <li key={s.name}>
                      <TechLogo name={s.name} size={20} />
                      {s.name}
                    </li>
                  ))}
                </ul>
              </dd>
            </div>
          ))}
        </dl>
      </div>
      <style>{`
        .stack { margin: clamp(36px, 5vw, 64px) 0 0; border-top: 1px solid var(--line); }
        .stack-row { display: grid; grid-template-columns: 160px minmax(0, 1fr); gap: 24px; align-items: center; padding: 18px 0; border-bottom: 1px solid var(--line); }
        .stack-row dt { font-size: 12px; text-transform: uppercase; letter-spacing: .06em; color: var(--mute); }
        .stack-row dd { margin: 0; }
        .stack-row ul { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 8px; }
        .stack-row li { display: inline-flex; align-items: center; gap: 9px; height: 42px; padding: 0 16px 0 12px; border-radius: 999px; background: var(--card);
          box-shadow: inset 0 0 0 1px var(--line); font-size: 15px; font-weight: 500; letter-spacing: -.01em; color: var(--ink);
          transition: transform .4s var(--ease), box-shadow .4s var(--ease); }
        .stack-row li:hover { transform: translateY(-2px); box-shadow: inset 0 0 0 1px var(--line), 0 12px 24px -16px rgba(13,13,13,.4); }
        .stack-row li img, .stack-row li svg { width: 20px; height: 20px; object-fit: contain; flex: none; }
        @media (max-width: 700px) {
          .stack-row { grid-template-columns: minmax(0, 1fr); gap: 10px; }
          .stack-row li { height: 38px; font-size: 14px; padding: 0 14px 0 10px; }
        }
      `}</style>
    </section>
  );
}
