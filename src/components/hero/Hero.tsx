"use client";

import { useEffect, useRef, useState } from "react";
import { PROFILE } from "@/lib/data";
import { prefersReducedMotion } from "@/lib/hooks";
import { scrollToTarget } from "@/lib/scroll";

export function Hero() {
  const section = useRef<HTMLElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const soundBtn = useRef<HTMLButtonElement>(null);
  const [soundOn, setSoundOn] = useState(false);
  const [blocked, setBlocked] = useState(false);
  /** Once the visitor uses the button, never override their choice. */
  const chose = useRef(false);
  const visible = useRef(true);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    const reduced = prefersReducedMotion();

    const start = async () => {
      if (reduced) return;
      v.muted = false;
      try {
        await v.play();
        setSoundOn(true);
      } catch {
        // Autoplay with sound is blocked until the visitor interacts: play muted for now.
        v.muted = true;
        setBlocked(true);
        await v.play().catch(() => undefined);
      }
    };
    void start();

    const unlock = (e: Event) => {
      if (chose.current || reduced) return done();
      if (soundBtn.current?.contains(e.target as Node)) return done();
      v.muted = false;
      setSoundOn(true);
      setBlocked(false);
      if (visible.current) void v.play().catch(() => undefined);
      done();
    };
    const events = ["pointerdown", "keydown", "touchend"] as const;
    function done() {
      events.forEach((name) => window.removeEventListener(name, unlock));
    }
    events.forEach((name) => window.addEventListener(name, unlock, { passive: true }));

    // Stop the voice as soon as the hero is mostly off screen; resume on the way back.
    const io = new IntersectionObserver(
      ([entry]) => {
        visible.current = entry.intersectionRatio >= 0.35;
        if (!visible.current) v.pause();
        else if (!reduced || chose.current) void v.play().catch(() => undefined);
      },
      { threshold: [0, 0.35, 0.6, 1] },
    );
    if (section.current) io.observe(section.current);
    return () => {
      done();
      io.disconnect();
    };
  }, []);

  const toggleSound = () => {
    const v = video.current;
    if (!v) return;
    chose.current = true;
    setBlocked(false);
    if (soundOn) {
      v.muted = true;
      setSoundOn(false);
    } else {
      v.muted = false;
      setSoundOn(true);
      void v.play().catch(() => undefined);
    }
  };

  const go = (id: string) => (e: React.MouseEvent) => {
    e.preventDefault();
    scrollToTarget(id);
  };

  return (
    <section id="top" ref={section} className="hero" aria-labelledby="hero-title">
      <p className="hero-ghost" aria-hidden="true">
        {PROFILE.firstName.toUpperCase()}
      </p>

      <div className="hero-grid wrap">
        <div className="hero-left">
          <p className="tag rv">
            {PROFILE.location} · Remote
          </p>
          <h1 id="hero-title" className="hero-title">
            <span className="rv-mask" style={{ "--i": 1 } as React.CSSProperties}>
              <span>Senior</span>
            </span>
            <span className="rv-mask" style={{ "--i": 1.5 } as React.CSSProperties}>
              <span>full-stack</span>
            </span>
            <span className="rv-mask" style={{ "--i": 2 } as React.CSSProperties}>
              <span>
                <em>engineer.</em>
              </span>
            </span>
          </h1>
        </div>

        <div className="hero-stage">
          <video
            ref={video}
            className="hero-video"
            muted
            loop
            playsInline
            preload="auto"
            poster="/hero/poster.webp"
            aria-label={`An animated ${PROFILE.name} introducing himself as a ${PROFILE.role.toLowerCase()}`}
          >
            <source src="/hero/hero.webm" type="video/webm" />
            <source src="/hero/hero.mp4" type="video/mp4" />
          </video>
          <button
            ref={soundBtn}
            className={`hero-sound ${blocked ? "is-blocked" : ""}`}
            onClick={toggleSound}
            aria-label={soundOn ? "Mute the introduction" : "Play the introduction with sound"}
            aria-pressed={soundOn}
          >
            {soundOn ? (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <rect x="6" y="5" width="4" height="14" rx="1" fill="currentColor" />
                <rect x="14" y="5" width="4" height="14" rx="1" fill="currentColor" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
                <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" />
              </svg>
            )}
          </button>
        </div>

        <div className="hero-right">
          <p className="hero-lede rv" style={{ "--i": 2 } as React.CSSProperties}>
            {PROFILE.tagline}
          </p>
          <div className="hero-ctas rv" style={{ "--i": 3 } as React.CSSProperties}>
            <a href="#work" onClick={go("work")} className="btn btn-primary">
              Explore work
            </a>
            <a href="#contact" onClick={go("contact")} className="btn btn-ghost">
              Let&apos;s talk
            </a>
            <a href={PROFILE.resume} download className="btn btn-ghost">
              Résumé ↓
            </a>
          </div>
          <p className="hero-proof mono rv" style={{ "--i": 4 } as React.CSSProperties}>
            Top Rated Plus · 100% Job Success · 2,200+ hrs
          </p>
        </div>
      </div>

      <style>{`
        .hero { position: relative; min-height: 100svh; display: flex; align-items: flex-end; overflow: clip; padding-top: 64px; }
        .hero-ghost { position: absolute; left: 50%; top: 46%; transform: translate(-50%, -50%); margin: 0;
          font-weight: 800; font-size: clamp(96px, 23vw, 420px); letter-spacing: -.06em; line-height: .8; white-space: nowrap;
          color: transparent; -webkit-text-stroke: 1.2px rgba(13,13,13,.13); user-select: none; pointer-events: none;
          animation: ghost-in 1.6s var(--ease) both; }
        @keyframes ghost-in { from { opacity: 0; letter-spacing: -.02em; } }
        .hero-grid { position: relative; display: grid; grid-template-columns: minmax(0,1fr) auto minmax(0,1fr);
          align-items: end; gap: clamp(16px, 3vw, 48px); }
        .hero-left, .hero-right { padding-bottom: clamp(32px, 9vh, 96px); }
        .hero-title { margin: 18px 0 0; font-weight: 700; font-size: clamp(40px, 4.6vw, 84px); white-space: nowrap; letter-spacing: -.045em; line-height: .98; }
        .hero-title em { font-family: var(--font-serif); font-style: italic; font-weight: 400; letter-spacing: -.02em; color: var(--mute); }
        .hero-stage { position: relative; height: min(92svh, 1040px); aspect-ratio: 616 / 768; }
        .hero-video { width: 100%; height: 100%; object-fit: contain; object-position: bottom; mix-blend-mode: multiply; display: block; }
        .hero-sound { position: absolute; right: 4%; bottom: 14%; width: 46px; height: 46px; border-radius: 50%; display: grid; place-items: center;
          background: var(--ink); color: var(--paper); transition: transform .4s var(--ease); }
        .hero-sound:hover { transform: scale(1.06); }
        .hero-sound.is-blocked::after { content: ""; position: absolute; inset: -2px; border-radius: 50%; border: 1.5px solid var(--ink);
          animation: ping 1.8s var(--ease) infinite; }
        @keyframes ping { from { transform: scale(1); opacity: .6; } to { transform: scale(1.9); opacity: 0; } }
        .hero-lede { margin: 0; max-width: 34ch; font-size: clamp(16px, 1.25vw, 19px); line-height: 1.5; color: var(--ink-2); }
        .hero-ctas { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 26px; }
        .hero-proof { margin: 22px 0 0; font-size: 12px; color: var(--mute); letter-spacing: .02em; }
        @media (max-width: 1100px) {
          .hero { align-items: flex-start; padding-top: 72px; }
          .hero-grid { grid-template-columns: minmax(0,1fr); justify-items: center; text-align: center; gap: 0; }
          .hero-left { order: 1; padding-bottom: 0; }
          .hero-title .rv-mask { display: inline-block; margin-right: .22em; }
          .hero-title .rv-mask:last-child { display: block; margin-right: 0; }
          .hero-stage { order: 2; height: min(62svh, 118vw); margin-top: 8px; }
          .hero-right { order: 3; padding-bottom: 48px; display: flex; flex-direction: column; align-items: center; }
          .hero-lede { margin-top: 8px; }
          .hero-ctas { justify-content: center; }
          .hero-ghost { top: 52%; }
        }
      `}</style>
    </section>
  );
}
