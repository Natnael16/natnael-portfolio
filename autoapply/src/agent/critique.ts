import { z } from "zod";
import type { Profile } from "../lib/profile.js";
import type {
  ApplyField,
  ApplyForm,
  CritiqueResult,
  DraftFlag,
  DraftResult,
  FieldAnswer,
  MatchResult,
  NormalizedJob,
} from "../sources/types.js";
import { loadSkills } from "./loader.js";
import { completeJson } from "./model.js";
import { candidateSourcePayload } from "../lib/resumeFile.js";
import { prefillAnswer } from "./prefill.js";
import { shouldTickConsent } from "../lib/consent.js";

const critiqueSchema = z.object({
  ok: z.boolean(),
  violations: z.array(z.string()),
  flags: z.array(
    z.object({
      path: z.string(),
      reason: z.string(),
      required: z.boolean(),
    }),
  ),
  corrections: z
    .array(
      z.object({
        path: z.string(),
        value: z.string(),
        source: z.enum(["profile", "resume", "canned", "empty"]).optional(),
      }),
    )
    .optional(),
  strippedPaths: z.array(z.string()).optional(),
});

const resumeNeedles = (resume: string, profile: Profile) =>
  [resume, profile.name, profile.email, ...profile.skills].join("\n").toLowerCase();

const FILLER_WORD =
  /\b(genuinely|honestly|frankly|passionate|thrilled|delighted|leverage|utilize|furthermore|moreover|holistic|synergy|delve|seamless|cutting-edge|world-class|best-in-class|multifaceted|comprehensive|overarching|subsequently|albeit|noteworthy|invaluable|spearhead|firstly|secondly)\b/i;

const AI_TRACE =
  /\b(as an ai|i am an ai|i'm an ai|automated application|auto-?apply|this application was (generated|drafted)|written by (an )?(ai|chatgpt|a language model)|form filler)\b/i;

export function proseIssues(text: string): string[] {
  const issues: string[] = [];
  if (!text || text.length < 24) return issues;
  if (/;/.test(text)) issues.push("semicolon");
  if (/[—–…]/.test(text)) issues.push("stylized punctuation");
  if (/[“”‘’]/.test(text)) issues.push("smart quotes");
  if (AI_TRACE.test(text)) issues.push("AI or automation trace");
  if (FILLER_WORD.test(text)) issues.push("filler or jargon");
  for (const sentence of text.split(/[.!?]+/)) {
    const commas = (sentence.match(/,/g) ?? []).length;
    if (commas >= 3) {
      issues.push("too many commas");
      break;
    }
  }
  return issues;
}

const FILLER_STRIP =
  /\b(genuinely|honestly|frankly|furthermore|moreover|subsequently|albeit|noteworthy|invaluable)\b/gi;

function splitCommaHeavy(sentence: string): string {
  const commas = (sentence.match(/,/g) ?? []).length;
  if (commas < 3) return sentence;
  const parts = sentence.split(",").map((s) => s.trim()).filter(Boolean);
  if (parts.length < 4) return sentence;
  const first = parts.slice(0, 2).join(", ");
  const rest = parts.slice(2).join(", ");
  const second = rest.charAt(0).toUpperCase() + rest.slice(1);
  return `${first.replace(/[.!?]$/, "")}. ${second}`;
}

/** Deterministic wording cleanup so critique can fix instead of only reporting. */
export function rewriteProse(text: string): string {
  let t = text
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/[—–]/g, ", ")
    .replace(/;/g, ".")
    .replace(/…/g, ".")
    .replace(FILLER_STRIP, "")
    .replace(/\s+,/g, ",")
    .replace(/,\s*,/g, ",")
    .replace(/\s+\./g, ".")
    .replace(/\s{2,}/g, " ")
    .trim();
  t = t
    .split(/(?<=[.!?])\s+/)
    .map(splitCommaHeavy)
    .join(" ");
  return t.replace(/\s{2,}/g, " ").trim();
}

function rewriteProseUntilClean(text: string): string {
  let t = rewriteProse(text);
  for (let i = 0; i < 3; i++) {
    if (!proseIssues(t).length) return t;
    t = rewriteProse(t);
  }
  return t;
}

function autoFixAnswer(ans: FieldAnswer): FieldAnswer {
  if (!ans.value) return ans;
  if (ans.type === "identity" || ans.type === "social" || ans.type === "resume_file") return ans;
  if (ans.value.length < 24) return ans;
  if (!proseIssues(ans.value).length) return ans;
  const fixed = rewriteProseUntilClean(ans.value);
  if (!fixed || fixed === ans.value) return ans;
  return { ...ans, value: fixed };
}

export function localCritique(args: {
  profile: Profile;
  resumeText: string;
  draft: DraftResult;
}): CritiqueResult {
  const violations: string[] = [];
  const flags = [...args.draft.flags];
  const haystack = resumeNeedles(args.resumeText, args.profile);

  for (const ans of args.draft.answers) {
    if (ans.value && ans.type !== "identity" && ans.type !== "social") {
      const issues = proseIssues(ans.value);
      if (issues.length) {
        violations.push(`Wording ${issues.join(", ")} (${ans.path})`);
      }
    }
    if (ans.type === "identity" && ans.path.match(/email/i) && ans.value && ans.value !== args.profile.email) {
      violations.push(`Identity email does not match profile (${ans.path})`);
    }
    if (ans.type === "identity" && ans.path.match(/name/i) && args.profile.name && ans.value && ans.value !== args.profile.name) {
      violations.push(`Identity name does not match profile (${ans.path})`);
    }
    if (ans.source === "resume" && ans.value) {
      const years = ans.value.match(/\b(19|20)\d{2}\b/g) ?? [];
      for (const y of years) {
        if (!haystack.includes(y) && !args.resumeText.includes(y)) {
          flags.push({
            path: ans.path,
            reason: `Year ${y} not found in resume/profile — verify before approve`,
            required: false,
          });
        }
      }
      if (/principal engineer/i.test(ans.value) && !/principal engineer/i.test(args.resumeText)) {
        violations.push(`Title not on resume (${ans.path})`);
      }
      if (/at stripe/i.test(ans.value) && !/engineer — stripe|engineer at stripe/i.test(args.resumeText)) {
        violations.push(`Employer Stripe not on resume (${ans.path})`);
      }
      if (/revenue/i.test(ans.value) && /\d+\s*%/.test(ans.value) && !/revenue/i.test(args.resumeText)) {
        violations.push(`Revenue metric not on resume (${ans.path})`);
      }
    }
  }

  const cover = args.draft.coverLetter;
  if (cover) {
    const generic =
      /passionate about your mission|thrive in fast-paced|synergy|leverage my|i am writing to express|proven track record|results-driven|i look forward to hearing|thank you for your consideration|genuinely|automated application|as an ai/i.test(
        cover,
      );
    if (generic) violations.push("Cover letter contains generic filler");
    for (const issue of proseIssues(cover)) {
      violations.push(`Cover letter wording: ${issue}`);
    }
  }

  const low = args.draft.answers.filter((a) => a.type !== "identity" && a.confidence === "low").length;
  const nonId = args.draft.answers.filter((a) => a.type !== "identity").length;
  if (nonId > 2 && low / nonId > 0.5) {
    violations.push("More than half of non-identity fields are low confidence");
  }

  return {
    ok: violations.length === 0,
    violations,
    flags,
  };
}

export async function critiqueDraft(args: {
  profile: Profile;
  resumeText: string;
  job: NormalizedJob;
  match: MatchResult;
  draft: DraftResult;
}): Promise<CritiqueResult> {
  const local = localCritique(args);
  const remote = await completeJson({
    system: `${loadSkills(["draft-answers", "fill-widgets", "cover-letter", "wording", "logistics-and-comp", "skip-or-escalate"])}

You are the fix pass, not a reporter. Approve is one click. Do not leave a review note for something you can correct.

For every field:
- Use **both** candidate files. resumePdf is candidate/resume.pdf. masterProfile is candidate/*.md and is the extended source of truth. Do not say a fact is missing if it is in the markdown.
- If resumePdf or masterProfile has the fact, fill it. If a yes/no is in neither, answer No and fill.
- Required experience prompts (SMTP, MTAs, DNS): use queues/retries/Redis from masterProfile. Say those mail systems are not in the files. Do not leave empty.
- If wording is bad (semicolons, stacked commas, filler like genuinely, AI traces), put a rewritten value in corrections. Do not only list it in violations.
- If identity/social/sponsorship/availability mismatches the profile, correct it from the profile. timezoneFlexible true means Yes on hours/timezone-overlap questions is correct even when home is Ethiopia.
- If a value invents employers, titles, dates, metrics, or a named SDK not in resumePdf, masterProfile, or the dashboard profile, put the path in strippedPaths. Do not invent Harbor Widget SDK (or similar) stories.
- Optional EEO and referral (when referralName is empty) stay empty. Do not flag those as problems.
- Consent checkboxes: tick only when the form marks them required. Optional consent stays empty unless the matching profile flag is on.
- Flag only when a required salary number is unknown, or a named SDK is not in either candidate file.

violations: fabrications only. corrections: rewritten or newly filled values. strippedPaths: invented values to clear.`,
    user: JSON.stringify(
      {
        profile: args.profile,
        ...candidateSourcePayload(args.resumeText),
        job: { title: args.job.title, companyName: args.job.companyName },
        match: args.match,
        draft: args.draft,
        localCritique: local,
      },
      null,
      2,
    ),
    schema: critiqueSchema,
  });

  const flags = [...local.flags, ...remote.flags];
  const violations = [...new Set([...local.violations, ...remote.violations])];
  const corrections = [...(remote.corrections ?? [])];
  const strippedPaths = [...new Set([...(remote.strippedPaths ?? [])])];
  const fabrication = violations.filter((v) => /invent|fabricat|not on resume/i.test(v));
  return {
    ok: fabrication.length === 0 && violations.filter((v) => /wording/i.test(v)).length === 0,
    violations,
    flags,
    corrections,
    strippedPaths,
  };
}

function pathsFromViolations(violations: string[]): string[] {
  return violations
    .map((v) => v.match(/\(([^)]+)\)/)?.[1])
    .filter((x): x is string => Boolean(x));
}

export function applyCritique(draft: DraftResult, critique: CritiqueResult): DraftResult {
  const strip = new Set([
    ...(critique.strippedPaths ?? []),
    ...pathsFromViolations(critique.violations.filter((v) => /invent|fabricat|not on resume/i.test(v))),
  ]);
  const byCorrection = new Map((critique.corrections ?? []).map((c) => [c.path, c]));

  const answers = draft.answers.map((a) => {
    const cor = byCorrection.get(a.path);
    let next: FieldAnswer = cor
      ? {
          ...a,
          value: cor.value,
          source: cor.source ?? (a.source === "empty" ? "resume" : a.source),
          confidence: "high",
        }
      : a;
    if (strip.has(a.path)) {
      next = { ...next, value: null, source: "empty", confidence: "low" };
    } else {
      next = autoFixAnswer(next);
    }
    return next;
  });

  const seen = new Set<string>();
  const flags = critique.flags.filter((f) => {
    const ans = answers.find((a) => a.path === f.path);
    if (ans?.value && /wording|comma|semicolon|empty|incorrect|inaccurate|time zone|timezone|unrecognized/i.test(f.reason)) {
      return false;
    }
    if (ans?.value && /no (documented )?professional experience|not present on the resume|not on the resume/i.test(f.reason)) {
      return false;
    }
    if (ans?.value && !f.required) return false;
    if (!f.required && (ans?.value == null || ans.value === "") && /eeo|referral|consent|optional/i.test(f.reason)) {
      return false;
    }
    const key = `${f.path}|${f.reason}|${f.required}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const cover =
    draft.coverLetter && proseIssues(draft.coverLetter).length
      ? rewriteProseUntilClean(draft.coverLetter)
      : draft.coverLetter;

  return { ...draft, answers, flags, coverLetter: cover };
}

function violationStillApplies(v: string, draft: DraftResult, profile?: Profile): boolean {
  if (profile?.timezoneFlexible && /time ?zone|hours overlap|americas time/i.test(v)) {
    return false;
  }
  const path = v.match(/\(([^)]+)\)/)?.[1];
  const ans = path ? draft.answers.find((a) => a.path === path) : undefined;
  if (/wording|cover letter wording/i.test(v)) {
    if (!path) return proseIssues(draft.coverLetter ?? "").length > 0;
    if (!ans?.value) return false;
    return proseIssues(ans.value).length > 0;
  }
  if (/invent|fabricat|not on resume|title not on resume|employer .+ not on resume|revenue metric/i.test(v)) {
    return Boolean(ans?.value);
  }
  if (/identity email/i.test(v)) {
    return Boolean(ans?.value && profile?.email && ans.value !== profile.email);
  }
  if (/identity name/i.test(v)) {
    return Boolean(ans?.value && profile?.name && ans.value !== profile.name);
  }
  if (/more than half of non-identity fields are low confidence/i.test(v)) {
    const nonId = draft.answers.filter((a) => a.type !== "identity");
    const low = nonId.filter((a) => a.confidence === "low").length;
    return nonId.length > 2 && low / nonId.length > 0.5;
  }
  if (/cover letter contains generic filler/i.test(v)) {
    return Boolean(
      draft.coverLetter &&
        /passionate about your mission|thrive in fast-paced|synergy|leverage my|i am writing to express|proven track record|results-driven|i look forward to hearing|thank you for your consideration|genuinely|automated application|as an ai/i.test(
          draft.coverLetter,
        ),
    );
  }
  return true;
}

export function critiqueAfterFixes(
  draft: DraftResult,
  critique: CritiqueResult,
  profile?: Profile,
): CritiqueResult {
  const violations = critique.violations.filter((v) => violationStillApplies(v, draft, profile));
  const liveFabrication = violations.some((v) => /invent|fabricat|not on resume/i.test(v));
  const liveWording = violations.some((v) => /wording|cover letter/i.test(v));
  return {
    ...critique,
    ok: !liveFabrication && !liveWording,
    violations,
    flags: draft.flags,
  };
}

const repairSchema = z.object({
  answers: z.array(z.object({ path: z.string(), value: z.string() })),
});

function resumeSupportsPrompt(label: string, resumeText: string): boolean {
  if (!/sdk|proprietary tool/i.test(label)) return true;
  const hay = resumeText.toLowerCase();
  const hits = label.match(/([A-Za-z][\w]+(?:\s+[A-Za-z][\w]+){0,2}\s+SDK(?:\s+v?\d+)?)/gi) ?? [];
  if (hits.some((hit) => !hay.includes(hit.toLowerCase()))) return false;
  return !(/proprietary tool/i.test(label) && !/proprietary/i.test(hay));
}

const LEAVE_EMPTY_TYPES = new Set([
  "legal_eeo",
  "referral",
  "consent",
  "marketing_opt_in",
  "bot_check",
  "other_file",
]);

function fieldFor(form: ApplyForm | undefined, path: string) {
  return form?.fields.find((f) => f.path === path);
}

function isRequired(ans: FieldAnswer, form?: ApplyForm): boolean {
  return Boolean(fieldFor(form, ans.path)?.required);
}

function mustLeaveEmpty(
  ans: FieldAnswer,
  profile: Profile,
  resumeText: string,
  field?: ApplyField,
): boolean {
  const label = ans.label ?? field?.label ?? "";
  if (LEAVE_EMPTY_TYPES.has(ans.type)) {
    if (ans.type === "referral") return !profile.referralName;
    if (ans.type === "consent" || ans.type === "marketing_opt_in") {
      return !shouldTickConsent(
        field ?? { path: ans.path, label: ans.label ?? "", required: false },
        profile,
      );
    }
    return true;
  }
  if (ans.type === "salary" || /\b(salary|compensation|expected pay|pay expectation)\b/i.test(label)) {
    return !profile.salaryBand.trim();
  }
  if (field?.inputKind === "file" && ans.type !== "resume_file") return true;
  if (!resumeSupportsPrompt(label, resumeText)) return true;
  return false;
}

function defaultNoValue(field?: ApplyField): string | null {
  if (!field) return null;
  if (field.inputKind === "checkbox" && field.options.length === 0) return "false";
  if (!field.options.length) return null;
  const hit = field.options.find((o) => /^(no|false|none of the above)\b/i.test(o.trim()));
  return hit ?? null;
}

function canDefaultNo(ans: FieldAnswer): boolean {
  if (["work_auth", "sponsorship", "export_control", "consent", "legal_eeo", "availability"].includes(ans.type)) {
    return false;
  }
  const label = ans.label ?? "";
  return /\b(experience|familiar|have you (worked|used|built)|do you have|proficient|worked with|used .{2,40} before)\b/i.test(
    label,
  );
}

function dropFilledFlags(draft: DraftResult): DraftResult {
  const flags = draft.flags.filter((f) => {
    const ans = draft.answers.find((a) => a.path === f.path);
    return !ans?.value;
  });
  return { ...draft, flags };
}

function applyDeterministicFixes(
  draft: DraftResult,
  profile: Profile,
  resumeText: string,
  form?: ApplyForm,
): DraftResult {
  const answers = draft.answers.map((a) => {
    let next = autoFixAnswer(a);
    const field = fieldFor(form, a.path);
    if (next.type === "resume_file" && !next.value) {
      next = { ...next, value: "{{resume}}", source: "profile", confidence: "high" };
    }
    if (field && (!next.value || next.type === "identity" || next.type === "social")) {
      const pre = prefillAnswer(profile, field, next.type || "");
      if (pre?.value && (!next.value || next.type === "identity" || next.type === "social")) {
        next = { ...next, value: pre.value, source: pre.source, confidence: "high", type: pre.type || next.type };
      }
    }
    if (
      !next.value &&
      isRequired(next, form) &&
      canDefaultNo(next) &&
      !mustLeaveEmpty(next, profile, resumeText, field)
    ) {
      const no = defaultNoValue(field);
      if (no) next = { ...next, value: no, source: "canned", confidence: "high" };
    }
    return next;
  });
  const cover =
    draft.coverLetter && proseIssues(draft.coverLetter).length
      ? rewriteProseUntilClean(draft.coverLetter)
      : draft.coverLetter;
  return dropFilledFlags({ ...draft, answers, coverLetter: cover });
}

function rebuildFlags(
  draft: DraftResult,
  profile: Profile,
  resumeText: string,
  form?: ApplyForm,
): DraftFlag[] {
  const flags: DraftFlag[] = [];
  for (const ans of draft.answers) {
    if (ans.value) continue;
    const field = fieldFor(form, ans.path);
    const required = field?.required || draft.flags.some((f) => f.path === ans.path && f.required);
    if (!required) continue;
    let reason = "Required field empty after repair";
    if (mustLeaveEmpty(ans, profile, resumeText, field)) {
      if (!resumeSupportsPrompt(ans.label ?? field?.label ?? "", resumeText)) {
        reason = "Named tool in the prompt is not in the resume PDF or master profile";
      } else if (ans.type === "salary") {
        reason = "Required salary is not on the profile";
      } else if (ans.type === "other_file" || field?.inputKind === "file") {
        reason = "Required extra file is not on the profile";
      } else if (ans.type === "bot_check") {
        reason = "Required bot-check / puzzle";
      } else {
        reason = "Required field cannot be filled from resume or profile";
      }
    }
    flags.push({ path: ans.path, reason, required: true });
  }
  return flags;
}

function repairTargets(
  draft: DraftResult,
  profile: Profile,
  resumeText: string,
  form?: ApplyForm,
): { empty: FieldAnswer[]; wording: FieldAnswer[] } {
  const empty: FieldAnswer[] = [];
  const wording: FieldAnswer[] = [];
  for (const ans of draft.answers) {
    const field = fieldFor(form, ans.path);
    if (!ans.value) {
      if (mustLeaveEmpty(ans, profile, resumeText, field)) continue;
      if (isRequired(ans, form) || FILLABLE_TYPES.has(ans.type)) empty.push(ans);
      continue;
    }
    if (ans.type === "identity" || ans.type === "social" || ans.type === "resume_file") continue;
    if (proseIssues(ans.value).length) wording.push(ans);
  }
  return { empty, wording };
}

const FILLABLE_TYPES = new Set([
  "why_company",
  "why_role",
  "why_you",
  "highlight",
  "cover_letter",
  "behavioral",
  "relevant_experience",
]);

async function repairDraftPass(args: {
  profile: Profile;
  resumeText: string;
  job: NormalizedJob;
  draft: DraftResult;
  form?: ApplyForm;
  issues: string[];
}): Promise<DraftResult> {
  const { empty, wording } = repairTargets(args.draft, args.profile, args.resumeText, args.form);
  if (!empty.length && !wording.length) return args.draft;

  const repaired = await completeJson({
    system: `${loadSkills(["draft-answers", "fill-widgets", "cover-letter", "wording", "logistics-and-comp"])}

You are the fix pass. Do not leave a review note for something you can correct.

For empty fields: fill from resumePdf or masterProfile (candidate/*.md). If a yes/no is in neither file, answer No using an exact option when options exist. If the prompt lists SMTP or MTAs, use queues/retries/Redis from masterProfile and say those mail systems are not in the files. Do not claim SMTP.

For wording fields: rewrite in place. Short sentences. No semicolons, stacked commas, filler, or AI traces.

Skip only a named SDK that is not in either file, optional EEO, or no referral.
Return every path you filled or rewrote.`,
    user: JSON.stringify(
      {
        profile: args.profile,
        ...candidateSourcePayload(args.resumeText),
        job: { title: args.job.title, companyName: args.job.companyName },
        leftoverIssues: args.issues,
        emptyFields: empty.map((a) => {
          const field = fieldFor(args.form, a.path);
          return {
            path: a.path,
            prompt: a.label,
            concept: a.type,
            required: isRequired(a, args.form),
            inputKind: field?.inputKind,
            options: field?.options ?? [],
          };
        }),
        wordingFields: wording.map((a) => ({ path: a.path, prompt: a.label, value: a.value })),
      },
      null,
      2,
    ),
    schema: repairSchema,
  });

  const byPath = new Map(repaired.answers.map((a) => [a.path, a.value]));
  const answers = args.draft.answers.map((a) => {
    const value = byPath.get(a.path);
    if (!value) return a;
    if (a.value && !wording.some((w) => w.path === a.path)) return a;
    return autoFixAnswer({ ...a, value, source: a.value ? a.source : "resume", confidence: "high" });
  });
  const cover =
    args.draft.coverLetter ||
    answers.find((a) => a.type === "cover_letter" || /why do you want to join/i.test(a.label ?? ""))?.value ||
    null;
  return dropFilledFlags({ ...args.draft, answers, coverLetter: cover });
}

/** Fill empty narrative fields that resume/profile can answer. */
export async function repairFillableEmpties(args: {
  profile: Profile;
  resumeText: string;
  job: NormalizedJob;
  draft: DraftResult;
  form?: ApplyForm;
}): Promise<DraftResult> {
  return repairDraftPass({ ...args, issues: [] });
}

function needsAnotherHealPass(
  draft: DraftResult,
  critique: CritiqueResult,
  profile: Profile,
  resumeText: string,
  form?: ApplyForm,
): boolean {
  if (!critique.ok) return true;
  const { empty, wording } = repairTargets(draft, profile, resumeText, form);
  return empty.length > 0 || wording.length > 0;
}

/** Apply critique corrections, then keep repairing until the draft is clean or leftover fields are truly unfillable. */
export async function healDraft(args: {
  profile: Profile;
  resumeText: string;
  job: NormalizedJob;
  match: MatchResult;
  form: ApplyForm;
  draft: DraftResult;
  critique: CritiqueResult;
}): Promise<{ draft: DraftResult; critique: CritiqueResult; passes: number }> {
  let draft = applyCritique(args.draft, args.critique);
  draft = applyDeterministicFixes(draft, args.profile, args.resumeText, args.form);
  draft = await repairDraftPass({
    profile: args.profile,
    resumeText: args.resumeText,
    job: args.job,
    draft,
    form: args.form,
    issues: args.critique.violations,
  });
  draft = applyDeterministicFixes(draft, args.profile, args.resumeText, args.form);
  draft = { ...draft, flags: rebuildFlags(draft, args.profile, args.resumeText, args.form) };
  let critique = critiqueAfterFixes(draft, args.critique, args.profile);
  let passes = 1;

  if (needsAnotherHealPass(draft, critique, args.profile, args.resumeText, args.form)) {
    passes += 1;
    const again = await critiqueDraft({
      profile: args.profile,
      resumeText: args.resumeText,
      job: args.job,
      match: args.match,
      draft,
    });
    draft = applyCritique(draft, again);
    draft = applyDeterministicFixes(draft, args.profile, args.resumeText, args.form);
    draft = await repairDraftPass({
      profile: args.profile,
      resumeText: args.resumeText,
      job: args.job,
      draft,
      form: args.form,
      issues: again.violations,
    });
    draft = applyDeterministicFixes(draft, args.profile, args.resumeText, args.form);
    draft = { ...draft, flags: rebuildFlags(draft, args.profile, args.resumeText, args.form) };
    critique = critiqueAfterFixes(draft, again, args.profile);
  }

  return { draft, critique, passes };
}
