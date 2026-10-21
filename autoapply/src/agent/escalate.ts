import type { Profile } from "../lib/profile.js";
import type { DraftResult, MatchResult, NormalizedJob } from "../sources/types.js";

export type EscalateDecision = {
  action: "skip" | "inbox";
  reason: string | null;
};

const NO_SPONSOR =
  /cannot (provide |offer )?visa sponsorship|we (do not|don't|cannot) sponsor|no sponsorship|must (already )?be authorized|without (the )?need for sponsorship|not (able|willing) to sponsor/i;

const OFFICE_DAYS =
  /\b(\d|two|three|four|five)\s+days?\s+(a|per)\s+week\b|\b(in[- ]office|on-?site)\b.{0,40}\b(required|must)\b|\bmust work from\b.{0,60}\b(hq|office|new york|nyc|san francisco|sf)\b|\brelocation required\b/i;

export function postingRefusesSponsorship(description: string): boolean {
  return NO_SPONSOR.test(description);
}

export function postingRequiresOffice(description: string): boolean {
  if (!OFFICE_DAYS.test(description)) return false;
  if (/optional (office|onsite|in[- ]office)|no office (required|days)|fully remote/i.test(description)) {
    return false;
  }
  return true;
}

export function skipAfterMatch(args: {
  profile: Profile;
  job: NormalizedJob;
  match: MatchResult;
}): EscalateDecision {
  const jd = `${args.job.title}\n${args.job.description}`;
  if (args.profile.requiresSponsorship && postingRefusesSponsorship(jd)) {
    return { action: "skip", reason: "Posting does not sponsor; profile requires sponsorship" };
  }
  if (args.profile.remoteOnly && postingRequiresOffice(jd)) {
    return { action: "skip", reason: "Remote-only profile vs office days in the posting" };
  }
  if (
    args.profile.workAuthorization &&
    /must be (a )?us (citizen|person)|us person only|citizenship required/i.test(jd) &&
    !/us citizen|united states citizen|u\.s\. citizen/i.test(args.profile.workAuthorization)
  ) {
    return { action: "skip", reason: "Citizenship/US-person requirement vs profile" };
  }
  if (args.match.decision === "skip") {
    return { action: "skip", reason: args.match.skipReason };
  }
  return { action: "inbox", reason: null };
}

export function skipAfterDraft(args: {
  match: MatchResult;
  draft: DraftResult;
  fabricationCount: number;
}): EscalateDecision {
  if (args.fabricationCount >= 2) {
    return { action: "skip", reason: "Two or more fabrication violations" };
  }
  const requiredBot = args.draft.answers.some(
    (a) => a.type === "bot_check" && (a.value == null || a.value === "") &&
      args.draft.flags.some((f) => f.path === a.path && f.required),
  );
  if (requiredBot && args.match.score < 75) {
    return { action: "skip", reason: "Required bot-check / puzzle on a weak match" };
  }
  return { action: "inbox", reason: null };
}
