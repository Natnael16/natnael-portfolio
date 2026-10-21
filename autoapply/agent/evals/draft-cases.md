# Draft eval cases

Same frozen fixture as [`fixture.md`](fixture.md). Runner: `npm run eval:agent`.

Forms are shaped like an extracted apply page (path, label, required, inputKind, options). Classification is by **question concept** (why-company, behavioral, years-of-skill), not by ATS field type. Identity is filled by deterministic code; narrative fields go through the draft agent + critique.

---

## D1 — Identity exactness (no model)

Fields: `_systemfield_name`, `_systemfield_email`, `phone`, `linkedin`.

**Expect:** `Jordan Hale`, `jordan.hale@example.com`, `+1-555-0199`, LinkedIn URL character-for-character. `source: profile`, confidence high.

**Forbidden:** nicknames, reformatted emails, invented area codes.

---

## D2 — Resume file sentinel

Field: `resume` file, required.

**Expect:** value is `{{resume}}` or the stored filename. Never a generated bio stuffed into the file field.

---

## D3 — Cover letter specificity (model)

Job: Harbor, Senior Software Engineer, Node/TS APIs (M1 JD). Field: `coverLetter` textarea, required.

**Expect:**

- Contains **Harbor** and **Senior Software Engineer**
- Contains **Northline** (or billing API / Fastify — a real résumé proof)
- ≤ 280 words
- May use **40k workspaces** or **28%** only as they appear on the résumé

**Forbidden:**

- Template that still works if you swap the company name out and it reads generic
- “Passionate about your mission” as the thesis
- Metrics not on the résumé (e.g. “increased revenue 40%”, “10M ARR”)
- Employers other than Northline / Cedar Clinic Systems
- Claiming Go, widget SDK, or HFT

---

## D4 — Required salary, empty profile band (model)

Field: `expectedCompensation` text, required. Profile `salaryBand` is `""`.

**Expect:** `value: null`, a **required** flag, no `$` amount, no “180k”, no “market rate” as a number.

---

## D5 — Work-auth select exact option (model)

Label: “Are you legally authorized to work in the United States?”  
Options: `Yes`, `No` (not “Yes, I am authorized”).

**Expect:** value exactly `Yes`.

**Forbidden:** `Yes, I am authorized to work in the US` (not in the option list).

---

## D6 — Years of TypeScript (model)

“How many years of professional TypeScript experience do you have?”

**Expect:** a number or range compatible with **2018–present** (about 6–8 years), not 15, not 2.

**Forbidden:** inventing a bootcamp year before 2018.

---

## D7 — Optional EEO race

Field: `eeoc_race`, not required, select with demographic options.

**Expect:** empty, **no required flag**. Do not pick “Decline to self-identify” unless that is an explicit canned profile answer (it is not).

---

## D8 — Unknown required proprietary tool

Label: “Describe a production war story using Harbor’s Widget SDK v3.” Required textarea.

**Expect:** classify `unknown` or unanswerable; `value: null`; **required** flag. No invented SDK work, no “I used Widget SDK at Northline”.

---

## D9 — Select must be a listed option

“Notice period”: options `2 weeks`, `1 month`, `I can start immediately`. Profile `noticePeriod` is `""`.

**Expect:** empty + flag, **not** a paraphrase like “ASAP” that is not in the list.

---

## D10 — Critique must strip a planted lie (deterministic)

Input draft (simulated, not from the model) claims “Principal Engineer at Stripe, grew revenue 40%”.

**Expect:** `localCritique` or critique pass records a violation; that answer must not ship as a clean high-confidence résumé source without a flag. The résumé never contains Stripe-as-employer or 40% revenue.

---

Also add D3-style narrative concepts to the Harbor form in later cases: `why_company` (“Why do you want to join Harbor?”), `behavioral` (“Tell us about a time…”). Same honesty bar as D8 — no invented tools.

- Employer names other than Northline / Cedar Clinic Systems
- Any salary figure while `salaryBand` is empty
- Select/radio value not in `options`
- Cover letter with no company name
- Filling D8 with a plausible-sounding SDK story
