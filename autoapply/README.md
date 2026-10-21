# Autoapply

Personal apply agent. Every few hours it pulls fresh remote roles from company careers boards, remote job boards and LinkedIn, throws out scams and roles you cannot be hired for from where you live, scores the rest against your resume with evidence, and then either:

- **drafts and submits the application** (Ashby boards, after your approval or in the auto-apply band), or
- **sends you the link to apply yourself** (everything else), in one Telegram message per scan and in the dashboard's **Apply yourself** list.

The candidate is set up for Natnael Tadele: `candidate/resume.pdf` and `candidate/Natnael_Tadele_Master_Profile.md` are the only sources the agent may cite, and a fresh database seeds the matching profile (senior full-stack, remote, hireable from Worldwide / EMEA / Africa / Ethiopia).

## Where jobs come from

| Source | How | What happens on a match |
| --- | --- | --- |
| **Ashby** company boards | Public posting API, thousands of boards found by discovery | Drafted, then submitted by the agent (approval at 90+, auto-apply band 50–89) |
| **Greenhouse** company boards | Public Job Board API | Apply yourself (Greenhouse's apply API needs the employer's key) |
| **Lever** company boards | Public Postings API | Apply yourself (same reason) |
| **Remotive**, **We Work Remotely**, **Himalayas**, **Jobicy**, **RemoteOK** | Their public APIs / RSS, one read per scan | Apply yourself |
| **LinkedIn** | Logged-out public job search, small and slow (see below) | Apply yourself |

When a remote board or LinkedIn posting applies through Ashby, Greenhouse or Lever, that company's board is registered automatically, so later scans read it straight from the source. An Ashby role found on LinkedIn therefore becomes one the agent can submit.

The same opening listed on several sites is handled once, keeping the best copy (board > curated feed > LinkedIn).

**Not included, on purpose:**

- **Indeed** blocks automated access, and its only workable route is a private mobile API. Most remote tech roles on Indeed are reposts of the boards above anyway.
- **Simplify** publishes internship and new-grad lists only, which do not fit a senior profile. Their Chrome extension still pairs well with the "Apply yourself" links for filling forms by hand.
- **LinkedIn Easy Apply automation** needs your logged-in account, which LinkedIn restricts for bots. LinkedIn here is read-only, logged out, and never submits anything. LinkedIn's terms do not allow automated collection, so the feed is kept small and slow (by default 6 searches of up to 2 pages, and at most 30 posting pages per scan, with a pause between requests). Remove `linkedin` from `FEEDS` if you would rather not use it.

## Filters (no model needed)

1. **Scam screen** (`src/lib/legitimacy.ts`): drops postings that ask you to move to Telegram/WhatsApp, pay for training or equipment, handle cheques or gift cards, email a personal Gmail recruiter, or promise "$500 a day, no experience". The rules match those asks, not topics, so a real job building a WhatsApp integration passes. Postings from open sites (LinkedIn) start with less trust than company boards.
2. **Where you can work from** (`src/lib/eligibility.ts`): "Remote" is not "anywhere". Postings limited to the US, Europe, the UK, LATAM and so on are skipped, from the location field and from sentences like "must reside in…" or "authorized to work in the U.S.". Timezone notes ("CET ± 3 hours") are not treated as residency. Edit **Profile → Regions you can work from** to change this.
3. **Fit**: title families, excluded keywords (whole words, so "intern" does not catch "Internal Tools"), seniority, the years the posting asks for, and employment type (full-time and contract).
4. **Freshness**: postings older than `JOB_MAX_AGE_DAYS` (default 7) are ignored.

Then the match agent (Gemini on Vertex AI) scores fit from the resume with evidence. Without Vertex configured, a keyword score is used instead and every match goes to **Apply yourself**, so notifications work with no Google Cloud account at all.

## Quick start (local)

```bash
cp .env.example .env
# set DASHBOARD_PASSWORD, and TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID for phone notifications
# optional: VERTEX_PROJECT + `gcloud auth application-default login` for drafting and auto-apply
npm install
npx playwright install chromium   # only needed for Ashby auto-apply
npm run dev
```

Dashboard: http://localhost:3000 (Vite on 5173 proxies `/api` to the server).

One scan right now:

```bash
npm run worker:once
```

Telegram setup: message [@BotFather](https://t.me/BotFather), `/newbot`, copy the token. Send your new bot any message, open `https://api.telegram.org/bot<token>/getUpdates`, and copy `chat.id`.

## Docker (local or a VPS)

Put a Vertex service-account JSON key at `secrets/vertex.json` (gitignored) if you use the model.

```bash
cp .env.example .env
docker compose up --build
```

- Web: http://localhost:3000
- Worker: runs on `CRON_SCHEDULE` (default every 6 hours in `.env.example`)

On a VPS, put Caddy or nginx in front of port 3000, and keep `.env`, `secrets/` and `./data` on the machine, never in git.

## First run

1. Sign in with `DASHBOARD_PASSWORD`
2. Check **Profile**: salary band, notice period and start date are deliberately empty or defaults; questions about them are flagged for you until you set them
3. **Runs → Run scan now**, or wait for the schedule
4. **Inbox**: open and apply to the **Apply yourself** list, then **Mark applied**; review drafted Ashby applications and approve, or **Start auto apply**

## Settings worth knowing

| Variable | Default | What it does |
| --- | --- | --- |
| `FEEDS` | all six | Which job feeds to read |
| `LINKEDIN_SEARCHES` / `LINKEDIN_LOCATIONS` | 3 phrases × Worldwide, EMEA | LinkedIn search phrases and locations |
| `LINKEDIN_MAX_DETAILS` | 30 | LinkedIn posting pages fetched per scan |
| `JOB_MAX_AGE_DAYS` | 7 | Ignore older postings |
| `AUTO_SUBMIT_AFTER_RUN` | false | Submit auto-apply-band Ashby matches without clicking Start auto apply |
| `ASHBY_DISCOVERY` | true | Crawl for new Ashby boards each scan (slow) |
| `LEGIT_MIN_SCORE` | 50 | Scam score cut-off |

## Development

```bash
npm test            # parsers, filters and an offline scan against a throwaway database
npm run typecheck
npm run eval:agent  # agent evals; model cases run when VERTEX_PROJECT is set
npm run build
```

## Layout

- `docs/prd/`: product spec
- `agent/skills/`: runtime procedures the worker loads
- `agent/evals/`: golden match/draft cases
- `candidate/`: resume PDF and master profile the agent may cite
- `src/agent/`: skill loader, model client, match/draft/critique
- `src/sources/`: Ashby (list + Playwright apply), Greenhouse, Lever, and `feeds/` for the cross-company feeds
- `src/lib/legitimacy.ts`, `src/lib/eligibility.ts`: the scam and location filters
- `src/pipeline/`: feeds → board ingest → filter/match/draft → notify → submit
