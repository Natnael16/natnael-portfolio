import { WORDS } from "@/lib/data";
import { SectionHead } from "@/components/ui/SectionHead";

/** Upwork reviews, verbatim, as an index that floods with ink on hover. */
export function Words() {
  return (
    <section className="section words" aria-labelledby="words-title">
      <div className="wrap words-wrap">
        <div className="words-head">
          <SectionHead index={6} label="Kind words" title="In their" accent="words." id="words-title" />
          <p className="words-count mono rv">
            {WORDS.length} reviews · Upwork · 5.0 rating
          </p>
        </div>
        <ol className="words-list">
          {WORDS.map((w, i) => (
            <li key={w.period} className="word rv" style={{ "--i": i } as React.CSSProperties} tabIndex={0}>
              <span className="word-n mono">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <blockquote>“{w.quote}”</blockquote>
                <p className="word-meta mono">
                  {w.contract} · {w.period} · {w.hours}
                </p>
                {w.tags.length > 0 && (
                  <ul className="word-tags">
                    {w.tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </div>
            </li>
          ))}
        </ol>
      </div>
      <style>{`
        .words { background: var(--card); border-block: 1px solid var(--line); }
        .words-wrap { display: grid; grid-template-columns: minmax(0, .8fr) minmax(0, 1.5fr); gap: clamp(32px, 6vw, 96px); align-items: start; }
        .words-head { position: sticky; top: 120px; }
        .words-count { margin: 22px 0 0; font-size: 12px; color: var(--mute); }
        .words-list { list-style: none; margin: 0; padding: 0; border-top: 1px solid var(--line); }
        .word { position: relative; display: grid; grid-template-columns: 48px minmax(0,1fr); gap: 16px; padding: 28px 20px 28px 12px;
          border-bottom: 1px solid var(--line); isolation: isolate; outline: none; }
        .word::before { content: ""; position: absolute; inset: 0; background: var(--ink); transform: scaleX(0); transform-origin: 0 50%;
          transition: transform .7s var(--ease); z-index: -1; border-radius: 4px; }
        .word:hover::before, .word:focus-visible::before { transform: scaleX(1); }
        .word:hover, .word:focus-visible { color: var(--paper); }
        .word, .word * { transition: color .5s var(--ease); }
        .word-n { font-size: 12px; color: var(--mute); padding-top: 6px; }
        .word blockquote { margin: 0; font-size: clamp(17px, 1.5vw, 21px); line-height: 1.45; letter-spacing: -.015em; }
        .word:first-child blockquote { font-size: clamp(20px, 2vw, 28px); }
        .word-meta { margin: 14px 0 0; font-size: 11.5px; color: var(--mute); }
        .word-tags { list-style: none; padding: 0; margin: 12px 0 0; display: flex; flex-wrap: wrap; gap: 6px; }
        .word-tags li { font-size: 12px; padding: 4px 10px; border-radius: 999px; box-shadow: inset 0 0 0 1px var(--line); }
        .word:hover .word-meta, .word:hover .word-n, .word:focus-visible .word-meta, .word:focus-visible .word-n { color: var(--faint); }
        .word:hover .word-tags li, .word:focus-visible .word-tags li { box-shadow: inset 0 0 0 1px rgba(255,255,255,.25); }
        @media (max-width: 900px) { .words-wrap { grid-template-columns: minmax(0,1fr); } .words-head { position: static; } }
      `}</style>
    </section>
  );
}
