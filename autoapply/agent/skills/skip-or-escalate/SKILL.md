---
name: skip-or-escalate
description: >-
  After match or draft, skip the job or keep it in inbox with flags. Covers
  visa vs posting, fake-remote JDs, export control, unanswerable required
  fields, bot checks, and poisoned drafts.
---

# Skip or escalate

## When to use

After match (JD logistics the hard filter missed) and after draft (empty required fields, critique).

Pick **one**: skip the job, or inbox with flags. Never both. Source-agnostic: a required unknown on Greenhouse is the same as on Ashby.

## Skip the job

- Sponsorship required by the candidate vs posting “cannot sponsor”
- Authorized-to-work contradiction
- Export control / citizenship requirement the profile doesn't meet
- On-site or hybrid office days vs `remoteOnly` (including “Remote” tag with HQ days in the JD)
- Seniority two+ bands above profile (mid/junior vs Senior/Staff/Principal)
- Required years above `profile.maxRoleYears` when that cap is set
- Required domain never on the resume PDF or master profile markdown
- Form extract failed after retry
- Critique found **two or more** fabrication violations
- Required `bot_check` (human may still apply in the browser; v1 does not solve puzzles — inbox + flag if the match is strong, else skip)

## Inbox with flags

- Required salary empty
- Required notice/start empty
- Cover letter / why-company low confidence
- Unknown required **SDK / take-home URL** we don't have
- Optional EEO left blank (not a skip)
- Education required but profile.education empty
- Select option couldn't be mapped honestly
- Required `bot_check` / puzzle
- Required `other_file`
- One tool gap, strong match

## Must not

- Skip only because a cover letter needs a human edit
- Skip because compensation is unpublished
- Skip only for timezone / working-hours overlap when `timezoneFlexible` is true. Residency (“must live in the US”) is still a skip.
- Answer `No` to sponsorship to pass a screen when `requiresSponsorship` is true
- Hide skip reasons
