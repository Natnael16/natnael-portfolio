"use client";

import { useState } from "react";
import { PROFILE } from "@/lib/data";
import { scrollToTarget } from "@/lib/scroll";

const LINES = ["Let's build", "something together."];

function HopLine({ text, offset }: { text: string; offset: number }) {
  // Letters hop one by one, but each word stays unbreakable so lines wrap between words.
  let i = offset;
  return (
    <span className="hop-line" aria-hidden="true">
      {text.split(" ").map((word, w) => (
        <span key={w}>
          {w > 0 && " "}
          <span className="hop-word">
            {Array.from(word).map((ch) => (
              <span key={i} className="hop" style={{ "--i": i++ } as React.CSSProperties}>
                {ch}
              </span>
            ))}
          </span>
        </span>
      ))}
    </span>
  );
}

export function Contact() {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(PROFILE.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <section id="contact" className="section contact" aria-labelledby="contact-title">
      <div className="wrap">
        <p className="tag rv">06 — Contact</p>
        <h2 id="contact-title" className="contact-title">
          <span className="sr-only">{LINES.join(" ")}</span>
          <HopLine text={LINES[0]} offset={0} />
          <span className="serif-accent">
            <HopLine text={LINES[1]} offset={LINES[0].length} />
          </span>
        </h2>

        <div className="contact-grid">
          <div>
            <div className="contact-mail-row">
              <a className="contact-mail" href={`mailto:${PROFILE.email}`}>
                {PROFILE.email}
              </a>
              <button className="contact-copy" onClick={copy}>
                {copied ? "Copied ✓" : "Copy"}
              </button>
              <span className="sr-only" aria-live="polite">
                {copied ? "Email address copied" : ""}
              </span>
            </div>
            <ul className="contact-links">
              <li>
                <a href={PROFILE.phoneHref}>{PROFILE.phone}</a>
              </li>
              <li>
                <a href={PROFILE.github} target="_blank" rel="noreferrer">
                  GitHub ↗
                </a>
              </li>
              <li>
                <a href={PROFILE.linkedin} target="_blank" rel="noreferrer">
                  LinkedIn ↗
                </a>
              </li>
              <li>
                <a href={PROFILE.upwork} target="_blank" rel="noreferrer">
                  Upwork ↗
                </a>
              </li>
            </ul>
          </div>
          <a className="badge" href={`mailto:${PROFILE.email}`} aria-label={`Say hello: email ${PROFILE.email}`}>
            <svg viewBox="0 0 200 200" aria-hidden="true">
              <defs>
                <path id="badge-circle" d="M100,100 m-76,0 a76,76 0 1,1 152,0 a76,76 0 1,1 -152,0" />
              </defs>
              <text>
                <textPath href="#badge-circle" textLength="474" lengthAdjust="spacing">say hello · open to remote roles ·</textPath>
              </text>
            </svg>
            <span className="badge-arrow" aria-hidden="true">
              ↗
            </span>
          </a>
        </div>
      </div>

      <footer className="footer wrap">
        <span>
          © {new Date().getFullYear()} {PROFILE.fullName}
        </span>
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            scrollToTarget(null);
          }}
        >
          Back to top ↑
        </a>
        <span className="mono">Built with Next.js</span>
      </footer>

      <style>{`
        .contact { padding-bottom: 32px; }
        .contact-title { margin: 22px 0 0; font-family: var(--font-serif); font-weight: 600; font-size: clamp(44px, 9vw, 150px); letter-spacing: -.035em; line-height: 1; }
        .contact-title .serif-accent { display: block; font-weight: 400; }
        .hop-line { display: inline; }
        .hop-word { display: inline-block; white-space: nowrap; }
        .hop { display: inline-block; transition: transform .5s var(--ease); }
        .hop:hover { transform: translateY(-.14em); transition-duration: .15s; }
        .contact-grid { display: flex; align-items: flex-end; justify-content: space-between; gap: 32px; margin-top: clamp(40px, 7vw, 88px); flex-wrap: wrap; }
        .contact-mail-row { display: flex; align-items: center; gap: 14px; flex-wrap: wrap; }
        .contact-mail { font-size: clamp(22px, 3.4vw, 48px); font-weight: 600; letter-spacing: -.03em; text-decoration: underline; text-decoration-color: var(--accent-2);
          text-decoration-thickness: 2px; text-underline-offset: 8px; overflow-wrap: anywhere; }
        .contact-copy { height: 34px; padding: 0 14px; border-radius: 10px; font-size: 13px; box-shadow: inset 0 0 0 1px var(--line); background: var(--card); }
        .contact-copy:hover { background: var(--accent); color: var(--on-accent); }
        .contact-links { list-style: none; padding: 0; margin: 26px 0 0; display: flex; flex-wrap: wrap; gap: 10px 24px; color: var(--ink-2); }
        .contact-links a:hover { text-decoration: underline; text-underline-offset: 4px; }
        .badge { position: relative; width: 168px; height: 168px; flex: none; display: grid; place-items: center; }
        .badge svg { position: absolute; inset: 0; width: 100%; height: 100%; animation: spin 18s linear infinite; }
        .badge text { font-family: var(--font-mono); font-size: 13px; text-transform: uppercase; fill: var(--ink-2); }
        .badge-arrow { width: 64px; height: 64px; border-radius: 50%; background: var(--accent); color: var(--on-accent); box-shadow: inset 0 -4px 0 rgba(0,0,0,.3); display: grid; place-items: center; font-size: 22px;
          transition: transform .5s var(--ease); }
        .badge:hover .badge-arrow { transform: rotate(45deg) scale(1.06); }
        @keyframes spin { to { transform: rotate(360deg); } }
        .footer { display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-top: clamp(80px, 12vw, 140px); padding-top: 24px;
          border-top: 1px solid var(--line); font-size: 13px; color: var(--mute); }
        .footer a:hover { color: var(--ink); }
        .sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
      `}</style>
    </section>
  );
}
