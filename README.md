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

The loop uses two clips stacked on top of each other:

- `public/workstation.mp4`, the original
- `public/workstation-reverse.mp4`, a pre-rendered reverse of it

When one ends the other starts from zero and takes over the stage. Because the reverse clip's first frame is
the forward clip's last frame, the swap lands on an identical image and reads as one continuous back-and-forth
loop. Nothing seeks backwards, which is what makes it smooth.

Two things keep it cheap: an `IntersectionObserver` pauses playback whenever the section is off screen, and
`prefers-reduced-motion` freezes the forward clip on a single frame. The reverse clip is only fetched once the
section is actually scrolled to, so the initial page load pays for one file rather than two.

Moving the mouse across the stage drives a spotlight that follows the cursor. Enough cursor movement makes
the little round operator in the corner turn red and complain.

To swap the clip, replace both files. They must be the same length and dimensions, and the second must be a
true reverse of the first, or the handoff will visibly jump.

## Design system

- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (accents), self-hosted via Fontsource
- Accent: cyan `#22d3ee` with violet gradient highlights on near-black `#05070d`
- Scroll reveal via a small IntersectionObserver component (`components/Reveal.tsx`), respects `prefers-reduced-motion`

## Deploy

See [DEPLOY.md](DEPLOY.md).
