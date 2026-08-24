# natnael.dev, personal brand site

Dark, premium portfolio for **Natnael Tadele Denbi**, Senior Full-Stack & AI Engineer.
Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**, self-hosted fonts, zero heavy dependencies.

## Run locally

```bash
npm install
npm run dev
```

Then open http://localhost:3000

## Editing content

**All text, stats, projects and links live in one file: [`lib/data.ts`](lib/data.ts).**
Update numbers there (hours, users, new projects) and the whole site updates, with no component edits needed.

Other notable files:

- `app/layout.tsx` sets SEO metadata (title, description, Open Graph)
- `app/globals.css` holds design tokens, the reveal animation, panel and stage styles
- `public/Natnael_Tadele_Resume.pdf` is the downloadable résumé (replace when you update it)
- `public/workstation.mp4` is the 8 second clip behind the Workshop section

## The Workshop section

`components/Workstation.tsx` renders `public/workstation.mp4` as a design element rather than a video player:
no controls, no picture-in-picture, and `pointer-events-none` on the video itself.

It plays forward to the last frame, then steps backward to the start and plays forward again, so the loop
never visibly jumps. Reverse playback is driven by `requestAnimationFrame` seeking `currentTime` backwards
at 30fps, since the clip is not pre-rendered as a boomerang.

Two things keep it cheap: an `IntersectionObserver` pauses playback whenever the section is off screen, and
`prefers-reduced-motion` freezes the clip on a single frame.

Moving the mouse across the stage drives a spotlight that follows the cursor. Enough cursor movement makes
the little round operator in the corner turn red and complain.

To swap the clip, drop a new file at `public/workstation.mp4`. Keep it short (roughly 6 to 10 seconds) and
make sure the first and last frames differ, otherwise the reversal is not noticeable.

## Design system

- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (accents), self-hosted via Fontsource
- Accent: cyan `#22d3ee` with violet gradient highlights on near-black `#05070d`
- Scroll reveal via a small IntersectionObserver component (`components/Reveal.tsx`), respects `prefers-reduced-motion`

## Deploy

See [DEPLOY.md](DEPLOY.md).
