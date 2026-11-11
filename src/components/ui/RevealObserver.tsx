"use client";

import { useEffect } from "react";

/** Adds .is-in to every .rv / .rv-mask the first time it enters the viewport. */
export function RevealObserver() {
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-in");
          io.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.05 },
    );
    const watch = () => document.querySelectorAll(".rv:not(.is-in), .rv-mask:not(.is-in)").forEach((el) => io.observe(el));
    watch();
    // Sections that render later (filters, accordions) add reveal targets after mount.
    const mo = new MutationObserver(watch);
    mo.observe(document.body, { childList: true, subtree: true });
    return () => {
      io.disconnect();
      mo.disconnect();
    };
  }, []);
  return null;
}
