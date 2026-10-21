# Match eval cases

Runnable suite: `npm run eval:agent`. IDs below must match `src/agent/evals/corpus.ts`.

The candidate is the frozen fixture in [`fixture.md`](fixture.md), **not** the dashboard user. Cases use full-ish Ashby-style descriptions so the model cannot pass by keyword-spotting a one-liner.

Pass rule for any `inbox`: `evidence.length >= 1` and at least one evidence bullet names **Northline** or **Cedar Clinic**. Fail the suite if a skip-case scores ≥ 80.

---

## Hard filter (no model)

These must never call the match model.

| ID | Trap | Expect |
| --- | --- | --- |
| `HF-onsite` | `workplaceType: OnSite`, `isRemote: false`, NYC office | skip: not remote |
| `HF-hybrid-office` | Hybrid, 3 days/week SF required | skip: not remote (`workplaceType` Hybrid and `isRemote` false) |
| `HF-sales-title` | Title Account Executive; JD still mentions “work with engineers” and React | skip: exclude keyword |
| `HF-recruiter` | Technical Recruiter, “source software engineers” | skip: exclude keyword |
| `HF-contract` | `employmentType: Contract` vs profile FullTime only | skip: employment type |
| `HF-unpaid` | Title contains unpaid | skip: exclude keyword |
| `HF-senior-title` | Mid profile, title Senior Software Engineer | skip: seniority |
| `HF-staff-title` | Mid profile, Staff Product Engineer | skip: seniority |
| `HF-years-required` | Mid profile, Software Engineer JD with 5+ years required | skip: years cap |

---

## Must inbox (model)

### M1 — Core overlap, senior TS/Node billing-adjacent

Harbor, remote FullTime, Senior Software Engineer. JD: own TypeScript/Node services, PostgreSQL, React internal tools, AWS, payments/webhooks a plus. Mentions Stripe as nice-to-have.

**Expect:** `inbox`, score ≥ 70, confidence high or medium. Evidence must mention Northline (billing API / TypeScript / Node / PostgreSQL). Gap may mention nothing or a satellite tool. Must not claim staff scope.

### M2 — Same seat, Go is a plus

Identical to M1 plus “Go is a plus, not required”.

**Expect:** `inbox`. If `gaps` includes Go, still inbox. Must not skip for Go.

### M3 — Adjacent product, not a domain leap

Remote Senior Full Stack at a **vertical SaaS for construction** (ProBuild). Stack is still TS/React/Node/Postgres. Domain is new; function is the same.

**Expect:** `inbox` with a **domain gap** named (construction / vertical). Must not skip solely for industry.

### M4 — Seniority stretch of one band (Senior JD, slightly staff-flavored bullets)

Title remains Senior Software Engineer. JD asks to “set technical direction with a staff engineer, not replace them” and “mentor” — which the résumé has.

**Expect:** `inbox`, not skip. Must not treat “work with staff” as “you must be staff”.

---

## Must skip (model or hard filter)

### S1 — Two bands up

Title: Principal Engineer. JD: org-wide architecture for 200 engineers, multi-year platform bets, staff+ calibration.

**Expect:** `skip` (seniority). Score must be **&lt; 80**.

### S2 — Function mismatch with keyword bait

Title: Forward Deployed Engineer, but 80% of the JD is on-site customer workshops, scoping SOWs, and travel. Mentions TypeScript once.

**Expect:** `skip` or low-score skip. Must not inbox because “TypeScript” appears once.

### S4 — Domain the résumé has never touched

Quantitative Researcher, HFT, C++, FPGA, PhD preferred.

**Expect:** `skip`, domain. Evidence must not be “used PostgreSQL therefore quantitative research”.

### S5 — Sponsorship contradiction (alternate profile)

Same M1 JD. Profile override: `requiresSponsorship: true`. JD: “Must be authorized to work in the US without current or future sponsorship.”

**Expect:** `skip`, work auth.

### S6 — Remote label, body requires US office

`isRemote: true`, `workplaceType: Remote`, but JD: “Must work from our NYC HQ at least 4 days per week.”

**Expect:** `skip` (logistics / not actually remote). This is the case hard filters miss and the match skill must catch.

### S7 — Recruiter-shaped IC title

Title: “Software Engineer, Recruiting Tools” at a staffing firm; JD is building Greenhouse integrations **and** carrying an interview quota / candidate pipeline.

**Expect:** `skip` or inbox only if the agent can justify IC product work; default **skip** if quota/sales-of-hiring is the core. Forbidden: inbox solely because “Greenhouse” and “engineer” co-occur.

---

## Forbidden failures (any case)

- `inbox` with empty `evidence`
- Using the job’s own adjectives as résumé facts
- Scoring S1 in the 80–100 band
- Inbox on HF-* cases
