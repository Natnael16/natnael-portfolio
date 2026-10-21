# Question concepts (playbooks)

These ids exist so we can write skills (“when it is a behavioral question, write one past episode”). They are **not** what the agent answers.

At fill time the form’s `label` / `prompt` is the question. “Why do you want to work at Discord?” stays that sentence. We only tag it `why_company` so the cover-letter playbook runs.

Examples below are real public-board wording, de-duplicated to the *kind* of ask. Use them to recognize a playbook, not to replace the prompt.

---

## Narrative (draft with wording)

### `why_company`

Why this employer, not this seat.

- Why do you want to work at Discord?
- Why do you want to join Figma?
- Why do you want to work for Airbnb?

### `why_role`

Why this posting / team / function. If the label names both company and role, prefer `why_role` when the job title or team is in the prompt.

### `why_you`

Why you for this seat: pitch, “why should we hire you”, “what would you bring”.

### `behavioral`

STAR-shaped, even if they never say STAR. Past episode, one story.

- Tell us about a time…
- Describe a time you…
- Walk us through a project where…
- Tell us about a production war story… (if the tool is on the résumé; else `unknown`)

### `relevant_experience`

Open “do you have experience with X — explain / give an example”. Not a single past episode; a capability with proof.

- Please tell us about your experience leveraging Machine Learning for abuse/fraud detection…
- Please elaborate on your experience building software in AWS (with Terraform)
- Do you have experience in building agentic applications in production? Please give an example
- Describe a production ML or GenAI system where you worked at the model level…
- Describe your experience working directly with enterprise customers on ML/AI solutions
- Have you contributed to a mobile app(s) and/or several features that reached a large number of users? Please describe.
- Do you have experience managing direct reports? If yes, please elaborate in 1–2 sentences.

### `highlight`

Proudest work, exceptional performance, “anything you want us to notice” as a *story*, not a leftover box.

- Please share some details about your proudest Android feature in 2 to 3 sentences. What made it challenging and what was the impact?
- We believe exceptional performance in one area is a good indication of performance in other areas. Do you have any examples of exceptional performance you want to highlight?

### `open_prompt`

Catch-all long box with no topic: Tell us more, Additional information, Anything else we should know, Comments.

- Tell us more (Linear)
- Additional Information (Figma)

### `cover_letter`

Field named cover / covering letter (textarea **or** file). File → still this concept; fill-widgets decides `{{resume}}` is wrong and flags `other_file` if there is no cover PDF.

---

## Quantified skill / proof links

### `years_experience`

Years of professional work in general.

### `years_of_skill`

Years of a named skill (TypeScript, Python, Android…).

### `skill_rating`

Score 1–4, proficiency dropdown, “rate your X”, % of time on a topic.

- Over the past 18 months, what percentage of your work has involved: Data Science / ML / LLM / …

### `language_proficiency`

Spoken/written language level (English, Mandarin).

### `portfolio_link`

URL that must already exist on profile/résumé: GitHub is `social`; this is “link to an app / take-home / project that uses X”.

- Please provide a link to the App Store and/or personal portfolio showcasing your top 1–2 app(s)!
- LinkedIn / GitHub / website as labeled URL fields → `social`, not this.

---

## Identity, files, social

### `identity`

Name, preferred name, legal name, first/last, email, phone.

### `social`

LinkedIn, GitHub, Twitter/X, personal site, “would you like to include LinkedIn or a blog”.

### `resume_file`

Resume / CV / Curriculum. Not the “autofill from resume” helper upload.

### `other_file`

Transcript, work sample, cover letter **as a file** we do not have. Flag if required.

---

## Logistics (canned profile only)

### `location`

Where you live / are based / country of residence / city / “please indicate your current city, state, and country”. Not timezone or working-hours overlap (those are `availability`).

### `work_auth`

Authorized to work in {country}? Right to work. Citizenship as eligibility, not EEO.

### `sponsorship`

Will you now or in the future require visa / immigration sponsorship?

### `relocation`

Willing to relocate, onsite days, hub cities, “this role requires China Mainland”, hybrid office comfort.

### `remote_intent`

If remote is optional, do you plan to work remotely? “From where do you intend to work?”

### `salary`

Expected / current / desired compensation, equity.

### `availability`

Notice period, start date, earliest start, hours overlap, working hours, “are you based in an EU or equivalent timezone”, can you work US/PT hours.

---

## Employment screening

### `current_employer`

Current or previous company name.

### `current_title`

Current or previous job title.

### `prior_company`

Have you ever worked for {this company} / affiliate / contractor?

### `how_heard`

How did you hear about this job? Source checkboxes (LinkedIn, Glassdoor, blog, employee…).

### `referral`

Referred by / employee name. Linear: “Has someone at Linear referred you… include their name”.

### `education`

School, degree, discipline, dates, GPA, education history composite.

---

## Legal / consent / traps

### `legal_eeo`

Gender, race/ethnicity, Hispanic/Latino, veteran, disability, LGBTQ, pronouns when framed as demographic.

### `consent`

Privacy notice, GDPR, NDA, “I certify”, age 18+, contact my employer, candidate AI usage attestation, interview recording (BrightHire), “I agree”.

### `export_control`

ITAR, US person, sanctioned-country checklists (Cuba/Iran/… as seen on Databricks).

### `non_compete`

Subject to a non-compete or non-solicit that would block this job.

### `marketing_opt_in`

WhatsApp / SMS recruiting messages (Ramp/Vanta “Yes - I consent to receiving text messages”).

### `bot_check`

Puzzles, secrets, “prove you are not a bot”. Never solve from the résumé. Empty + flag (or skip-or-escalate).

### `unknown`

Cannot classify, or a tool/product story the résumé cannot support (proprietary SDK named in the prompt). Prefer this over a wrong narrative concept.
