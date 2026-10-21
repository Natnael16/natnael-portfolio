---
name: wording
description: >-
  Write long-text application answers (cover letter, why-company, behavioral,
  relevant experience, highlight, open prompt) in plain human wording. No LLM
  filler, no invented facts. Concept-agnostic; not tied to any ATS.
---

# Wording

Load this skill whenever the value is more than a yes/no, URL, number, or canned select.

Answer the field’s **prompt** (exact form text). Concept only picks the default length/shape below. If the prompt asks for 2–3 sentences, a named tool, or “challenge and impact”, that wins over the table.

The reader is a recruiter skimming. If a sentence could sit on any company’s form after swapping the name, delete it.

## Voice

Write answers in a natural tone. The text must look like a person typed it into a form. Nothing in the filled answers (or cover letter, or any other provided text) may leave an AI trace or hint that this is an automated application.

- Max **C1** English. Everyday words. No C2 show-off vocabulary.
- Understandable simple sentences. Prefer two short sentences over one long one.
- Contractions are fine (`I'd`, `I've`, `don't`).
- First person. No “one should” / “the candidate”.
- Specific nouns from the resume PDF or master profile markdown (team names, systems, employers). No vague “systems at scale”.
- One claim → one proof. If you cannot point at a line in either file, cut the claim.

## Punctuation and characters

Do not use weird characters in texts.

Never use:

- Semicolons (`;`)
- Em dashes (`—`) or en dashes (`–`)
- Ellipsis character (`…`) or `...` for style
- Curly quotes (`“ ” ‘ ’`)
- Bullets, markdown (`**`, `_`, `` ` ``), emoji, or arrows (`→`, `=>`)
- Backticks, pipes, or HTML

Use normal periods, spaces, apostrophes, and hyphens in words like `full-stack`. A question mark only if the prompt is itself a question you must echo (almost never).

Avoid too many commas. If a sentence already has two commas, split it. Do not stack clauses with commas to sound formal.

## Hard bans (never emit)

These read as generated even when the fact is true. Also treat them as jargon. Do not use words like **genuinely** (or the list below) to sound sincere.

passionate, genuinely, honestly, frankly, excited to, thrilled, delighted, I am writing to express, I would welcome the opportunity, thank you for your consideration, I look forward to hearing, as a highly motivated, proven track record, results-driven, dynamic, innovative solutions, cutting-edge, seamless, synergy, leverage (as a verb for “use”), utilize, furthermore, moreover, holistic, tapestry, landscape (for an industry), unlock, empower, in today’s fast-paced, at the intersection of, I thrive in, hit the ground running, circle back, move the needle, robust (unless quoting a résumé system name), delve, facilitate, world-class, best-in-class, from day one, I’m confident I would be a great fit, multifaceted, comprehensive, overarching, subsequently, albeit, noteworthy, invaluable, impactful (as filler), showcase, spearhead, driven by, deeply, truly (as filler)

Also ban:

- Restating the job description back to them
- Listing five stacks in a comma splice to sound senior
- “As someone who…” openers
- Fake warmth about a product you have not used (per resume PDF or master profile)
- Any hint of automation or AI: “as an AI”, “language model”, “this was generated”, “auto-apply”, “automated application”, naming this agent or pipeline, “as requested by the form filler”
- “Firstly / Secondly / In conclusion”
- “Please find attached” / “at your earliest convenience”

## Length by concept

| Concept | Target |
| --- | --- |
| `cover_letter` | 90–180 words. Hard cap 280. |
| `why_company` / `why_role` / `why_you` | 40–90 words |
| `behavioral` | 60–120 words, one story |
| `relevant_experience` | 40–100 words, one proof of the capability |
| `highlight` | 2–4 sentences (or whatever the prompt asked) |
| `open_prompt` | 0–40 words or empty |
| `years_of_skill` as text | one number or “N years” |

If the widget is a tiny `text` box, stay under 40 words regardless of concept.

## Cover letter / why-company / why-role

Do not use “Dear Hiring Manager”. Do not sign off with “Sincerely”.

1. Name the company and (for cover/why-role) the role in sentence one. Add one concrete thing from **this** posting (product, team, problem) — not “your mission”.
2. One story from the resume PDF or master profile: employer, what you built, stack, outcome **only if the number is in those files**.
3. Optional second sentence if a listed must-have still needs a proof. Stop.

Close only if the profile has a true logistics line (remote, notice). No begging.

## Behavioral (“tell us about a time”)

Not labeled STAR. Still: situation in half a sentence, what you did, what changed (if measured in the resume PDF or master profile). Past tense. No moral at the end (“this taught me the importance of…”).

- If the prompt names a tool you do not have, do not write an adjacent-story substitute **when it is a named SDK or product**. Empty + flag.
- If it is a required list of infrastructure topics (SMTP, MTAs, DNS) and the master profile has queues, retries, or Redis workers, write that proof and name the gap. Do not leave the box empty.

## Relevant experience / highlight

Capability + one proof. Highlight: the prompt often asks for challenge + impact — only impact numbers that are in the resume PDF or master profile.

## Open prompt / additional information

Use only for a true leftover. If nothing is true and useful, empty.

## Grounding

Allowed sources: `profile`, `resumePdf`, `masterProfile` (`candidate/*.md`), canned fields, the **current job** title/company/must-haves. If a yes/no is in neither file, answer No.

Not allowed: other companies’ blogs, salary websites, assuming you used their product, metrics you “remember” that are not in the resume PDF or master profile.

If either file says “failed-payment tickets 28%”, you may say that. You may not round it to “about 30%” or turn it into revenue.

## Self-check before returning a long value

- [ ] Responds to this field’s prompt (named company, tool, length, extra asks)
- [ ] At least one employer or project from the resume PDF or master profile
- [ ] Natural tone, C1 or simpler, short sentences
- [ ] No semicolon, em dash, smart quotes, markdown, or emoji
- [ ] Not stuffed with commas
- [ ] Zero words from the ban list (including genuinely / honestly / frankly)
- [ ] No AI or automated-application trace
- [ ] Zero numbers that are not in the resume PDF, master profile, or dashboard profile
- [ ] Would still be false if you removed the company name? Then rewrite or empty+flag
