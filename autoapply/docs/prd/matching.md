# Matching quality bar

## Purpose

Decide, for each new remote posting, whether it belongs in the inbox or is skipped. Fit is argued from the profile and resume. A score without evidence is not a match. The match agent sees a `NormalizedJob`; it does not care which ATS listed it.

## Hard filters (no model)

Skip before the match agent runs when any of these hold:

- `workplaceType` is not `Remote` and `isRemote` is not true
- Employment type is outside the profile allow-list (default: `FullTime` only unless the profile says otherwise)
- Title matches an exclude keyword (e.g. “unpaid”, “sales”, role families you do not want)
- Title seniority is above the profile band (`junior`/`mid` vs Senior, Staff, Principal, Sr.)
- Posting required years are above `profile.maxRoleYears` when that cap is set (this candidate: 3)
- Title does not overlap the profile’s target titles or adjacent families (weak overlap can still go to the model; zero overlap + no shared skills → skip)
- Already applied, already skipped, or already pending for this `(source, sourceJobId)`

Hard filters exist to save browser time and model spend, not to make the final call on close fits.

## Who is a fit

A posting is an inbox candidate when:

1. The role’s core work matches work you have actually done (same or closely adjacent function: e.g. full-stack → backend is allowed if the resume shows it).
2. Required stack or domain in the posting is largely present on the resume, or the gaps are learnable tools around a proven core (Postgres around a strong backend, not “first ML research job” from a frontend-only resume).
3. Seniority is within one band of the profile. A `mid` profile does **not** inbox Senior/Staff/Principal seats. Junior applying to staff is a skip.
4. Required years on the posting are not above `maxRoleYears` (3 for this candidate).
5. Logistics in the profile do not contradict the posting (visa, **residency** restrictions, “US only” vs your work authorization). Timezone / working-hours overlap is **not** a contradiction when `timezoneFlexible` is true.

Nice-to-haves (a specific cloud, a bonus language) do not block inbox if must-haves are met.

## Evidence rules

Every inbox decision must include:

- **Evidence bullets** — each bullet names a resume fact (employer, title, years, stack, domain) that maps to a posting requirement.
- **Gaps** — required or strongly implied needs not on the resume. Gaps do not automatically skip; they must be visible.
- **Confidence** — `high` | `medium` | `low`. Low-confidence inbox items are allowed only when the role is adjacent and evidence is partial; they must be flagged.

Forbidden:

- Inferring unstated seniority (“they seem like a staff engineer”) without resume support
- Counting buzzword overlap as evidence (“mentions React” when the resume has a one-line mention from 2019 and the job is a React expert seat)
- Using the job description’s own adjectives as if they were your accomplishments

## Score meaning

Score is 0–100, used only to sort the inbox and apply a threshold.

| Range | Meaning | Default action |
| --- | --- | --- |
| 0–39 | Not a fit | `skip` |
| 40–59 | Adjacent / stretch | `skip` unless confidence is medium+ and gaps are small; otherwise skip |
| 60–79 | Solid fit with named gaps | `inbox` |
| 80–100 | Strong fit, requirements covered | `inbox` |

Default inbox threshold: **60**. Profile may raise it; do not lower it below 50.

## Skip vs inbox

| Situation | Decision |
| --- | --- |
| On-site or hybrid with no remote | skip (hard filter) |
| Visa/work-auth contradiction | skip |
| Seniority two+ bands off, or Senior/Staff title vs mid/junior profile | skip |
| Required years above `maxRoleYears` | skip |
| Timezone / hours overlap only, `timezoneFlexible` | do not skip |
| Required domain you have never worked in (e.g. HFT, clinical, hardware) | skip |
| Missing a listed tool around a proven core | inbox + gap |
| Cover letter will need to address a gap | inbox + gap, do not skip solely for that |
| Cannot tell from the posting | skip (prefer miss over a junk inbox) |

## Output the match agent must produce

```json
{
  "score": 0,
  "decision": "inbox | skip",
  "confidence": "high | medium | low",
  "summary": "one or two sentences",
  "evidence": ["resume fact → posting need"],
  "gaps": ["missing requirement"],
  "skipReason": "null or short reason"
}
```

If `decision` is `inbox` and `evidence` is empty, the critique/runtime must convert it to `skip`.
