"use client";

import { useEffect, useRef, useState } from "react";
import { PROFILE, UPWORK } from "@/lib/data";
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
            Now · {PROFILE.currently}
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
          <a className="trust rv" style={{ "--i": 3 } as React.CSSProperties} href={PROFILE.upwork} target="_blank" rel="noreferrer"
            aria-label={`Upwork profile: ${UPWORK.badge}, ${UPWORK.topPercent} of talent, ${UPWORK.rating} star rating, ${UPWORK.jss} Job Success, ${UPWORK.hours} hours`}>
            <span className="trust-head">
              <span className="trust-logo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/logos/upwork.svg" alt="" width={22} height={22} />
              </span>
              <span>
                <b>{UPWORK.badge}</b>
                <small>{UPWORK.topPercent} on Upwork ↗</small>
              </span>
            </span>
            <span className="trust-stats">
              <span>
                <b>
                  {UPWORK.rating} <i aria-hidden="true">★</i>
                </b>
                <small>Rating</small>
              </span>
              <span>
                <b>{UPWORK.jss}</b>
                <small>Job Success</small>
              </span>
              <span>
                <b>{UPWORK.hours}</b>
                <small>Hours</small>
              </span>
            </span>
          </a>
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
        .hero-ctas { display: flex; flex-direction: column; align-items: flex-start; gap: 10px; }
        .trust { display: inline-flex; flex-direction: column; gap: 16px; margin-top: 28px; padding: 20px 22px; border-radius: 22px; background: var(--card);
          box-shadow: inset 0 0 0 1px var(--line), 0 20px 50px -30px rgba(13,13,13,.35); text-align: left; transition: transform .5s var(--ease), box-shadow .5s var(--ease); }
        .trust:hover { transform: translateY(-3px); box-shadow: inset 0 0 0 1px var(--line), 0 26px 60px -30px rgba(13,13,13,.45); }
        .trust b { display: block; font-weight: 700; letter-spacing: -.02em; font-size: 18px; white-space: nowrap; }
        .trust small { display: block; font-size: 12px; color: var(--mute); margin-top: 2px; white-space: nowrap; }
        .trust-head { display: flex; align-items: center; gap: 12px; }
        .trust-logo { position: relative; width: 42px; height: 42px; border-radius: 12px; display: grid; place-items: center; background: var(--paper);
          box-shadow: inset 0 0 0 1px var(--line); flex: none; }
        .trust-logo::before { content: ""; position: absolute; inset: -4px; border-radius: 16px; background: #6FDA44; opacity: .28; filter: blur(10px); z-index: -1; }
        .trust-stats { display: grid; grid-template-columns: repeat(3, auto); gap: 22px; padding-top: 14px; border-top: 1px solid var(--line); }
        .trust-stats b { font-size: clamp(20px, 1.8vw, 26px); }
        .trust-stats i { font-style: normal; font-size: .9em; color: #F5B301; }
        @media (max-width: 1100px) {
          /* Phone and tablet: role, title, Upwork card, the whole character and the buttons on one screen. */
          .hero { align-items: flex-start; min-height: 100svh; padding-top: 64px; }
          .hero-grid { grid-template-columns: minmax(0,1fr); justify-items: center; text-align: center; gap: 0; }
          .hero-left { order: 1; padding-bottom: 0; display: flex; flex-direction: column; align-items: center; }
          .hero-left .tag { font-size: 10.5px; }
          .hero-title { margin-top: 10px; font-size: clamp(30px, 8.6vw, 56px); }
          .hero-title .rv-mask { display: inline-block; margin-right: .22em; }
          .hero-title .rv-mask:last-child { display: block; margin-right: 0; }
          .trust { margin-top: 14px; padding: 12px 14px; gap: 10px; border-radius: 18px; }
          .trust-head { gap: 10px; }
          .trust-logo { width: 34px; height: 34px; border-radius: 10px; }
          .trust b { font-size: 15px; }
          .trust small { font-size: 11px; }
          .trust-stats { gap: 18px; padding-top: 10px; }
          .trust-stats b { font-size: 18px; }
          .hero-stage { order: 2; height: clamp(240px, calc(100svh - 420px), 60svh); max-width: 92vw; margin-top: 6px; }
          .hero-sound { width: 42px; height: 42px; bottom: 10%; }
          .hero-right { order: 3; padding-bottom: 28px; display: flex; flex-direction: column; align-items: center; }
          .hero-ctas { flex-direction: row; flex-wrap: wrap; justify-content: center; gap: 8px; margin-top: 8px; }
          .hero-ctas .btn { height: 44px; padding-inline: 18px; font-size: 14px; }
          .hero-ghost { top: 60%; font-size: 30vw; }
        }
      `}</style>
    </section>
  );
}
