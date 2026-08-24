"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Reveal from "./Reveal";

/** Things the little operator says when you wave your cursor around his desk. */
const QUIPS = [
  "Hey. I'm deploying here.",
  "Touch that cursor again. I dare you.",
  "That's my build you're wiggling.",
  "Do you mind? Production is live.",
  "Every jiggle is one more bug.",
  "I saw that.",
  "Ctrl+Z will not save you.",
  "Some of us are shipping.",
];

export default function Workstation() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const forwardRef = useRef<HTMLVideoElement>(null);
  const reverseRef = useRef<HTMLVideoElement>(null);
  const activeRef = useRef<"forward" | "reverse">("forward");

  const [active, setActive] = useState<"forward" | "reverse">("forward");
  const [quip, setQuip] = useState<string | null>(null);
  const [annoyed, setAnnoyed] = useState(false);

  const travel = useRef(0);
  const lastPos = useRef<{ x: number; y: number } | null>(null);
  const lastQuipAt = useRef(0);
  const quipTimer = useRef<number | null>(null);

  /* ── Ping-pong playback ─────────────────────────────────────────────────────
     Two clips: the original, and a pre-rendered reverse of it. When one ends the
     other starts from zero and takes over the stage. The reverse clip's first
     frame is the forward clip's last frame, so the swap lands on an identical
     image and reads as one continuous loop. No backward seeking involved.      */
  useEffect(() => {
    const fwd = forwardRef.current;
    const rev = reverseRef.current;
    const section = sectionRef.current;
    if (!fwd || !rev || !section) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Hold a single frame instead of animating. Wait for metadata, or the seek is a no-op.
      const hold = () => {
        fwd.currentTime = 0.2;
      };
      if (fwd.readyState >= 1) hold();
      else fwd.addEventListener("loadedmetadata", hold, { once: true });
      return () => fwd.removeEventListener("loadedmetadata", hold);
    }

    let primed = false;
    const current = () => (activeRef.current === "forward" ? fwd : rev);
    const other = () => (activeRef.current === "forward" ? rev : fwd);

    const handoff = (e: Event) => {
      // Ignore an 'ended' from the clip that is not on stage.
      if (e.target !== current()) return;
      const next = other();
      next.currentTime = 0;
      void next.play().catch(() => {});
      activeRef.current = activeRef.current === "forward" ? "reverse" : "forward";
      setActive(activeRef.current);
    };

    fwd.addEventListener("ended", handoff);
    rev.addEventListener("ended", handoff);

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          // Only start fetching the reverse clip once the section is actually reached,
          // so the initial page load does not pay for both files.
          if (!primed) {
            primed = true;
            rev.preload = "auto";
            rev.load();
          }
          void current().play().catch(() => {});
        } else {
          fwd.pause();
          rev.pause();
        }
      },
      { threshold: 0.25 }
    );
    io.observe(section);

    return () => {
      fwd.removeEventListener("ended", handoff);
      rev.removeEventListener("ended", handoff);
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    return () => {
      if (quipTimer.current) window.clearTimeout(quipTimer.current);
    };
  }, []);

  /* ── Cursor tracking: spotlight follows the pointer, and enough wiggling annoys him ── */
  const onPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const stage = stageRef.current;
    if (!stage) return;

    const rect = stage.getBoundingClientRect();
    stage.style.setProperty("--mx", `${((e.clientX - rect.left) / rect.width) * 100}%`);
    stage.style.setProperty("--my", `${((e.clientY - rect.top) / rect.height) * 100}%`);

    const prev = lastPos.current;
    if (prev) travel.current += Math.hypot(e.clientX - prev.x, e.clientY - prev.y);
    lastPos.current = { x: e.clientX, y: e.clientY };

    const now = Date.now();
    if (travel.current > 850 && now - lastQuipAt.current > 4200) {
      travel.current = 0;
      lastQuipAt.current = now;
      setQuip(QUIPS[Math.floor(Math.random() * QUIPS.length)]);
      setAnnoyed(true);
      if (quipTimer.current) window.clearTimeout(quipTimer.current);
      quipTimer.current = window.setTimeout(() => {
        setQuip(null);
        setAnnoyed(false);
      }, 2600);
    }
  }, []);

  const onPointerLeave = useCallback(() => {
    lastPos.current = null;
    travel.current = 0;
  }, []);

  return (
    <section id="studio" ref={sectionRef} className="scroll-mt-20 relative overflow-hidden py-24 sm:py-28">
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[520px] w-[900px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent/[0.07] blur-[150px]" />

      <div className="relative mx-auto max-w-6xl px-5 sm:px-8">
        <Reveal>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="section-kicker">The workshop</p>
              <h2 className="font-display mt-3 max-w-xl text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Where the systems actually get <span className="text-gradient">built.</span>
              </h2>
            </div>
            <p className="max-w-sm text-sm leading-relaxed text-slate-400">
              Long hours, tight feedback loops and a build that has to stay green. Move your cursor across the desk if
              you want to interrupt him.
            </p>
          </div>
        </Reveal>

        {/* ── The stage ─────────────────────────────────────── */}
        <Reveal delay={120}>
          <div
            ref={stageRef}
            onPointerMove={onPointerMove}
            onPointerLeave={onPointerLeave}
            className="stage group relative mt-12 aspect-video w-full overflow-hidden rounded-[1.75rem] border border-white/10 bg-base-950"
          >
            <video
              ref={forwardRef}
              src="/workstation.mp4"
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
              controls={false}
              controlsList="nodownload noplaybackrate noremoteplayback"
              aria-hidden
              className={`stage-video pointer-events-none absolute inset-0 h-full w-full object-cover ${
                active === "forward" ? "opacity-100" : "opacity-0"
              }`}
            />
            <video
              ref={reverseRef}
              src="/workstation-reverse.mp4"
              muted
              playsInline
              preload="none"
              disablePictureInPicture
              controls={false}
              controlsList="nodownload noplaybackrate noremoteplayback"
              aria-hidden
              className={`stage-video pointer-events-none absolute inset-0 h-full w-full object-cover ${
                active === "reverse" ? "opacity-100" : "opacity-0"
              }`}
            />

            {/* cursor spotlight */}
            <div className="stage-spotlight pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover:opacity-100" />

            {/* vignette + scanlines keep it reading as a designed surface, not a player */}
            <div className="stage-vignette pointer-events-none absolute inset-0" />
            <div className="stage-scan pointer-events-none absolute inset-0 opacity-[0.055]" />

            {/* HUD corners */}
            <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-5 sm:p-6">
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-base-950/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 backdrop-blur-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                build passing
              </span>
              <span className="hidden rounded-full border border-white/10 bg-base-950/60 px-3 py-1.5 font-mono text-[10px] uppercase tracking-[0.2em] text-slate-400 backdrop-blur-sm sm:inline-block">
                uptime 99.9%
              </span>
            </div>

            {/* the little operator + his complaints */}
            <div className="pointer-events-none absolute bottom-5 left-5 flex items-end gap-3 sm:bottom-6 sm:left-6">
              <Operator annoyed={annoyed} />
              <div
                className={`quip max-w-[15rem] rounded-2xl rounded-bl-sm border border-white/12 bg-base-950/85 px-3.5 py-2 text-xs leading-snug text-slate-200 backdrop-blur-md transition-all duration-300 ${
                  quip ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-1.5 opacity-0"
                }`}
                role="status"
                aria-live="polite"
              >
                {quip ?? ""}
              </div>
            </div>
          </div>
        </Reveal>

        {/* reflection */}
        <div className="stage-reflection pointer-events-none mx-auto -mt-px h-24 w-[92%] rounded-b-[1.75rem]" />
      </div>
    </section>
  );
}

/** Tiny round operator. No face to speak of, just eyes and a mood. */
function Operator({ annoyed }: { annoyed: boolean }) {
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0 drop-shadow-lg" aria-hidden>
      <circle cx="22" cy="22" r="20" fill="#0b1120" stroke="rgba(255,255,255,0.16)" strokeWidth="1.5" />
      <circle cx="22" cy="22" r="20" fill="url(#opGlow)" opacity="0.55" />
      {annoyed ? (
        <>
          {/* angry eyebrows */}
          <path d="M12 16.5 19 19M32 16.5 25 19" stroke="#f87171" strokeWidth="2" strokeLinecap="round" />
          <circle cx="16" cy="23" r="2.1" fill="#f87171" />
          <circle cx="28" cy="23" r="2.1" fill="#f87171" />
          {/* frown */}
          <path d="M16.5 31c1.8-2.2 9.2-2.2 11 0" stroke="#f87171" strokeWidth="1.9" strokeLinecap="round" fill="none" />
        </>
      ) : (
        <>
          <circle cx="16.5" cy="21" r="2.1" fill="#22d3ee" />
          <circle cx="27.5" cy="21" r="2.1" fill="#22d3ee" />
          {/* calm, faintly pleased */}
          <path d="M17 28.5c1.6 1.9 8.4 1.9 10 0" stroke="#22d3ee" strokeWidth="1.9" strokeLinecap="round" fill="none" />
        </>
      )}
      <defs>
        <radialGradient id="opGlow" cx="50%" cy="30%" r="70%">
          <stop offset="0%" stopColor={annoyed ? "#7f1d1d" : "#0e7490"} />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>
    </svg>
  );
}
