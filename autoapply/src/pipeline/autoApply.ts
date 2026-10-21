import { config } from "../config.js";
import type { CritiqueResult, DraftFlag, FieldAnswer } from "../sources/types.js";

export function reviewMinScore(): number {
  const n = Number(config.reviewMinScore);
  return Number.isFinite(n) ? n : 90;
}

export function hasBlockingFlags(
  flags: DraftFlag[],
  answers: Array<Pick<FieldAnswer, "path" | "value">>,
): boolean {
  const byPath = new Map(answers.map((a) => [a.path, a.value]));
  return flags.some((f) => f.required && (byPath.get(f.path) == null || byPath.get(f.path) === ""));
}

export function autoApplyDecision(args: {
  score: number;
  flags: DraftFlag[];
  answers: Array<Pick<FieldAnswer, "path" | "value">>;
  critique: Pick<CritiqueResult, "ok" | "violations">;
}): { auto: boolean; reason: string } {
  if (args.score >= reviewMinScore()) {
    return { auto: false, reason: `Score ${args.score} ≥ ${reviewMinScore()} — Inbox review` };
  }
  if (args.score < config.matchThreshold) {
    return { auto: false, reason: `Score ${args.score} below ${config.matchThreshold}% match floor` };
  }
  if (hasBlockingFlags(args.flags, args.answers)) {
    return { auto: false, reason: "Required field still empty after repair — Inbox review" };
  }
  if ((args.critique.violations ?? []).some((v) => /invent|fabricat|not on resume/i.test(v))) {
    return { auto: false, reason: "Fabrication still in a filled answer after repair — Inbox review" };
  }
  if (!args.critique.ok) {
    return { auto: false, reason: `Critique still dirty after repair: ${(args.critique.violations[0] || "unspecified").slice(0, 180)}` };
  }
  return { auto: true, reason: `Score ${args.score} in auto-apply band (${config.matchThreshold}–${reviewMinScore() - 1})` };
}

export function shouldAutoApply(args: {
  score: number;
  flags: DraftFlag[];
  answers: Array<Pick<FieldAnswer, "path" | "value">>;
  critique: Pick<CritiqueResult, "ok" | "violations">;
}): boolean {
  return autoApplyDecision(args).auto;
}
