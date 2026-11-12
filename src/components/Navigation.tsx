"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { NAV, PROFILE } from "@/lib/data";
import { scrollToTarget, setScrollLocked } from "@/lib/scroll";

export function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);
  const bar = useRef<HTMLDivElement>(null);
  const links = useRef<Record<string, HTMLAnchorElement | null>>({});
  const listRef = useRef<HTMLDivElement>(null);

  // Scrolled state + the 2px progress bar, written straight to the DOM to avoid re-renders.
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const y = window.scrollY;
      setScrolled(y > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? y / max : 0})`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Active section: whichever crosses the band just above the middle of the viewport.
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(e.target.id);
      },
      { rootMargin: "-45% 0px -50% 0px" },
    );
    for (const { id } of NAV) {
      const el = document.getElementById(id);
      if (el) io.observe(el);
    }
    const hero = document.getElementById("top");
    if (hero) io.observe(hero);
    return () => io.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = active ? links.current[active] : null;
    const list = listRef.current;
    if (!el || !list) return setPill(null);
    setPill({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, scrolled]);

  useEffect(() => {
    setScrollLocked(open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const go = (id: string | null) => (e: React.MouseEvent) => {
    e.preventDefault();
    if (open) {
      // The open menu locks scrolling; release it before scrolling, or the jump is swallowed.
      setScrollLocked(false);
      setOpen(false);
      requestAnimationFrame(() => scrollToTarget(id));
      return;
    }
    scrollToTarget(id);
  };

  return (
    <>
      <div className="nav-progress" aria-hidden="true">
        <div ref={bar} />
      </div>
      <header className={`nav ${scrolled ? "is-scrolled" : ""}`}>
        <div className="nav-inner wrap">
          <a href="#top" onClick={go(null)} className="nav-brand" aria-label={`${PROFILE.name}, back to top`}>
            <span className="nav-mark mono">{PROFILE.initials}</span>
            <span className="nav-name">{PROFILE.name}</span>
          </a>
          <nav aria-label="Sections" className="nav-links" ref={listRef}>
            {pill && <span className="nav-pill" style={{ transform: `translateX(${pill.left}px)`, width: pill.width }} />}
            {NAV.map((n) => (
              <a
                key={n.id}
                href={`#${n.id}`}
                ref={(el) => {
                  links.current[n.id] = el;
                }}
                onClick={go(n.id)}
                className={active === n.id ? "is-active" : ""}
                aria-current={active === n.id ? "true" : undefined}
              >
                {n.label}
              </a>
            ))}
          </nav>
          <button className="nav-menu" onClick={() => setOpen(true)} aria-expanded={open} aria-controls="menu">
            Menu
          </button>
        </div>
      </header>
      <div id="menu" className={`menu ${open ? "is-open" : ""}`} role="dialog" aria-modal="true" aria-label="Menu" inert={!open}>
        <button className="menu-close" onClick={() => setOpen(false)}>
          Close
        </button>
        <ol>
          {NAV.map((n, i) => (
            <li key={n.id} style={{ "--i": i } as React.CSSProperties}>
              <a href={`#${n.id}`} onClick={go(n.id)}>
                <span className="mono">{String(i + 1).padStart(2, "0")}</span>
                {n.label}
              </a>
            </li>
          ))}
        </ol>
        <a className="menu-mail" href={`mailto:${PROFILE.email}`}>
          {PROFILE.email}
        </a>
      </div>
      <style>{`
        .nav-progress { position: fixed; inset: 0 0 auto; height: 2px; z-index: 60; pointer-events: none; }
        .nav-progress > div { height: 100%; background: linear-gradient(90deg, var(--accent), var(--accent-2)); transform-origin: 0 50%; transform: scaleX(0); }
        .nav { position: fixed; inset: 10px 0 auto; z-index: 50; pointer-events: none; }
        .nav-inner { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
        .nav-brand { pointer-events: auto; display: flex; align-items: center; gap: 12px; }
        .nav-mark { width: 42px; height: 42px; border-radius: 50%; display: grid; place-items: center; font-size: 13px; font-weight: 600;
          box-shadow: inset 0 0 0 1.5px var(--ink); font-family: var(--font-mono); transition: background .5s var(--ease), color .5s var(--ease), transform .8s var(--ease); }
        .nav-brand:hover .nav-mark { transform: rotate(360deg); }
        .nav.is-scrolled .nav-mark { background: var(--accent); color: var(--on-accent); box-shadow: inset 0 -3px 0 rgba(0,0,0,.3); }
        .nav-name { font-weight: 600; letter-spacing: -.02em; transition: opacity .4s var(--ease), transform .4s var(--ease); }
        .nav.is-scrolled .nav-name { opacity: 0; transform: translateX(-6px); pointer-events: none; }
        .nav-links { pointer-events: auto; position: relative; display: flex; gap: 2px; padding: 5px; border-radius: 999px;
          transition: background .5s var(--ease), box-shadow .5s var(--ease); }
        .nav.is-scrolled .nav-links { background: rgba(29,19,17,.82); backdrop-filter: blur(12px); -webkit-backdrop-filter: blur(12px);
          box-shadow: inset 0 0 0 1px var(--line), 0 4px 0 var(--soft); border-radius: var(--r-btn); }
        .nav-links a { position: relative; z-index: 1; padding: 9px 16px; border-radius: 10px; font-size: 14px; color: var(--ink-2); transition: color .4s var(--ease); }
        .nav-links a:hover { color: var(--ink); }
        .nav-links a.is-active { color: var(--on-accent); }
        .nav-pill { position: absolute; top: 5px; bottom: 5px; left: 0; border-radius: 10px; background: var(--accent); box-shadow: inset 0 -2px 0 rgba(0,0,0,.3);
          transition: transform .55s var(--ease), width .55s var(--ease); }
        .nav-menu { display: none; pointer-events: auto; height: 42px; padding: 0 18px; border-radius: var(--r-btn); font-size: 14px; font-weight: 600;
          background: rgba(29,19,17,.85); backdrop-filter: blur(12px); box-shadow: inset 0 0 0 1px var(--line), 0 3px 0 var(--soft); }
        .menu { position: fixed; inset: 0; z-index: 70; background: var(--paper); padding: 88px var(--gutter) 32px; display: flex; flex-direction: column;
          clip-path: circle(0% at calc(100% - 50px) 32px); visibility: hidden;
          transition: clip-path .8s var(--ease), visibility 0s linear .8s; }
        .menu.is-open { clip-path: circle(150% at calc(100% - 50px) 32px); visibility: visible; transition: clip-path .8s var(--ease); }
        .menu-close { position: absolute; top: 10px; right: var(--gutter); height: 42px; padding: 0 18px; border-radius: var(--r-btn);
          background: var(--accent); color: var(--on-accent); font-size: 14px; font-weight: 600; box-shadow: inset 0 -3px 0 rgba(0,0,0,.3); }
        .menu ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
        .menu li { opacity: 0; transform: translateY(20px); transition: opacity .7s var(--ease), transform .7s var(--ease);
          transition-delay: calc(150ms + var(--i) * 60ms); }
        .menu.is-open li { opacity: 1; transform: none; }
        .menu li a { display: flex; align-items: baseline; gap: 14px; font-family: var(--font-serif); font-size: clamp(40px, 12vw, 64px); font-weight: 600; letter-spacing: -.03em; line-height: 1.1; }
        .menu li a:active, .menu li a:hover { color: var(--accent-2); }
        .menu li .mono { font-size: 12px; color: var(--mute); letter-spacing: 0; font-weight: 400; }
        .menu-mail { margin-top: auto; color: var(--mute); text-decoration: underline; text-underline-offset: 4px; }
        @media (max-width: 860px) {
          .nav-links { display: none; }
          .nav-menu { display: block; }
        }
      `}</style>
    </>
  );
}
