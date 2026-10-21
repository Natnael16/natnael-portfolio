import { z } from "zod";
import type { Profile } from "../lib/profile.js";
import type {
  ApplyForm,
  DraftResult,
  FieldAnswer,
  MatchResult,
  NormalizedJob,
} from "../sources/types.js";
import { loadSkill, loadSkills } from "./loader.js";
import { completeJson } from "./model.js";
import { heuristicConcept, identityAnswer, prefillAnswer } from "./prefill.js";
import { candidateSourcePayload } from "../lib/resumeFile.js";

export { identityAnswer } from "./prefill.js";

const SILENCE_CONCEPTS = new Set([
  "legal_eeo",
  "referral",
  "consent",
  "marketing_opt_in",
  "bot_check",
]);

function promptRequiresMissingTool(label: string, resumeText: string): boolean {
  if (!/sdk|proprietary tool/i.test(label)) return false;
  const hay = resumeText.toLowerCase();
  const hits = label.match(/([A-Za-z][\w]+(?:\s+[A-Za-z][\w]+){0,2}\s+SDK(?:\s+v?\d+)?)/gi) ?? [];
  if (hits.some((hit) => !hay.includes(hit.toLowerCase()))) return true;
  return /proprietary tool/i.test(label) && !/proprietary/i.test(hay);
}

const classifySchema = z.object({
  fields: z.array(
    z.object({
      path: z.string(),
      concept: z.string().optional(),
      type: z.string().optional(),
      required: z.boolean().optional(),
    }),
  ),
});

const draftSchema = z.object({
  answers: z.array(
    z.object({
      path: z.string(),
      type: z.string(),
      value: z.string().nullable(),
      confidence: z.enum(["high", "medium", "low"]),
      source: z.enum(["profile", "resume", "canned", "empty"]),
    }),
  ),
  flags: z.array(
    z.object({
      path: z.string(),
      reason: z.string(),
      required: z.boolean(),
    }),
  ),
  coverLetter: z.string().nullable().optional(),
});

export async function draftApplication(args: {
  profile: Profile;
  resumeText: string;
  job: NormalizedJob;
  match: MatchResult;
  form: ApplyForm;
}): Promise<DraftResult> {
  const classified = await completeJson({
    system: loadSkill("classify-questions"),
    user: JSON.stringify({ fields: args.form.fields }, null, 2),
    schema: classifySchema,
  });

  const classifiedByPath = new Map(classified.fields.map((f) => [f.path, f]));
  const prefilledByPath = new Map<string, FieldAnswer>();

  const formFields = args.form.fields.map((field) => {
    const tagged = classifiedByPath.get(field.path);
    const taggedConcept = tagged?.concept || tagged?.type;
    const concept =
      (taggedConcept && taggedConcept !== "unknown" ? taggedConcept : "") ||
      heuristicConcept(field) ||
      "unknown";
    const prefilled = prefillAnswer(args.profile, field, concept, args.job);
    if (prefilled && (prefilled.value || prefilled.source === "profile")) {
      prefilledByPath.set(field.path, { ...prefilled, type: concept || prefilled.type });
    }
    return {
      path: field.path,
      prompt: field.label,
      required: tagged?.required ?? field.required,
      inputKind: field.inputKind,
      options: field.options,
      concept,
      prefilled: prefilled?.value ?? null,
    };
  });

  const drafted = await completeJson({
    system: loadSkills([
      "draft-answers",
      "fill-widgets",
      "cover-letter",
      "wording",
      "logistics-and-comp",
      "skip-or-escalate",
    ]),
    user: JSON.stringify(
      {
        instruction:
          "Fill every required prompt from resumePdf AND masterProfile. masterProfile is the candidate/*.md extended profile and is not optional. If a yes/no is in neither file, answer No. Remote salary is profile.salaryBand (convert month/year if the prompt asks for the other period); if it is empty, leave salary null and flag it. Empty only for optional EEO, no referral, or a named SDK that is not in either file.",
        profile: args.profile,
        ...candidateSourcePayload(args.resumeText),
        job: args.job,
        match: args.match,
        form: {
          pageUrl: args.form.pageUrl,
          fields: formFields,
        },
      },
      null,
      2,
    ),
    schema: draftSchema,
  });

  const byPath = new Map<string, FieldAnswer>();
  for (const a of drafted.answers) {
    const field = args.form.fields.find((f) => f.path === a.path);
    byPath.set(a.path, {
      ...a,
      label: field?.label ?? a.path,
    });
  }
  for (const [path, ans] of prefilledByPath) {
    byPath.set(path, ans);
  }

  const merged: FieldAnswer[] = [];
  const flags = [...drafted.flags];
  for (const field of args.form.fields) {
    const tagged = classifiedByPath.get(field.path);
    const taggedConcept = tagged?.concept || tagged?.type;
    const concept =
      (taggedConcept && taggedConcept !== "unknown" ? taggedConcept : "") ||
      heuristicConcept(field) ||
      "unknown";
    let ans = byPath.get(field.path);
    if (!ans) {
      ans = {
        path: field.path,
        label: field.label,
        type: concept,
        value: null,
        confidence: "low",
        source: "empty",
      };
    } else {
      ans = { ...ans, label: field.label, type: ans.type || concept };
    }
    if (promptRequiresMissingTool(field.label, args.resumeText)) {
      ans = { ...ans, value: null, source: "empty", confidence: "low" };
      if (!flags.some((f) => f.path === field.path)) {
        flags.push({
          path: field.path,
          reason: "Named tool in the prompt is not in the resume PDF or master profile",
          required: field.required,
        });
      }
    }
    if (SILENCE_CONCEPTS.has(concept) && (ans.value == null || ans.value === "") && !field.required) {
      merged.push(ans);
      continue;
    }
    merged.push(ans);
    if (field.required && (ans.value == null || ans.value === "")) {
      if (!flags.some((f) => f.path === field.path)) {
        flags.push({
          path: field.path,
          reason: "Required field empty — do not invent an answer",
          required: true,
        });
      }
    }
  }

  const cover =
    drafted.coverLetter ??
    merged.find((a) =>
      ["cover_letter", "why_company", "why_role", "why_you"].includes(a.type),
    )?.value ??
    null;

  return { answers: merged, flags, coverLetter: cover };
}
