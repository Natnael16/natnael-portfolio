---
name: cover-letter
description: >-
  Playbook for cover-letter, why-company, why-role, and why-you prompts.
  Always answer the field's exact prompt; the concept only picks this shape.
---

# Cover letter and motivation

## When to use

Concept tags: `cover_letter`, `why_company`, `why_role`, `why_you`.

The question is `prompt` on the field (e.g. “Why do you want to join Figma?”). Write an answer to **that** sentence. This skill is the shape and honesty bar, not a substitute prompt.

Always apply **wording**, then **fill-widgets**.

v1 does not generate a PDF. If `inputKind` is `file`, empty + flag.

## Length

Honor the prompt first (“1–2 sentences”, “2 to 3 sentences”). If it is silent:

| Concept | Default |
| --- | --- |
| `cover_letter` | 90–180 words, cap 280 |
| `why_company` / `why_role` / `why_you` | 40–90 words |

Tiny `text` box: stay under 40 words unless the prompt says otherwise.

## Shape (no greeting, no sign-off)

Still name whatever **this prompt** asked for (this company, this role, you). Tie one résumé proof. Do not emit a generic “why company” letter that would still work after swapping the company name.

If `match.gaps` includes a real hole, one honest clause is allowed. Never hide the gap with fiction.

## Must

- Answer the printed prompt, including named company/product/constraints in it
- One employer or project from the resume PDF or master profile markdown
- Follow wording bans

## Must not

- Dear Hiring Manager / Sincerely / I am writing to express
- A letter that only matches the concept tag, not the prompt
- Metrics not in the resume PDF or master profile markdown
- Claiming you already use their product unless those files say so
- Semicolons, em dashes, filler like “genuinely”, or any line that could read as an automated application

## Cannot answer this prompt honestly

`value: null`, flag, confidence `low`. No template.
