---
name: classify-questions
description: >-
  Tag each extracted apply-form field with one playbook concept (why_company,
  behavioral, work_auth, …). Do not rewrite the prompt. The agent still answers
  the verbatim label. Prefer unknown over a wrong tag.
---

# Classify questions

## What this skill is (and is not)

This is a **tagger for playbooks**. Skills (draft-answers, wording, logistics) are written per concept so we know *how* to answer that *kind* of question.

At fill time the agent still receives **every extracted field and its exact prompt**. You do not replace “Why do you want to work at Discord?” with “why_company”. You copy the path unchanged and add `concept: why_company`. The label never gets rewritten.

## When to use

You receive fields already normalized by a **source adapter**: `path`, `label` (the real question), `required`, `inputKind`, `options`. Tag each one. Boards differ; **do not classify by ATS or by widget.**

`inputKind` is copied through for `fill-widgets`. You do not invent it.

## Two axes (do not mix them)

| Axis | Who owns it | Examples |
| --- | --- | --- |
| **Prompt** (untouched) | What is printed on the form | “Why do you want to join Figma?” |
| **Concept** (this skill) | Which playbook to load | `why_company` |
| **Widget** (`inputKind`) | How to type the value | `textarea`, `select` |

“Yes/No” is a widget, not a concept. “Are you authorized to work in the US?” is `work_auth` whether it is a select, radio, or checkbox.

## Concepts (exactly one playbook tag)

See [concepts.md](concepts.md) for harvested patterns. Those examples exist so we can write skills. They are not a rewrite list.

**Narrative**

| Concept | Use when the prompt is asking |
| --- | --- |
| `why_company` | Why this employer |
| `why_role` | Why this posting / team |
| `why_you` | Why hire you / what you bring |
| `behavioral` | A past episode (tell us about a time…) |
| `relevant_experience` | Experience with X — explain / give an example |
| `highlight` | Proudest work, exceptional performance |
| `open_prompt` | Tell us more / additional information (no topic) |
| `cover_letter` | Cover or covering letter |

**Skill numbers and proof URLs:** `years_experience`, `years_of_skill`, `skill_rating`, `language_proficiency`, `portfolio_link`

**Profile mapping:** `identity`, `social`, `resume_file`, `other_file`, `location`, `work_auth`, `sponsorship`, `relocation`, `remote_intent`, `salary`, `availability`, `current_employer`, `current_title`, `prior_company`, `how_heard`, `referral`, `education`, `legal_eeo`, `consent`, `export_control`, `non_compete`, `marketing_opt_in`, `bot_check`, `unknown`

## Heuristics (first hit wins)

Match the **verbatim label** (and option text if the label is empty or a UUID). Case-insensitive.

Skip helper widgets: label starts with “Autofill from resume” → `unknown`. UUID-only checkbox with no readable text → `consent` if near privacy/agree, else `unknown`.

1. Resume / CV / Curriculum (and not autofill) → `resume_file`
2. Cover letter / covering letter → `cover_letter`
3. Transcript / work sample / portfolio **file** → `other_file`
4. Puzzle / secret / “not a bot” / encoded challenge → `bot_check`
5. Tell us about a time / describe a time / walk us through a time / war story → `behavioral`
6. Proudest / exceptional performance / highlight a feature → `highlight`
7. Why do you want to (work at\|join\|work for) {company} / why {company} → `why_company`
8. Why this role / why this team / why this position → `why_role`
9. Why you / why should we hire / what would you bring → `why_you`
10. Experience with / elaborate on your experience / please give an example / describe your experience / if yes, elaborate → `relevant_experience`
11. Tell us more / additional information / anything else / comments → `open_prompt`
12. Years of {skill} / how many years of {language or tool} → `years_of_skill`
13. Years of (professional) experience (no skill named) → `years_experience`
14. Rate / score / proficiency in {skill} / percentage of work involved → `skill_rating`
15. Proficiency in English/Spanish/Mandarin (human language) → `language_proficiency`
16. App Store / take-home URL / link to a project that uses → `portfolio_link`
17. LinkedIn / GitHub / Twitter / website / portfolio URL / blog → `social`
18. Email → `identity`
19. Phone / mobile / SMS number as **contact** → `identity` (SMS *consent* is `marketing_opt_in`)
20. Full name / first name / last name / legal name / preferred name → `identity`
21. Authorized to work / legally authorized / right to work → `work_auth`
22. Sponsor / visa / immigration / work permit → `sponsorship`
23. ITAR / export / US person / sanctioned / Cuba, Iran, North Korea → `export_control`
24. Non-compete / non-solicitation → `non_compete`
25. Salary / compensation / pay / equity expectation → `salary`
26. Notice / start date / available from / when can you start / hours overlap / working hours / timezone (can you work, based in a timezone) → `availability`
27. Relocate / hub location / onsite / hybrid days / office → `relocation`
28. Plan to work remotely / intend to work from → `remote_intent`
29. How did you hear / source checkboxes → `how_heard`
30. Referred you / referred by / employee name → `referral`
31. Current/most recent company / current employer → `current_employer`
32. Current/most recent (job) title / previous job title → `current_title`
33. Ever (been) employed by / worked for {this company} → `prior_company`
34. School / degree / university / education / GPA / discipline / major → `education`
35. Location / city / country (of residence) / where based / reside → `location`. Timezone and working-hours overlap are `availability`, not location.
36. Race / ethnicity / gender / veteran / disability / Hispanic / LGBTQ / EEO → `legal_eeo`
37. Privacy / consent / terms / 18 years / contact employer / attest / certify / NDA / BrightHire / AI usage attestation / I agree → `consent`
38. WhatsApp / text messages from recruiting / SMS consent → `marketing_opt_in`
39. Pronouns (demographic list) → `legal_eeo`
40. Else → `unknown`

If a prompt names a **vendor-specific tool, SDK, or puzzle** that neither the resume PDF nor the master profile markdown can support, use `unknown` even if it looks like `behavioral`.

## Must

- Copy `path` unchanged
- **Do not rewrite `label`.** It is not in your output. Tag only.
- Prefer `unknown` over a wrong concept
- One concept per field

## Must not

- Invent a shorter or “cleaner” question
- Classify by `inputKind` (“it’s a textarea so it must be cover letter”)
- Invent fields that are not in the extract

## Output schema

```json
{
  "fields": [
    {
      "path": "why_discord",
      "concept": "why_company",
      "required": true
    }
  ]
}
```
