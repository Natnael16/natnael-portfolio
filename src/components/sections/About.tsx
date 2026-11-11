import { PROFILE } from "@/lib/data";
import { SectionHead } from "@/components/ui/SectionHead";

const FACTS: Array<[string, string]> = [
  ["Based in", PROFILE.location],
  ["Works", PROFILE.locationNote],
  ["Currently", PROFILE.currently],
  ["Studied", PROFILE.education],
  ["Email", PROFILE.email],
];

export function About() {
  return (
    <section id="about" className="section" aria-labelledby="about-title">
      <div className="wrap">
        <SectionHead index={1} label="About" title="Hi, I'm" accent={`${PROFILE.firstName}.`} id="about-title" />
        <div className="about-grid">
          <div className="about-copy">
            <p className="about-summary rv">{PROFILE.resumeSummary}</p>
            <p className="about-line rv" style={{ "--i": 1 } as React.CSSProperties}>
              {PROFILE.tagline}
            </p>
            <div className="about-ctas rv" style={{ "--i": 2 } as React.CSSProperties}>
              <a className="btn btn-primary" href={PROFILE.resume} download>
                Résumé ↓
              </a>
              <a className="btn btn-ghost" href={PROFILE.github} target="_blank" rel="noreferrer">
                GitHub ↗
              </a>
              <a className="btn btn-ghost" href={PROFILE.linkedin} target="_blank" rel="noreferrer">
                LinkedIn ↗
              </a>
              <a className="btn btn-ghost" href={PROFILE.upwork} target="_blank" rel="noreferrer">
                Upwork ↗
              </a>
            </div>
          </div>

          <aside className="about-facts card rv" style={{ "--i": 1 } as React.CSSProperties} aria-label="Quick facts">
            <p className="tag">Quick facts</p>
            <dl>
              {FACTS.map(([k, v]) => (
                <div key={k} className="about-row">
                  <dt className="mono">{k}</dt>
                  <dd>{k === "Email" ? <a href={`mailto:${v}`}>{v}</a> : v}</dd>
                </div>
              ))}
            </dl>
            <blockquote className="about-quote">
              <span className="serif-accent">“{PROFILE.quote}”</span>
            </blockquote>
          </aside>
        </div>
      </div>
      <style>{`
        .about-grid { display: grid; grid-template-columns: minmax(0, 1.25fr) minmax(0, 1fr); gap: clamp(32px, 6vw, 96px); margin-top: clamp(40px, 6vw, 72px); align-items: start; }
        .about-summary { margin: 0; font-size: clamp(20px, 2vw, 28px); line-height: 1.38; letter-spacing: -.02em; font-weight: 500; }
        .about-line { margin: 24px 0 0; color: var(--mute); font-size: 17px; line-height: 1.55; max-width: 52ch; }
        .about-ctas { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 32px; }
        .about-facts { padding: clamp(24px, 3vw, 36px); }
        .about-facts dl { margin: 18px 0 0; }
        .about-row { display: grid; grid-template-columns: 96px minmax(0,1fr); gap: 16px; padding: 14px 0; border-top: 1px solid var(--line); }
        .about-row dt { font-size: 11px; text-transform: uppercase; letter-spacing: .06em; color: var(--mute); padding-top: 3px; }
        .about-row dd { margin: 0; font-size: 15px; overflow-wrap: anywhere; }
        .about-row dd a { text-decoration: underline; text-underline-offset: 3px; text-decoration-color: var(--faint); }
        .about-quote { margin: 22px 0 0; padding-top: 22px; border-top: 1px solid var(--line); font-size: clamp(22px, 2vw, 28px); line-height: 1.2; }
        .about-quote .serif-accent { color: var(--ink-2); }
        @media (max-width: 900px) { .about-grid { grid-template-columns: minmax(0,1fr); } }
      `}</style>
    </section>
  );
}
