# Application drafting

## Purpose

Turn a matched job’s public apply form into honest, specific field answers the human can approve. Drafts are grounded in the profile and resume. Plausible fiction is a product failure.

The pipeline is **source-agnostic**. Adapters extract every visible field as `{ path, label, required, inputKind, options }` — `label` is the **real question on the page**. Concept tags are playbooks for skills (`how` to answer that *kind* of ask). At fill time the agent is given the full form and must answer each `label`, not a renamed generic question. See `docs/prd/sources.md`.

## Voice

- Natural tone. Max C1 English. Simple sentences. No jargon like “genuinely”.
- No AI trace and no hint that the application was automated.
- No semicolons, em dashes, smart quotes, or markdown in filled text. Avoid stacking commas.
- First person, specific: name teams, systems, outcomes that exist on the resume
- No clichés: “passionate about your mission”, “synergy”, “I thrive in fast-paced environments”
- Match the question’s implied length. A yes/no is not a paragraph. A cover letter is not a tweet.

## Honesty

Must:

- Use only facts from the profile, resume, or canned logistics answers
- Quote numbers (headcount, %, latency, revenue) only if they appear in the resume or profile
- Fill every field those sources can answer. Empty only when the fact is absent. Do not leave fillable fields for the human.

Must not:

- Invent employers, titles, dates, degrees, certifications, or skills
- Round “used a tool once” into “expert”
- Claim sponsorship needs, citizenship, or salary numbers that are not on the profile
- Fill EEO/legal optional fields with guesses

## Layer 1 — question concepts

`agent/skills/classify-questions/` tags each extracted prompt with a playbook id so we can write skills (behavioral shape, canned work-auth, …). The catalog of kinds is `concepts.md`. This is not an ATS field-type list and **not a rewrite of the question**.

Runtime: extract all fields → tag `concept` → draft agent sees `{ prompt: original label, concept, inputKind, options }` for **every** field → answer the prompt.

Narrative concepts (the quality bar for this product):

| Concept | Typical prompt |
| --- | --- |
| `why_company` | Why do you want to work at / join {company}? |
| `why_role` | Why this role / team |
| `why_you` | Why you / what you bring |
| `behavioral` | Tell us about a time… / describe a time… |
| `relevant_experience` | Experience with X — explain / give an example |
| `highlight` | Proudest feature / exceptional performance |
| `open_prompt` | Tell us more / additional information |
| `cover_letter` | Cover letter |

Screening and profile concepts: `identity`, `social`, `resume_file`, `work_auth`, `sponsorship`, `location`, `relocation`, `remote_intent`, `salary`, `availability`, `how_heard`, `referral`, `education`, `current_employer`, `current_title`, `prior_company`, `years_of_skill`, `legal_eeo`, `consent`, `bot_check`, `unknown`, …

Yes/no is a **widget**, not a concept. “Authorized to work?” is `work_auth` whether it is a select or a checkbox.

## Layer 2 — widgets

`agent/skills/fill-widgets/` serializes the answer for `inputKind`: exact select option, `YYYY-MM-DD`, `{{resume}}`, checkbox true/false. Adapters type it into the page.

## How to fill (by concept)

| Concept | How to fill |
| --- | --- |
| `identity` | Profile name, email, phone. Exact. Split first/last if the form is split. |
| `social` | LinkedIn, GitHub, website. Exact URLs. |
| `resume_file` | Stored PDF via `{{resume}}`. |
| `other_file` | Flag if required. v1 has no second upload. |
| `work_auth` / `sponsorship` | Canned authorization + `requiresSponsorship` mapped to **exact** options. |
| `export_control` | Canned only. |
| `location` / `relocation` / `remote_intent` | Profile location / `willingToRelocate` / remote-only honesty. |
| `salary` | `salaryBand` only. Empty required → flag. |
| `availability` | Notice, `earliestStart` as `YYYY-MM-DD`. |
| `how_heard` / `referral` | `howHeard` / `referralName`. Never invent a referral. |
| `education` | Profile education. Do not invent a school. |
| `current_employer` / `current_title` | Most recent résumé employer/title. |
| `behavioral` / `relevant_experience` / `highlight` | **Wording** skill; one résumé proof. Proprietary tool with no proof → empty + flag. |
| `why_*` / `cover_letter` | Cover-letter + **wording**. |
| `legal_eeo` | Optional empty. Required without stored answer → flag. |
| `consent` | Only if the user enabled those flags. |
| `bot_check` / `unknown` | Empty + flag. |

Long text must pass `agent/skills/wording/SKILL.md`.

## When to leave blank and flag

- Required field, no supporting fact
- Salary / start date / notice period not in profile
- “Link to a project that uses X” when no such project is listed
- Diversity questionnaires without stored answers
- Any field classified `unknown` or `bot_check`

Flag shape: `{ fieldPath, reason, required: boolean }`. Required unknowns block a clean approve recommendation; the human can still type an answer and approve.

## Cover letters

3–4 short paragraphs:

1. Role + company, why this seat (one posting-specific sentence)
2. Most relevant resume proof (one concrete project or job)
3. Second proof or how you work (stack, domain, collaboration) still from the resume
4. Close: availability / remote / optional logistics already on the profile — no begging

One concrete resume proof per claim. If you cannot name a proof, cut the claim.

## Output the draft agent must produce

```json
{
  "answers": [
    {
      "path": "field path or name",
      "type": "why_company | behavioral | identity | …",
      "value": "string or null",
      "confidence": "high | medium | low",
      "source": "profile | resume | canned | empty"
    }
  ],
  "flags": [{ "path": "", "reason": "", "required": true }],
  "coverLetter": "string or null"
}
```

`type` is the **concept** id.

## Critique pass (required before inbox)

Reject or flag the draft if:

- Any answer cites an employer, title, date, or metric not in profile/resume
- A required field is empty without a flag
- Cover letter / why-company is generic (no company name, no résumé proof)
- Identity fields do not match the profile exactly
- Confidence is `low` on more than half of non-identity fields

Critique output: `{ ok, violations, flags, corrections, strippedPaths }`. Critique **rewrites** wording and fills empties that resume/profile support. It does not leave a review note for something it can fix. Fabrications go to `strippedPaths` (cleared), not into the inbox as a lie.
