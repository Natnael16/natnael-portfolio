import { and, eq } from "drizzle-orm";
import { config } from "../config.js";
import { critiqueDraft, healDraft } from "../agent/critique.js";
import { draftApplication } from "../agent/draft.js";
import { skipAfterDraft, skipAfterMatch } from "../agent/escalate.js";
import { hardFilter, matchJob } from "../agent/match.js";
import { db } from "../db/client.js";
import { autoApplyDecision } from "./autoApply.js";
import { isRetryableFailure } from "./retry.js";
import { applications, jobs } from "../db/schema.js";
import { loadProfileRecord, syncCandidateResume } from "../lib/store.js";
import { logAppEvent } from "../lib/appLog.js";
import { nowIso } from "../lib/time.js";
import { ApplyPageMissingError } from "../sources/ashby.js";
import { getSource } from "../sources/registry.js";
import type { NormalizedJob } from "../sources/types.js";

export type ProcessStats = {
  considered: number;
  skipped: number;
  matched: number;
  drafted: number;
  pending: number;
  failed: number;
  retried: number;
  alreadyScanned: number;
  tooOld: number;
  queuedAuto: number;
};

function postedWithin(publishedAt: string | null, maxAgeMs: number): boolean {
  if (!publishedAt) return false;
  const t = Date.parse(publishedAt);
  if (Number.isNaN(t)) return false;
  return Date.now() - t <= maxAgeMs;
}

function toNormalized(row: typeof jobs.$inferSelect): NormalizedJob {
  return {
    source: row.source,
    sourceJobId: row.sourceJobId,
    companySlug: row.companySlug,
    companyName: row.companyName,
    title: row.title,
    isRemote: row.isRemote,
    workplaceType: row.workplaceType,
    location: row.location,
    employmentType: row.employmentType,
    department: row.department,
    team: row.team,
    description: row.description,
    applyUrl: row.applyUrl,
    jobUrl: row.jobUrl,
    compensation: row.compensation,
    publishedAt: row.publishedAt ?? null,
  };
}

function insertApp(jobId: number, status: string, extra: Partial<typeof applications.$inferInsert> = {}) {
  const ts = nowIso();
  const row = db
    .insert(applications)
    .values({
      jobId,
      status,
      createdAt: ts,
      updatedAt: ts,
      ...extra,
    })
    .returning({ id: applications.id })
    .all();
  return row[0].id;
}

function updateApp(id: number, extra: Partial<typeof applications.$inferInsert>) {
  db.update(applications)
    .set({ ...extra, updatedAt: nowIso() })
    .where(eq(applications.id, id))
    .run();
}

async function processOne(
  jobRow: typeof jobs.$inferSelect,
  appId: number,
  stats: ProcessStats,
  opts?: { draftEvenIfMatchSkip?: boolean },
): Promise<void> {
  const { profile, resumeText } = await syncCandidateResume();
  const job = toNormalized(jobRow);

  try {
    const match = await matchJob({ profile, resumeText, job });
    const afterMatch = skipAfterMatch({ profile, job, match });
    const shouldSkip = afterMatch.action === "skip" || match.decision === "skip";
    if (shouldSkip && !opts?.draftEvenIfMatchSkip) {
      updateApp(appId, {
        status: "skipped",
        matchScore: match.score,
        matchJson: JSON.stringify({ ...match, decision: "skip", skipReason: afterMatch.reason || match.skipReason }),
      });
      stats.skipped += 1;
      return;
    }

    updateApp(appId, {
      status: "matched",
      matchScore: match.score,
      matchJson: JSON.stringify(
        shouldSkip
          ? { ...match, skipReason: afterMatch.reason || match.skipReason, draftedDespiteSkip: true }
          : match,
      ),
      error: null,
    });
    stats.matched += 1;

    const form = await getSource(job.source).extractApplyForm(job);
    if (form.pageUrl && form.pageUrl !== jobRow.applyUrl) {
      db.update(jobs)
        .set({ applyUrl: form.pageUrl })
        .where(eq(jobs.id, jobRow.id))
        .run();
    }
    const draft = await draftApplication({ profile, resumeText, job, match, form });
    const critique = await critiqueDraft({ profile, resumeText, job, match, draft });
    const healed = await healDraft({ profile, resumeText, job, match, form, draft, critique });
    const cleaned = healed.draft;
    const storedCritique = healed.critique;
    logAppEvent({
      applicationId: appId,
      jobId: jobRow.id,
      kind: "draft_heal",
      level: storedCritique.ok ? "info" : "warn",
      message: storedCritique.ok
        ? `Draft healed in ${healed.passes} pass(es)`
        : `Draft still dirty after ${healed.passes} heal pass(es): ${(storedCritique.violations[0] || "unspecified").slice(0, 180)}`,
      detail: {
        passes: healed.passes,
        critiqueOk: storedCritique.ok,
        violations: storedCritique.violations.slice(0, 8),
        emptyRequired: cleaned.flags.filter((f) => f.required).length,
      },
    });

    const fabrication = storedCritique.violations.filter((v) => /invent|fabricat|not on resume/i.test(v));
    const afterDraft = skipAfterDraft({
      match,
      draft: cleaned,
      fabricationCount: fabrication.length,
    });
    if (afterDraft.action === "skip") {
      updateApp(appId, {
        status: "skipped",
        formJson: JSON.stringify(form),
        answersJson: JSON.stringify(cleaned.answers),
        flagsJson: JSON.stringify(cleaned.flags),
        critiqueJson: JSON.stringify(storedCritique),
        error: afterDraft.reason,
      });
      logAppEvent({
        applicationId: appId,
        jobId: jobRow.id,
        kind: "draft_skip",
        level: "warn",
        message: afterDraft.reason || "Skipped after draft",
        detail: { score: match.score, title: jobRow.title, company: jobRow.companyName },
      });
      stats.skipped += 1;
      return;
    }

    const decision = autoApplyDecision({
      score: match.score,
      flags: cleaned.flags,
      answers: cleaned.answers,
      critique: storedCritique,
    });
    updateApp(appId, {
      status: decision.auto ? "auto_submit" : "pending_approval",
      formJson: JSON.stringify(form),
      answersJson: JSON.stringify(cleaned.answers),
      flagsJson: JSON.stringify(cleaned.flags),
      critiqueJson: JSON.stringify(storedCritique),
      error: null,
    });
    logAppEvent({
      applicationId: appId,
      jobId: jobRow.id,
      kind: decision.auto ? "inbox_auto" : "inbox_review",
      level: "info",
      message: decision.reason,
      detail: {
        score: match.score,
        title: jobRow.title,
        company: jobRow.companyName,
        applyUrl: jobRow.applyUrl,
        critiqueOk: storedCritique.ok,
        flagCount: cleaned.flags.filter((f) => f.required).length,
      },
    });
    stats.drafted += 1;
    if (decision.auto) stats.queuedAuto += 1;
    else stats.pending += 1;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (err instanceof ApplyPageMissingError || /apply page not found/i.test(message)) {
      updateApp(appId, {
        status: "skipped",
        error: message,
        matchJson: JSON.stringify({ decision: "skip", skipReason: "Apply page not found" }),
      });
      logAppEvent({
        applicationId: appId,
        jobId: jobRow.id,
        kind: "draft_skip",
        level: "warn",
        message,
        detail: { title: jobRow.title, company: jobRow.companyName },
      });
      stats.skipped += 1;
      return;
    }
    updateApp(appId, { status: "failed", error: message });
    logAppEvent({
      applicationId: appId,
      jobId: jobRow.id,
      kind: "draft_fail",
      level: "error",
      message,
      detail: { title: jobRow.title, company: jobRow.companyName },
    });
    stats.failed += 1;
    console.error(`process job ${jobRow.id}: ${message}`);
  }
}

export async function processNewJobs(opts?: {
  maxDrafts?: number;
  companySlug?: string;
  draftEvenIfMatchSkip?: boolean;
  retryFailed?: boolean;
  ignorePostedAge?: boolean;
}): Promise<ProcessStats> {
  const stats: ProcessStats = {
    considered: 0,
    skipped: 0,
    matched: 0,
    drafted: 0,
    pending: 0,
    failed: 0,
    retried: 0,
    alreadyScanned: 0,
    tooOld: 0,
    queuedAuto: 0,
  };
  await syncCandidateResume();
  const { profile } = loadProfileRecord();
  const allJobs = opts?.companySlug
    ? db.select().from(jobs).where(eq(jobs.companySlug, opts.companySlug)).all()
    : db.select().from(jobs).all();
  const maxDrafts = opts?.maxDrafts && opts.maxDrafts > 0 ? opts.maxDrafts : Infinity;
  const retryFailed = Boolean(opts?.retryFailed);
  const maxAgeMs = Math.max(1, config.jobMaxAgeDays) * 24 * 60 * 60 * 1000;

  for (const jobRow of allJobs) {
    if (stats.drafted >= maxDrafts) break;

    const existing = db
      .select()
      .from(applications)
      .where(eq(applications.jobId, jobRow.id))
      .get();

    if (existing) {
      if (!retryFailed || existing.status !== "failed" || !isRetryableFailure(existing.error)) {
        stats.alreadyScanned += 1;
        continue;
      }
      stats.retried += 1;
      stats.considered += 1;
      updateApp(existing.id, { status: "discovered", error: null });
      const filtered = hardFilter(toNormalized(jobRow), profile);
      if (filtered.skip) {
        updateApp(existing.id, {
          status: "skipped",
          matchJson: JSON.stringify({ skipReason: filtered.reason, decision: "skip" }),
        });
        stats.skipped += 1;
        continue;
      }
      await processOne(jobRow, existing.id, stats, opts);
      continue;
    }

    if (!opts?.ignorePostedAge && !postedWithin(jobRow.publishedAt, maxAgeMs)) {
      stats.tooOld += 1;
      continue;
    }

    stats.considered += 1;
    const job = toNormalized(jobRow);
    const filtered = hardFilter(job, profile);
    if (filtered.skip) {
      insertApp(jobRow.id, "skipped", {
        matchJson: JSON.stringify({ skipReason: filtered.reason, decision: "skip" }),
      });
      stats.skipped += 1;
      continue;
    }

    const appId = insertApp(jobRow.id, "discovered");
    await processOne(jobRow, appId, stats, opts);
  }

  return stats;
}

export async function retryApplication(applicationId: number): Promise<{
  ok: boolean;
  error?: string;
  status?: string;
}> {
  const app = db.select().from(applications).where(eq(applications.id, applicationId)).get();
  if (!app) return { ok: false, error: "Application not found" };
  const wasInbox = app.status === "pending_approval" || app.status === "auto_submit";
  if (app.status !== "failed" && !wasInbox) {
    return { ok: false, error: `Cannot retry status ${app.status}` };
  }
  const jobRow = db.select().from(jobs).where(eq(jobs.id, app.jobId)).get();
  if (!jobRow) return { ok: false, error: "Job not found" };
  updateApp(app.id, { status: "discovered", error: null });
  const stats: ProcessStats = {
    considered: 1,
    skipped: 0,
    matched: 0,
    drafted: 0,
    pending: 0,
    failed: 0,
    retried: 1,
    alreadyScanned: 0,
    tooOld: 0,
    queuedAuto: 0,
  };
  const { profile } = loadProfileRecord();
  const filtered = hardFilter(toNormalized(jobRow), profile);
  if (filtered.skip && !wasInbox) {
    updateApp(app.id, {
      status: "skipped",
      matchJson: JSON.stringify({ skipReason: filtered.reason, decision: "skip" }),
    });
    return { ok: true, status: "skipped" };
  }
  await processOne(jobRow, app.id, stats, wasInbox ? { draftEvenIfMatchSkip: true } : undefined);
  const latest = db.select().from(applications).where(eq(applications.id, applicationId)).get();
  if (latest?.status === "failed") return { ok: false, error: latest.error ?? "Retry failed", status: "failed" };
  return { ok: true, status: latest?.status };
}

export function hasInProgressRun(): boolean {
  return Boolean(
    db
      .select()
      .from(applications)
      .where(and(eq(applications.status, "discovered")))
      .get(),
  );
}
