"use client";

import { useState } from "react";
import { PROFILE, UPWORK, WORDS } from "@/lib/data";
import { SectionHead } from "@/components/ui/SectionHead";

/** Upwork reviews, verbatim, as cards that read in a few seconds. Long ones fold. */
export function Words() {
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section id="reviews" className="section words" aria-labelledby="reviews-title">
      <div className="wrap">
        <div className="words-head">
          <SectionHead index={1} label="Client reviews" title="In their" accent="words." id="reviews-title" />
          <a className="words-score rv" href={PROFILE.upwork} target="_blank" rel="noreferrer">
            <span className="words-stars" aria-hidden="true">
              ★★★★★
            </span>
            <span>
              <b>{UPWORK.rating}</b> on Upwork · {UPWORK.jss} Job Success · {UPWORK.contracts} ↗
            </span>
          </a>
        </div>
        <ul className="words-grid">
          {WORDS.map((w, i) => {
            const long = w.quote.length > 220;
            const expanded = open === i;
            return (
              <li key={w.period} className={`word card rv ${i === 0 ? "is-featured" : ""}`} style={{ "--i": i } as React.CSSProperties}>
                <span className="words-stars" aria-label="5 out of 5 stars">
                  ★★★★★
                </span>
                <blockquote className={long && !expanded ? "is-clamped" : ""}>“{w.quote}”</blockquote>
                {long && (
                  <button className="word-more" onClick={() => setOpen(expanded ? null : i)} aria-expanded={expanded}>
                    {expanded ? "Show less" : "Read full review"}
                  </button>
                )}
                <p className="word-meta">
                  <b>{w.contract}</b>
                  <span className="mono">
                    {w.period} · {w.hours}
                  </span>
                </p>
                {w.tags.length > 0 && (
                  <ul className="word-tags" aria-label="Endorsements">
                    {w.tags.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      <style>{`
        .words-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; flex-wrap: wrap; }
        .words-score { display: inline-flex; align-items: center; gap: 12px; padding: 12px 18px; border-radius: var(--r-btn); background: var(--card);
          box-shadow: inset 0 0 0 1px var(--line), 0 4px 0 var(--soft); font-size: 14px; color: var(--ink-2); margin-bottom: 8px; }
        .words-score b { color: var(--ink); }
        .words-stars { color: #F5B301; letter-spacing: 2px; font-size: 15px; }
        .words-grid { list-style: none; padding: 0; margin: clamp(32px, 5vw, 56px) 0 0; display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 14px; align-items: start; }
        .word { padding: 24px; display: flex; flex-direction: column; gap: 14px; }
        .word.is-featured { grid-row: span 2; }
        .word blockquote { margin: 0; font-size: 17px; line-height: 1.5; letter-spacing: -.012em; }
        .word.is-featured blockquote { font-family: var(--font-serif); font-size: clamp(20px, 1.8vw, 25px); line-height: 1.4; }
        .word blockquote.is-clamped { display: -webkit-box; -webkit-line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden; }
        .word-more { align-self: flex-start; font-size: 13px; text-decoration: underline; text-underline-offset: 3px; color: var(--mute); padding: 0; }
        .word-more:hover { color: var(--ink); }
        .word-meta { margin: 0; padding-top: 14px; border-top: 1px solid var(--line); display: flex; flex-direction: column; gap: 3px; font-size: 14px; }
        .word-meta .mono { font-size: 11.5px; color: var(--mute); }
        .word-tags { list-style: none; padding: 0; margin: 0; display: flex; flex-wrap: wrap; gap: 6px; }
        .word-tags li { font-size: 12px; padding: 4px 10px; border-radius: 8px; background: var(--soft); box-shadow: inset 0 0 0 1px var(--line); }
        @media (max-width: 1000px) { .words-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } .word.is-featured { grid-row: auto; grid-column: 1 / -1; } }
        @media (max-width: 640px) { .words-grid { grid-template-columns: minmax(0, 1fr); } }
      `}</style>
    </section>
  );
}
