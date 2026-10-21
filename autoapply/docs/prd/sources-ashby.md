# Ashby source

v1’s only **adapter**. Question concepts and drafting are not Ashby-specific; they live in `docs/prd/sources.md` and `agent/skills/classify-questions/`.

## What Ashby is in this product

Companies host public boards at `https://jobs.ashbyhq.com/{slug}`. The slug is the last path segment (`linear`, `notion`, `ashby`). Most tenants are path slugs, not DNS. A smaller set uses `{company}.ashbyhq.com`; discovery harvests those hosts too and maps them to posting-api slugs. Certificate Transparency on `ashbyhq.com` is mostly Ashby’s own hosts (`api`, `jobs`, `developers`, `academy`).

This file is the **Layer 3** note for `src/sources/ashby.ts`. Do not copy builder types into classify/draft skills.

## Listing (required)

Unauthenticated public Job Postings API:

```
GET https://api.ashbyhq.com/posting-api/job-board/{slug}?includeCompensation=true
```

Normalize each listed job (`isListed` not false) into `NormalizedJob` with `source: "ashby"`.

Do not call employer-authenticated RPC (`applicationForm.submit`, `jobPosting.info` with Basic auth). Those keys belong to the hiring company.

## Company directory

- SQLite `companies.source` = `ashby` plus `slug`
- Dashboard: paste a `jobs.ashbyhq.com/{slug}` URL, a `{company}.ashbyhq.com` host, or a bare slug
- Seed file `data/ashby-boards.seed.json` so a fresh install is not empty
- Invalid / 404 boards: mark `lastError`; disable after repeated failures (e.g. 5 consecutive)

Discovery also harvests `{company}.ashbyhq.com` from DNS, Certificate Transparency, URLScan, and search. Most of those names are Ashby’s own product hosts (`academy`, `docs`, `trust`); leftover labels are verified on the posting API, and live hosts are fetched in case they redirect or embed a different path slug.

No CT-based discovery as the **primary** directory — tenants are still mostly path slugs on `jobs.ashbyhq.com`.

## Rate limits

- One board fetch at a time per worker (serial ingest) unless measured otherwise
- ≥ 400ms between board requests; backoff on 429 / 5xx
- Cache a board’s JSON for 12 hours in the jobs table via `fetchedAt`; do not refetch the same slug twice in one run
- Browser (Playwright) only for jobs that already passed match → inbox, and for approved submits

## Playwright apply

Public apply page is a candidate flow:

1. **Extract** (draft stage): open `applyUrl`, wait for the form, collect visible labels, input names, required flags, select options, file inputs. Emit `ApplyField` with a generic `inputKind` (`text`, `textarea`, `select`, `file`, …). Map Ashby builder types **here**, not in skills:

   | Ashby builder / API | `inputKind` |
   | --- | --- |
   | Short Answer `String` | `text` |
   | Long Unformatted `LongText` | `textarea` |
   | Email / Phone / URL / SocialLink | `text` |
   | Multiple Choice `ValueSelect` | `select` |
   | Checkboxes `MultiValueSelect` | `multiselect` or many `checkbox` |
   | Yes/No `Boolean` | `select` / `radio` / `checkbox` |
   | Date | `date` |
   | Number | `number` |
   | Resume `File` `_systemfield_resume` | `file` |
   | Location / EducationHistory | `other` |

   System paths (`_systemfield_name|_email|_resume`) are adapter hints only. Classify still uses the **label**.

2. **Submit** (after human approve): fill mapped answers, attach resume from `./data/uploads`, submit, record confirmation URL or error screenshot path.

Treat extract failures as `failed` with a reason, not as empty drafts. Conditional fields (visa type after sponsorship = Yes) may appear after fill — screenshot, fail, do not invent.

Resume upload max **50MB**; we only attach the stored PDF.

EEOC/GDPR often live in a **survey after** the main form; v1 only fills what Playwright sees on the apply page.

### Extract traps seen on live boards

- “Autofill from resume” is a helper file input, not the required Resume field.
- How-heard can be a row of checkboxes (Notion: LinkedIn, Glassdoor, Blog…) instead of one select.
- Some custom questions have UUID `name`s and poor labels; leave `unknown` rather than guessing.
- Cloudflare / empty DOM: retry once, then fail the extract (do not classify an empty form).
- Hosted board 404: some companies (Cursor) list jobs on the posting API at `jobs.ashbyhq.com/{slug}` but that hosted page returns “Page not found”. The live form is on their careers site (e.g. `cursor.com/careers/{title-slug}`). The adapter tries that next, saves the working URL, and skips the job if every apply URL is dead. Do not retry true not-found pages.

## Adapter contract

Same `JobSource` as every other source (`docs/prd/sources.md`). Register in `src/sources/registry.ts`.
