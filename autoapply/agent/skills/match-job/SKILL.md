---
name: match-job
description: >-
  Decide whether a remote job posting belongs in the human inbox. Cites resume
  PDF and candidate/*.md evidence, names gaps, and outputs a structured score
  and skip/inbox decision. Use when scoring a normalized job against the
  candidate profile.
---

# Match job

## When to use

After hard filters have already dropped non-remote, excluded, and duplicate postings. You receive one job, one profile, the resume PDF text, and the full master profile markdown. You produce a structured match object.

## Inputs

- `profile`: target titles, skills, years, `maxRoleYears`, seniority band, domain, work auth, location, `timezoneFlexible`, exclude notes
- `resumePdf`: text of `candidate/resume.pdf`
- `masterProfile`: full `candidate/*.md` extended profile. Use this as the long source of truth, not only the short PDF.
- `job`: title, company, location, workplaceType, employmentType, description, compensation

## Must

- Argue fit from **this** profile, resume PDF, and master profile markdown only: employer, title, dates/years, stack, domain, outcomes that appear there
- Treat `profile.seniorityBand` and `profile.yearsExperience` as the candidate’s real level. Do not upgrade them
- Separate posting **must-haves** from **nice-to-haves**
- List gaps explicitly when a required skill or domain is missing
- Use score bands: 0–49 skip; **50–100 inbox** when there is resume/markdown evidence. A ~50% close match must not be skipped
- Prefer listing gaps over skipping a close skill match
- Read the **full description** for fake-remote (ATS says Remote, body requires HQ days), visa, clearance, travel, **required years**, **seniority words**

## Must not

- Invent experience, seniority, or tools not in the resume PDF or master profile markdown
- Match Senior / Staff / Principal / Distinguished roles when `seniorityBand` is `junior` or `mid`
- Match a posting whose required experience is above `maxRoleYears` (when set) or above about 3 years for a mid profile with ~2 years of work
- Treat keyword overlap as evidence without a real project or job behind it
- Send to inbox with an empty `evidence` array
- Override hard logistics contradictions (visa, on-site-only already filtered, “must live / reside / be based in X country or region” vs profile location)
- Skip **only** because the posting wants US, EU, or UK **hours / timezone overlap** when `timezoneFlexible` is true. The candidate can work any timezone, including US hours

## Timezone vs residency

These are different:

- **Hours / timezone** (“overlap PT”, “EU timezone”, “US working hours”, “based in an EU or equivalent timezone” as a hours question) → **not a skip** when `timezoneFlexible` is true. They can align with any timezone and have worked US hours
- **Must live or be authorized in a country/region** (“must reside in North America”, “US or Europe only”, “candidates based in the United States”) → **skip** if the profile location is not in that region

## Seniority and years

- `junior` / `mid` profile → skip Senior, Staff, Principal, Sr., Distinguished, Fellow titles and JDs written for that bar
- If `maxRoleYears` is set (this candidate: **3**), skip when the JD requires more than that (`4+ years`, `5+ years`, `at least 6 years`, `4-8 years`)
- `3+ years` or `2-3 years` can stay in play for a mid profile with ~2 years; still name the years gap
- Do not call the candidate senior, staff, or a tech lead

## Decision rules

- Seniority two or more bands above the profile → `skip`
- Core function mismatch (e.g. sales/recruiter vs IC engineer) → `skip`
- Required domain never present on the resume PDF **or** master profile markdown → `skip`
- Missing a satellite tool around a proven core → `inbox` with a gap
- Score >= `inboxThreshold` (default 50) with at least one evidence bullet → `inbox`. Do not skip a close (~50%) resume match
- Cannot tell and score below threshold → `skip`
- JD requires office days / travel / citizenship the profile lacks → `skip` even if `workplaceType` is Remote
- Required years above `maxRoleYears` → `skip`

## Output schema

```json
{
  "score": 0,
  "decision": "inbox",
  "confidence": "medium",
  "summary": "",
  "evidence": ["<PDF or markdown fact> → <posting need>"],
  "gaps": [],
  "skipReason": null
}
```

`decision` is `"inbox"` or `"skip"`. `confidence` is `"high"`, `"medium"`, or `"low"`. `skipReason` is a short string when skipping, otherwise `null`.

## Self-check

- [ ] If `inbox`, `evidence.length >= 1`
- [ ] Every evidence bullet is traceable to the resume PDF, master profile markdown, or dashboard profile
- [ ] Score matches the band table in the matching PRD
- [ ] Gaps are listed rather than hidden inside the summary
- [ ] Mid/junior profiles did not inbox a Senior/Staff/Principal seat
- [ ] Timezone-only constraints did not cause a skip when `timezoneFlexible` is true
