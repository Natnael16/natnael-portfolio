# Autoapply

Personal apply agent. Scans remote jobs from registered boards, matches them to your resume with evidence, drafts form answers from written skills, and waits for you to approve before anything is submitted.

v1 lists Ashby-hosted boards. Matching, question concepts, and drafting are source-agnostic (`docs/prd/sources.md`) so another ATS is an adapter, not a skill rewrite.

Same Docker stack locally and on a DigitalOcean VPS.

## Prerequisites

- Node 22+
- Docker (for Playwright-in-container and VPS)
- A Google Cloud project with Vertex AI enabled, plus Application Default Credentials (not a Google AI Studio key)

## Local (without Docker)

```bash
cp .env.example .env
# set DASHBOARD_PASSWORD and VERTEX_PROJECT
# gcloud auth application-default login
npm install
npx playwright install chromium
npm run dev
```

Dashboard: [http://localhost:3000](http://localhost:3000) (Vite on 5173 proxies `/api` and auth to the server).

One-shot scan:

```bash
npm run worker:once
```

## Docker (local or VPS)

Put a Vertex service-account JSON key at `secrets/vertex.json` (gitignored). Inside the container it is read as `GOOGLE_APPLICATION_CREDENTIALS`.

```bash
cp .env.example .env
mkdir -p secrets
# copy your Vertex service-account key to secrets/vertex.json
docker compose up --build
```

- Web: `http://localhost:3000`
- Worker: cron from `CRON_SCHEDULE` (default 08:00 UTC) plus the same pipeline as `worker:once`

On a VPS, point Caddy/nginx at port 3000, keep `.env` and `./data` on the machine, never in git.

## First-run checklist

1. Sign in with `DASHBOARD_PASSWORD`
2. Fill **Profile** and upload a PDF resume
3. Enable **Companies** (seed slugs ship disabled-until-seeded on first boot)
4. Run a scan (`worker:once` or wait for cron)
5. Review **Inbox**, edit answers, approve or skip

## Layout

- `docs/prd/` — product spec
- `agent/skills/` — runtime procedures the worker loads
- `agent/evals/` — golden match/draft cases
- `src/agent/` — skill loader, model client, match/draft/critique
- `src/sources/ashby.ts` — public posting API + Playwright apply
