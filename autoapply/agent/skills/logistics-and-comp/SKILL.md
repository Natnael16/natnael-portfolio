---
name: logistics-and-comp
description: >-
  Fill work authorization, sponsorship, export control, location, relocation,
  remote intent, availability, and compensation from canned profile values
  only. Map to exact select options. Never invent salary or visa status.
---

# Logistics and compensation

## When to use

Concepts: `work_auth`, `sponsorship`, `export_control`, `location`, `relocation`, `remote_intent`, `salary`, `availability`.

These are screening questions. A wrong Yes on sponsorship wastes the candidate and the recruiter. Prefer empty+flag over a “close enough” option. Then **fill-widgets**.

Still answer **this field’s prompt** (country named, “now or in the future”, option wording). The concept only picks this playbook.

## Work authorization (`work_auth`)

Common: “Are you legally authorized to work in {country}?”

Map `profile.workAuthorization` onto option `Yes` / `No` / long-form option text **exactly**.

**Must not:** infer from LinkedIn, assume citizen because location is US, or copy a sentence from the job post as if it were the candidate’s status.

## Sponsorship (`sponsorship`)

“Do you now or will you in the future require sponsorship?”

`profile.requiresSponsorship` → pick the option that means Yes or No. Read the options; “Yes, I will require sponsorship” is not the same as `Yes`.

Visa type follow-up: only `cannedAnswers.visaType` or `profile.visaType`. Else flag.

If the **job** says no sponsorship and `requiresSponsorship` is true → that is a **skip** (skip-or-escalate), not a lying `No` on the form.

## Export control (`export_control`)

Only canned: `profile.exportControl` or `cannedAnswers.exportControl`. Empty required → flag. Do not guess “US person”. Multi-checkbox nationality lists: check only what the profile states.

## Location (`location`)

Emit `profile.location`. If the UI is a composite (city / region / country), parse conservatively (`"Berlin, Germany"` → city Berlin, country Germany) and flag if ambiguous.

Country prompt → country only (Ethiopia from `Addis Ababa, Ethiopia`). City prompt → city only. Do not paste the full `city, country` string into a country field.

Country-of-residence selects: pick the option that matches the profile location country, exact string.

**Timezone vs where you live**

- City / country / “where do you reside” → location from the profile. That is Ethiopia / Addis Ababa. Do not invent a US or EU address.
- Hours overlap, “can you work US/EU hours”, “are you based in an EU or equivalent timezone”, working-hours questions → this is **availability**, not a new home. If `timezoneFlexible` is true: answer **Yes**. The candidate can align with any timezone and has worked US hours. `profile.timezone` is still `Africa/Addis_Ababa` when they ask for the IANA/zone name.

Do not skip or contradict a Yes on hours just because the home city is Addis Ababa.

## Relocation / remote (`relocation`, `remote_intent`)

- `remoteOnly: true` and the question is “Can you be in SF 3 days/week?” → `No` if that option exists, else flag and let skip-or-escalate kill the job if the posting already required it.
- `willingToRelocate`: `yes` / `no` / empty. Empty required → flag.
- “Do you plan to work remotely?” → Yes if `remoteOnly`, else canned.
- “From where do you intend to work?” → profile location or canned remote location.

## Salary (`salary`)

`profile.salaryBand` only. For this candidate’s **remote** roles that is **2000-2500 USD per month**.

- Text: `2000-2500 USD per month`. If the prompt asks for annual / per year, emit `24000-30000 USD per year`.
- Number: monthly min `2000`, max `2500`; annual min `24000`, max `30000`.
- Select: pick the bucket that contains that range. Overlap across two buckets → flag.
- On-site / hybrid office jobs: do not paste the remote monthly band.
- Current compensation: `cannedAnswers.currentSalary` only.
- Required + empty `salaryBand` → `null` + required flag. **Never** fill from levels.fyi or the posting band.

## Availability (`availability`)

- Notice: map `noticePeriod` to **exact** option. This profile is **1 week**. Prefer `1 week` / `one week` / `7 days`. If the select has no 1-week option, pick the shortest option that is still at least 1 week (e.g. 2 weeks). Never pick “I can start immediately” or “ASAP” unless the profile says so.
- Start date: `profile.earliestStart` as `YYYY-MM-DD` when the widget is a date (or a text date).
- Number field for notice days: `7` when noticePeriod is 1 week.
- Hours / timezone overlap: Yes when `timezoneFlexible` is true.

## Self-check

- [ ] No salary digits unless `salaryBand` or currentSalary is set
- [ ] Select values ∈ options
- [ ] Sponsorship Yes/No matches `requiresSponsorship`, not the job’s preference
