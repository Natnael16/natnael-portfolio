"use client";

import Lenis from "lenis";
import { useEffect } from "react";
import { prefersReducedMotion } from "./hooks";

let lenis: Lenis | null = null;

/** Smooth-scroll to a section id (or the top). Falls back to native scrolling. */
export function scrollToTarget(id: string | null) {
  const target = id ? document.getElementById(id) : 0;
  if (id && !target) return;
  if (lenis && target !== null) {
    lenis.scrollTo(target as HTMLElement | number, { offset: 0, duration: 1.4 });
  } else if (target) {
    (target as HTMLElement).scrollIntoView({ behavior: prefersReducedMotion() ? "auto" : "smooth" });
  } else {
    window.scrollTo({ top: 0, behavior: prefersReducedMotion() ? "auto" : "smooth" });
  }
}

export function setScrollLocked(locked: boolean) {
  if (locked) lenis?.stop();
  else lenis?.start();
  document.documentElement.style.overflow = locked ? "hidden" : "";
}

export function SmoothScroll() {
  useEffect(() => {
    if (prefersReducedMotion()) return;
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true });
    let frame = requestAnimationFrame(function raf(time) {
      lenis?.raf(time);
      frame = requestAnimationFrame(raf);
    });
    return () => {
      cancelAnimationFrame(frame);
      lenis?.destroy();
      lenis = null;
    };
  }, []);
  return null;
}
