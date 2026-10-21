# Product overview

## What this is

A personal job-application agent. Once a day it scans remote roles on boards you care about, decides which ones you actually fit, drafts application answers from your resume and profile, and puts them in an inbox. Nothing is submitted until you approve it.

This is a production agent: it loads written skills, emits structured decisions with evidence, critiques its own drafts, and escalates when it cannot answer honestly. It is not a one-shot prompt over a job description.

v1 is single-user. The same Docker stack runs on a laptop and on a DigitalOcean VPS. The dashboard is the seed of a later multi-user web app.

## Who it is for

You: someone who wants to apply to remote roles they genuinely fit, without spraying generic applications, and without inventing experience to fill a form.

## Daily loop

1. Worker wakes on a schedule (or `pnpm worker run-once`).
2. For each enabled company, fetch that source’s public job list (`getSource(company.source)`). v1 only implements Ashby.
3. Upsert postings. Skip anything already seen, already applied, or failing hard filters (not remote, excluded titles, wrong employment type).
4. Match agent scores remaining jobs against the profile and resume, citing evidence.
5. Jobs that clear the inbox threshold get their public apply form extracted (Playwright).
6. Draft agent tags each field with a playbook concept, then answers the **verbatim form prompt** for every extracted field, then a critique pass rejects fabrications.
7. Status becomes `pending_approval`. Telegram fires if the inbox is non-empty.
8. You review in the dashboard: edit answers, approve, or skip.
9. On approve, Playwright submits the public apply form. Result is recorded.

## Success metrics

| Metric | v1 bar |
| --- | --- |
| Match precision | You should rarely see an inbox item you would never apply to. Prefer missing a maybe over promoting a no. |
| Draft edit-rate | Identity and logistics fields should usually ship unchanged. Cover letters and “why us” may need light edits; they must not need a rewrite from scratch. |
| Fabrication | Zero invented employers, titles, dates, metrics, or skills in any submitted or pending draft. |
| Escalation | Required fields the profile cannot answer must be flagged, not filled with plausible fiction. |
| Dedup | Never draft or submit the same `(source, sourceJobId)` twice. |
| Ops | A local `run-once` and a VPS cron run produce the same kinds of inbox items from the same profile. |

## Non-goals (v1)

- Cloudflare Workers, D1, R2, Queues, or Browser Run
- Multi-user accounts, billing, or public signup
- Greenhouse, Lever, LinkedIn, or other ATS **adapters** (the concept/widget layers already assume they will exist; see `docs/prd/sources.md`)
- Fully automatic submit without approval
- Using Certificate Transparency as the only Ashby customer directory (most `*.ashbyhq.com` names are Ashby’s own hosts; customer boards are verified on the posting API)
- Redis / BullMQ unless a single worker cannot keep up

## What “good” looks like in the inbox

Each pending item is a review packet, not a blob of model text:

- Why this job (score, decision, evidence from the resume, gaps)
- Confidence and escalate flags
- Per-field drafted answers you can edit
- Link to the live posting

Long answers must follow `agent/skills/wording/`. Question concepts: `agent/skills/classify-questions/`. Widgets: `agent/skills/fill-widgets/`. Source adapters: `docs/prd/sources.md`.

If the packet cannot explain the fit in resume-grounded bullets, it does not belong in the inbox.
