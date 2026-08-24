# natnael.dev — Personal Brand Site

Dark, premium portfolio for **Natnael Tadele Denbi** — Senior Full-Stack & AI Engineer.
Built with **Next.js 14 (App Router) + TypeScript + Tailwind CSS**, self-hosted fonts, zero heavy dependencies.

## Run locally

```bash
npm install
npm run dev        # http://localhost:3000
```

## Deploy to Vercel (replaces your current site)

1. Push this folder to a GitHub repo (e.g. `natnael-portfolio`):
   ```bash
   git init && git add -A && git commit -m "New personal brand site"
   git remote add origin https://github.com/Natnael16/natnael-portfolio.git
   git push -u origin main
   ```
2. In [vercel.com](https://vercel.com) → **Add New Project** → import the repo → Deploy (no config needed).
3. To keep your existing URL, point the old Vercel project's domain to this project, or replace the old repo's contents with this one.

## Editing content

**All text, stats, projects and links live in one file: [`lib/data.ts`](lib/data.ts).**
Update numbers there (hours, users, new projects) and the whole site updates — no component edits needed.

Other notable files:

- `app/layout.tsx` — SEO metadata (title, description, Open Graph)
- `app/globals.css` — design tokens, reveal animation, panel styles
- `public/Natnael_Tadele_Resume.pdf` — the downloadable résumé (replace when you update it)

## Design system

- Fonts: Space Grotesk (display), Inter (body), JetBrains Mono (accents) — self-hosted via Fontsource
- Accent: cyan `#22d3ee` with violet gradient highlights on near-black `#05070d`
- Scroll-reveal via a tiny IntersectionObserver hook (`components/Reveal.tsx`), respects `prefers-reduced-motion`
