# Dashboard and operations

## Auth

v1 is single-user. Gate every HTML and API route (except `/health`) with `DASHBOARD_PASSWORD`. Session cookie after POST login. No public signup.

## Screens

### Inbox (home)

List `pending_approval` items, newest first, score descending within a day.

Each row: company, title, score, confidence, escalate flag count, fetched date. Click opens the review packet:

- Job link (new tab)
- Match summary, evidence, gaps
- Editable answers, each labeled with the **form prompt** (not the concept id)
- Flags called out in yellow/red if required
- Actions: **Save**, **Refill**, **Approve**, **Skip**. Refill re-opens the live form and rewrites answers from the résumé and profile. Use it when a pending draft has empty or wrong fields.

Approve is disabled until required flagged fields are either filled by the human or explicitly acknowledged if still empty (v1: disable approve while required flags remain and value is empty).

### History

Submitted, skipped, rejected, failed — with timestamps and error text.

### Profile

Name, email, phone, location, LinkedIn/GitHub/portfolio, target titles, exclude keywords, employment types, work authorization, salary band (optional), notice period, canned answers. Resume upload (PDF) stored under `./data/uploads`.

### Companies

List of `source` + slug, enabled toggle, last fetch time, last error. Add by URL or slug. v1 source is `ashby`.

### Runs

Last worker run: started/finished, boards fetched, jobs upserted, matched, drafted, errors.

## Local vs VPS

| | Local | VPS |
| --- | --- | --- |
| Start | `docker compose up` | same compose |
| UI | `http://localhost:3000` | bind to tailnet/HTTPS via Caddy/nginx |
| Scan | cron inside worker, or `pnpm worker run-once` | same |
| State | `./data` bind mount | `./data` on the droplet |
| Secrets | `.env` | `.env` on the droplet, not in git |

## Secrets and files that must not be committed

- `.env` (`DASHBOARD_PASSWORD`, `VERTEX_PROJECT`, `GOOGLE_APPLICATION_CREDENTIALS`, `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`)
- `./data/` (SQLite, uploads, screenshots, logs)
- Resume PDF

## Worker ops

- Cron expression from `CRON_SCHEDULE` (default `0 8 * * *` UTC)
- `pnpm worker run-once` runs ingest → match → draft once and exits
- Telegram: if `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` are set, send a short count + dashboard reminder when new `pending_approval` items appear after a run
- Playwright headed optional via `PWDEBUG`; default headless in Docker

## Logging

Structured logs: run id, slug, job id, stage, duration, error. Persist a `runs` row per execution. Do not log resume contents or full application answers at info level.
