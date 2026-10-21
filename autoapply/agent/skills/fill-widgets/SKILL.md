---
name: fill-widgets
description: >-
  Serialize a drafted answer into the widget the source adapter extracted
  (text, textarea, select, radio, checkbox, multiselect, file, date, number).
  Concept-agnostic. Exact option strings. No ATS-specific DOM.
---

# Fill widgets

## When to use

After a draft value that already **answers the field prompt**, this skill only answers: *what string (or sentinel) do we emit so the adapter can type it into the page?* Do not change the meaning of the answer to fit a concept name.

The adapter (`extractApplyForm` / `submitApplication`) owns selectors, React widgets, location composites, and education repeaters. You own the **value contract**.

## `inputKind` → value

| Kind | Emit | Rules |
| --- | --- | --- |
| `text` | string | Trim. URLs as stored on the profile. Phone as stored. Do not pad. |
| `textarea` | string | Length from the **concept** (wording skill), not from this table. Still a string. |
| `select` | one option string | Character-for-character ∈ `options`. Never paraphrase. |
| `radio` | one option string | Same as select. If options are empty (broken extract), flag — do not emit `"on"`. |
| `multiselect` | JSON array of option strings **or** a single option if only one is true | Only values ∈ `options`. Empty array → `null` if nothing is true. |
| `checkbox` | `true` / `false` / `yes` / `no` matching how the extract looks | Tick consent only when `required` is true on the extracted field. Optional marketing/SMS: `true` only when the GDPR profile flag is on. |
| `file` | `{{resume}}` only for `resume_file` | Any other file concept → `null` + flag in v1. Never paste essay text into a file widget. |
| `date` | `YYYY-MM-DD` | Only from profile `earliestStart` or education dates. |
| `number` | decimal or integer as a string | Years: a number the résumé dates support. No currency symbols in a number widget. |
| `other` | string the adapter can parse | Location/education composites: emit the profile’s location or education summary; flag if split parts are required and ambiguous. |

If `inputKind` is `text` but the label is clearly a date, still emit `YYYY-MM-DD` when we have a date. If it is clearly numeric years, emit a number string.

## Selects and radios

- Read the **option list**, not the question. “Yes, I will require sponsorship” ≠ `Yes`.
- Closest-true mapping is allowed only when the canned fact unambiguously matches one option (LinkedIn → “LinkedIn” / “Social media”). If two options could be true, flag.
- Yes/No (and Yes/No radios): if neither `resumePdf` nor `masterProfile` supports a Yes, emit **No** (or the option that means No). Do not leave required yes/no empty.
- Never pick “Employee referral” or “Decline to self-identify” as a convenience default.

## Checkboxes that are really a source list

`how_heard` often arrives as many checkbox widgets (LinkedIn, Glassdoor, Blog…) instead of one multiselect. Each widget is its own field. Check **only** the option that matches `howHeard`. Leave the rest unchecked (`false` / empty). Do not check several to look thorough.

## Broken extracts

- Label is a UUID, options `["on"]`, radio/checkbox: treat as unfillable unless the visible label was captured elsewhere → `null` + flag.
- Empty `options` on select/radio → `null` + flag.

## Must not

- Invent an option string
- Put a cover-letter essay in a `file` widget
- Put `{{resume}}` in a text widget
- Encode JSON for a plain text field (except `multiselect` as noted)
