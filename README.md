# Natnael Tadele: personal site

Live at https://natnael.website. A dark portfolio (Lava colours: charcoal, oxblood, ember; Earth components: pressed-clay buttons, layered cards, Fraunces serif) built around a talking 3D intro video.

## Run it

```bash
npm install
npm run dev      # http://localhost:3000
npm run build    # production build; must pass before pushing to main
```

Stack: Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS 4, Lenis for smooth scrolling. No other animation libraries; motion is CSS, IntersectionObserver and small `requestAnimationFrame` loops. Fonts (Work Sans, Fraunces, JetBrains Mono) are self-hosted from `src/fonts`.

## Editing content

All text lives in **`src/lib/data.ts`**: profile, skills, projects, proof numbers, the timeline and reviews. Components only read from it. Every line traces back to `public/Natnael_Tadele_Resume.pdf` or the Upwork contract record; keep it that way.

## Sections

| # | Section | File | What it does |
| --- | --- | --- | --- |
| – | Hero | `src/components/hero/Hero.tsx` | Talking video, current role, and the Upwork card (Top Rated Plus, 5.0, 100% JSS, 2,200+ hrs) above the fold |
| 01 | Client reviews | `sections/Words.tsx` | Upwork reviews, verbatim, as short cards; long ones fold |
| 02 | Impact | `sections/Proof.tsx` | Engineering results in a plain grid that counts up once |
| 03 | Work | `sections/Work.tsx` | Expanding accordion; each project has a grayscale mock labelled *Illustrative UI* |
| 04 | Stack | `sections/Stack.tsx` | Skills as logo chips, one row per area, strongest areas first |
| 05 | Path | `sections/Path.tsx` | Education and work on one timeline that draws as you scroll |
| 06 | Contact | `sections/Contact.tsx` | Email with copy button, links, footer |

## Rebuilding the hero video

The intro clip is turned into `public/hero/hero.{webm,mp4}` and `public/og.jpg` by a script (needs ffmpeg and Python 3):

```bash
python3 scripts/build-hero-assets.py path/to/intro.mp4 public/hero
mv public/hero/og.jpg public/og.jpg
python3 scripts/build-dark-hero.py public/hero
```

`build-dark-hero.py` cuts the character out of the white backdrop frame by frame: `hero-alpha.webm` (transparent VP9, used by Chrome, Edge, Firefox and Android) and `hero-dark.mp4` (the same frames on the page colour, used by Safari and every iOS browser, which ignore WebM transparency). Only white connected to the frame edge is removed, so the white T-shirt stays solid; the page fades the clip out just above the white sneakers, which blend into the white floor.

It crops tightly around the character (`--crop W:H:X:Y`, default fits the current 1344×768 clip), lifts the light-grey backdrop to pure white so `mix-blend-mode: multiply` hides it, and makes the loop seamless. The voice runs edge to edge in the source, so instead of cross-fading speech into speech it plays the line once, then dissolves back to the first frame over 0.6 s of silence. Lips are never retimed.

## Rolling back

The previous dark design is commit `402133b` on `main`. To go back after this ships, revert the merge on `main` (`git revert -m 1 <merge commit>`), or in Vercel promote the last deployment built from `402133b`.

## Credits and licences

- Technology logos in `public/logos`: [Devicon](https://devicon.dev) (MIT, `LICENSE-devicon`) and [Simple Icons](https://simpleicons.org) (CC0, `LICENSE-simple-icons.md`). Brand names and logos belong to their owners.
- Fonts: Work Sans, Fraunces and JetBrains Mono, all under the SIL Open Font License, via Fontsource.
