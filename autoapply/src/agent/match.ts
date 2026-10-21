import { z } from "zod";
import { config } from "../config.js";
import type { Profile } from "../lib/profile.js";
import type { MatchResult, NormalizedJob } from "../sources/types.js";
import { postingRefusesSponsorship, postingRequiresOffice } from "./escalate.js";
import { loadSkill } from "./loader.js";
import { completeJson } from "./model.js";
import { candidateSourcePayload } from "../lib/resumeFile.js";
import { remoteEligibility } from "../lib/eligibility.js";
import { assessLegitimacy } from "../lib/legitimacy.js";
import { sourceTrust } from "../sources/registry.js";

const matchSchema = z.object({
  score: z.number(),
  decision: z.enum(["inbox", "skip"]),
  confidence: z.enum(["high", "medium", "low"]),
  summary: z.string(),
  evidence: z.array(z.string()),
  gaps: z.array(z.string()),
  skipReason: z.string().nullable(),
});

const STOP = new Set([
  "senior",
  "staff",
  "principal",
  "junior",
  "mid",
  "intern",
  "i",
  "ii",
  "iii",
  "the",
  "of",
  "and",
  "or",
  "a",
  "an",
  "to",
  "for",
  "in",
  "remote",
  "full",
  "time",
  "fulltime",
]);

const ENG_FAMILY = new Set([
  "engineer",
  "engineering",
  "developer",
  "swe",
  "software",
  "fullstack",
  "frontend",
  "backend",
  "full-stack",
  "front-end",
  "back-end",
]);

const SENIOR_TITLE =
  /\b(sr\.?|senior|staff|principal|distinguished|fellow)\b/i;

function tokens(s: string): Set<string> {
  return new Set(
    s
      .toLowerCase()
      .split(/[^a-z0-9+]+/)
      .filter((t) => t.length > 1 && !STOP.has(t)),
  );
}

/** Whole-word match, so "intern" does not catch "Internal Tools" and "ios" does not catch "Studios". */
export function containsWord(text: string, keyword: string): boolean {
  const kw = keyword.trim().toLowerCase();
  if (!kw) return false;
  const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(`(^|[^a-z0-9])${escaped}($|[^a-z0-9])`).test(text.toLowerCase());
}

export function titlesOverlap(jobTitle: string, targetTitles: string[]): boolean {
  if (targetTitles.length === 0) return true;
  const job = tokens(jobTitle);
  const jobEng = [...job].some((t) => ENG_FAMILY.has(t));
  for (const target of targetTitles) {
    const want = tokens(target);
    if ([...want].some((t) => job.has(t))) return true;
    const wantEng = [...want].some((t) => ENG_FAMILY.has(t));
    if (wantEng && jobEng) return true;
  }
  return false;
}

export function titleSeniorityTooHigh(jobTitle: string, profile: Profile): boolean {
  if (profile.seniorityBand === "senior" || profile.seniorityBand === "staff") {
    return false;
  }
  return SENIOR_TITLE.test(jobTitle);
}

/** Strictest years-of-experience floor found in the posting. Null if none. */
export function postingMinYears(text: string): number | null {
  const blob = text.toLowerCase();
  const hits: number[] = [];
  const patterns = [
    /(\d{1,2})\s*\+\s*years?(?:\s+of)?(?:\s+(?:professional|relevant|industry|software|engineering))?(?:\s+experience)?/gi,
    /(?:at least|minimum(?: of)?)\s+(\d{1,2})\s+years/gi,
    /(\d{1,2})\s*(?:-|–|to)\s*\d{1,2}\s+years/gi,
    /(\d{1,2})\s+years?\s+(?:of\s+)?(?:professional\s+|relevant\s+|industry\s+)?experience/gi,
  ];
  for (const re of patterns) {
    for (const m of blob.matchAll(re)) {
      const n = Number(m[1]);
      if (n >= 1 && n <= 20) hits.push(n);
    }
  }
  if (!hits.length) return null;
  return Math.max(...hits);
}

export function hardFilter(
  job: NormalizedJob,
  profile: Profile,
): { skip: boolean; reason: string | null } {
  const legit = assessLegitimacy(job, sourceTrust(job.source), config.legitMinScore);
  if (!legit.ok) {
    return { skip: true, reason: `Looks like a scam (${legit.score}/100): ${legit.flags.map((f) => f.reason).join("; ")}` };
  }

  const remote = job.isRemote || job.workplaceType === "Remote";
  if (profile.remoteOnly && !remote) {
    return { skip: true, reason: "Not remote" };
  }

  if (remote) {
    const eligibility = remoteEligibility(job, profile);
    if (!eligibility.eligible) return { skip: true, reason: eligibility.reason };
  }

  const jd = `${job.title}\n${job.description}`;
  if (profile.remoteOnly && postingRequiresOffice(jd)) {
    return { skip: true, reason: "Remote tag but posting requires office days" };
  }

  const allowedTypes = profile.employmentTypes.map((t) => t.toLowerCase());
  if (
    job.employmentType &&
    allowedTypes.length > 0 &&
    !allowedTypes.includes(job.employmentType.toLowerCase())
  ) {
    return { skip: true, reason: `Employment type ${job.employmentType}` };
  }

  for (const raw of profile.excludeKeywords) {
    if (containsWord(job.title, raw)) {
      return { skip: true, reason: `Excluded keyword: ${raw.trim()}` };
    }
  }

  if (titleSeniorityTooHigh(job.title, profile)) {
    return {
      skip: true,
      reason: `Seniority too high for ${profile.seniorityBand} profile: ${job.title}`,
    };
  }

  if (!titlesOverlap(job.title, profile.targetTitles)) {
    return { skip: true, reason: `Title does not overlap target titles: ${job.title}` };
  }

  const cap = profile.maxRoleYears;
  if (cap != null) {
    const requiredYears = postingMinYears(jd);
    if (requiredYears != null && requiredYears > cap) {
      return {
        skip: true,
        reason: `Posting expects ${requiredYears}+ years; profile max is ${cap}`,
      };
    }
  }

  if (profile.requiresSponsorship && postingRefusesSponsorship(jd)) {
    return { skip: true, reason: "Posting does not sponsor; profile requires sponsorship" };
  }

  return { skip: false, reason: null };
}

export async function matchJob(args: {
  profile: Profile;
  resumeText: string;
  job: NormalizedJob;
}): Promise<MatchResult> {
  const skill = loadSkill("match-job");
  const raw = await completeJson({
    system: skill,
    user: JSON.stringify(
      {
        profile: args.profile,
        ...candidateSourcePayload(args.resumeText),
        job: args.job,
        inboxThreshold: config.matchThreshold,
      },
      null,
      2,
    ),
    schema: matchSchema,
  });

  let decision = raw.decision;
  let skipReason = raw.skipReason;
  let score = Math.max(0, Math.min(100, Math.round(raw.score)));
  const threshold = Number.isFinite(config.matchThreshold) ? config.matchThreshold : 50;

  if (score >= threshold && raw.evidence.length > 0) {
    decision = "inbox";
    skipReason = null;
  } else if (decision === "inbox" && raw.evidence.length === 0) {
    decision = "skip";
    skipReason = "Inbox decision had no resume evidence";
  } else if (score < threshold) {
    decision = "skip";
    skipReason = skipReason ?? `Score ${score} below ${threshold}% match`;
  }

  return {
    ...raw,
    score,
    decision,
    skipReason: decision === "skip" ? skipReason || "Skipped" : null,
  };
}

/**
 * Keyword fit for when no model is configured: profile skills named in the posting, plus a
 * bonus when the title is one of the target titles. Good enough to sort an "Apply yourself"
 * list; it never feeds an auto-submit.
 */
export function heuristicMatch(job: NormalizedJob, profile: Profile): MatchResult {
  const text = `${job.title}\n${job.description}`;
  const hits = profile.skills.filter((s) => containsWord(text, s));
  const titleHit = profile.targetTitles.find((t) => containsWord(job.title, t));
  const score = Math.min(95, 30 + hits.length * 7 + (titleHit ? 20 : 0));
  const threshold = Number.isFinite(config.matchThreshold) ? config.matchThreshold : 50;
  const inbox = score >= threshold && hits.length >= 2;
  const evidence = [
    ...(titleHit ? [`Title matches target title "${titleHit}"`] : []),
    ...(hits.length ? [`Posting names ${hits.slice(0, 8).join(", ")}, all on the resume`] : []),
  ];
  return {
    score,
    decision: inbox ? "inbox" : "skip",
    confidence: "low",
    summary: `Keyword match (no model configured): ${hits.length} of your skills named${titleHit ? ", title matches" : ""}.`,
    evidence,
    gaps: [],
    skipReason: inbox ? null : `Keyword score ${score}, ${hits.length} skill(s) named`,
  };
}
