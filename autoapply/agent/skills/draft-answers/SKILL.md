---
name: draft-answers
description: >-
  Fill every extracted apply-form field from the profile, resume PDF, and
  candidate/*.md master profile. Answer the field's prompt (the exact form
  text). concept only selects a playbook. Never fabricate.
---

# Draft answers

## Prompt vs playbook

You receive the **full form**: every field with `prompt` (verbatim label from the page), `inputKind`, `options`, `required`, and `concept`.

- **Answer `prompt`.** If it says “Please share some details about your proudest Android feature in 2 to 3 sentences. What made it challenging and what was the impact?”, write that — length, Android, challenge, impact. Do not write a generic `highlight` essay.
- **`concept` is which skill/playbook to use** (STAR shape, canned work-auth mapping, cover-letter shape). It is not the question.
- **Every field** in `form.fields` gets an answer object (value or null). Do not drop fields. `prefilled` on identity fields is already correct — keep it.
- If the resume PDF **or** `candidate/*.md` master profile has the fact, **fill the field**. The markdown is the extended source of truth. If a yes/no is in neither file, answer **No** and fill. Empty only for optional EEO, no referral, or a named SDK that is not in either file. Remote salary is `profile.salaryBand` (2000-2500 USD per month).

Load **fill-widgets** for how to serialize. Load **wording** for any value longer than ~30 words.

## Hand-offs (playbooks)

| Concept tag | Playbook |
| --- | --- |
| `work_auth`, `sponsorship`, `export_control`, `location`, `salary`, `availability`, `relocation`, `remote_intent` | `logistics-and-comp` |
| `cover_letter`, `why_company`, `why_role`, `why_you` | `cover-letter` then `wording` |
| `behavioral`, `relevant_experience`, `highlight`, `open_prompt` | this skill + `wording` |
| everything else | here |

Obey extra constraints **in the prompt** even if the playbook has a default length (e.g. “1–2 sentences”, “name the employee”).

## Global must

- Identity and social URLs: **exact** profile strings (honor `prefilled` when set)
- Widget rules: `fill-widgets` (exact options, dates, file sentinel)
- Empty required → `value: null`, `source: empty`, flag `required: true`
- `type` in the output JSON is the **concept** tag (playbook id), not a rewritten question

## Global must not

- Invent employers, titles, dates, degrees, GPA, metrics, skills, referrals, visa classes
- Answer a generic concept instead of the printed prompt
- Upgrade “used in one project” to expert
- Put a generated bio in a file field
- Fill optional EEO
- Auto-check legal attestations unless `profile.attestTruth === true`
- Reuse the résumé file for `other_file`
- Answer `bot_check` prompts, or a named tool/SDK that is not in the resume PDF or master profile markdown
- Leave any AI trace in filled text (cover letter, textareas, additional info, or anywhere else). Never say the application was automated, drafted by a tool, or written by an agent. Follow `wording`.

## Per playbook

### identity / social

Keep `prefilled` / profile strings. Split first/last from `profile.name` only when **this prompt** asks for first or last. Flag a middle name if this prompt asks and we don't have it.

### resume_file / other_file

Resume: `{{resume}}`. Other file: empty + flag if required.

### how_heard / referral

Map `profile.howHeard` to the closest **true** option. Never pick employee referral to look warm. Fill a name only if **this prompt** asks for a referrer and `referralName` is set.

### education / current_employer / current_title / prior_company

Education: `profile.education[]` or `educationSummary`. Do not invent a school.

Employer/title: most recent résumé or master-profile line, exactly. Prior-at-this-company: Yes only if **this** employer’s name is in those files as employer.

### years_experience / years_of_skill / skill_rating / language_proficiency / portfolio_link

Count only what the resume PDF or master profile markdown supports. The **named skill in the prompt** is what you count (TypeScript years ≠ years of work). Score 1–4 conservative. Portfolio URL only if it matches what **this prompt** asked for.

### behavioral / relevant_experience / highlight

Follow `wording`, but the story must satisfy **this prompt** (the tool, domain, time window, “if yes, elaborate”).

1. Do not restate the question.
2. One proof from the resume PDF or the master profile markdown.
3. Stop unless they asked for two examples.

A **named product/SDK** that is not in either file (Harbor Widget SDK v3, a proprietary internal tool) → empty + flag. Do not invent using it.

A **required domain prompt** that lists several systems (SMTP, MTAs, DNS, bounces, IP pools) when those exact words are not in either file: **still fill it**. One short clause that you have not operated those systems, then the closest true proof from the markdown (queues, retries, Redis workers, rate limits, production failure handling). Do not claim you ran an MTA. Do not leave a required box empty.

**Yes/No radios and selects:** search `resumePdf` and `masterProfile`. If the fact is in either file, answer from that. If it is in **neither** file, answer **No** (or the option that means No) and fill. Do not leave the box empty. Do not invent a Yes.

### open_prompt

Default empty unless required. If required, one short paragraph grounded in the PDF or master profile that fits **this** box (Linear “Tell us more” is not a cover letter unless the prompt says so).

### legal_eeo / consent / non_compete / marketing_opt_in / bot_check / unknown

Optional EEO → empty (not a problem). Required without a stored answer → empty + flag. Consent / I agree: tick only when the form marks the field required. Optional attest only if the profile flag is true. Marketing opt-in (WhatsApp/SMS) only if GDPR consent is on. `bot_check` → empty + flag.

`unknown` does **not** mean empty. If the prompt can be answered from the resume PDF, the master profile markdown, or the dashboard profile, answer it. Empty only if the prompt names a **SDK or product** that is not in those sources.

## Output schema

One answer per form field:

```json
{
  "answers": [
    {
      "path": "field path from the form",
      "type": "why_company",
      "value": "string or null",
      "confidence": "high | medium | low",
      "source": "profile | resume | canned | empty"
    }
  ],
  "flags": [{ "path": "", "reason": "", "required": true }],
  "coverLetter": "string or null"
}
```

## Self-check

- [ ] Every `form.fields[]` path has an answer
- [ ] Each value would make sense under that field’s **prompt** (not under the concept name)
- [ ] Select values ∈ options
- [ ] No employer/number absent from the resume PDF, master profile markdown, or dashboard profile
- [ ] Long text passes `wording`
- [ ] Required empties flagged
