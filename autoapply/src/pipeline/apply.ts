import fs from "node:fs";
import { and, eq, inArray, lt, or } from "drizzle-orm";
import { db } from "../db/client.js";
import { applications, jobs } from "../db/schema.js";
import { syncCandidateResume } from "../lib/store.js";
import { logAppEvent } from "../lib/appLog.js";
import { nowIso } from "../lib/time.js";
import { assertSubmitAllowed, closeSubmitChrome, recordSubmitResult } from "../lib/chromeSubmit.js";
import { autoApplyDecision } from "./autoApply.js";
import { isAlreadySentSubmitError, nextStatusAfterSubmitFail } from "./submitGuard.js";
import { getSource } from "../sources/registry.js";
import type { ApplyField, CritiqueResult, DraftFlag, FieldAnswer, SubmitResult } from "../sources/types.js";

const STALE_SUBMIT_MS = 15 * 60_000;
const CLAIMABLE_STATUSES = ["queued_submit", "approved", "pending_approval", "failed"] as const;

export function retagInboxForAutoApply(): void {
  const rows = db
    .select()
    .from(applications)
    .where(inArray(applications.status, ["pending_approval", "auto_submit"]))
    .all();
  for (const row of rows) {
    const flags = safeJson<DraftFlag[]>(row.flagsJson, []);
    const answers = safeJson<FieldAnswer[]>(row.answersJson, []);
    const critique = safeJson<CritiqueResult>(row.critiqueJson, {
      ok: false,
      violations: ["missing critique"],
      flags: [],
    });
    const score = row.matchScore ?? 0;
    const decision = autoApplyDecision({ score, flags, answers, critique });
    const next = decision.auto ? "auto_submit" : "pending_approval";
    if (next === row.status) continue;
    db.update(applications)
      .set({ status: next, updatedAt: nowIso() })
      .where(eq(applications.id, row.id))
      .run();
  }
}

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function claimForSubmit(applicationId: number): boolean {
  const now = nowIso();
  const staleBefore = new Date(Date.now() - STALE_SUBMIT_MS).toISOString();
  const result = db
    .update(applications)
    .set({ status: "submitting", error: null, updatedAt: now })
    .where(
      and(
        eq(applications.id, applicationId),
        or(
          inArray(applications.status, [...CLAIMABLE_STATUSES]),
          and(eq(applications.status, "submitting"), lt(applications.updatedAt, staleBefore)),
        ),
      ),
    )
    .run();
  return result.changes > 0;
}

function setAppStatus(applicationId: number, status: string, error: string | null = null): void {
  db.update(applications)
    .set({ status, error, updatedAt: nowIso() })
    .where(eq(applications.id, applicationId))
    .run();
}

function alreadySubmittedSameJob(jobId: number, applicationId: number): boolean {
  const rows = db.select().from(applications).where(eq(applications.jobId, jobId)).all();
  return rows.some(
    (row) =>
      row.id !== applicationId &&
      (row.status === "submitted" || row.status === "submitting" || Boolean(row.submittedAt)),
  );
}

export async function submitApproved(applicationId: number): Promise<{ ok: boolean; error?: string }> {
  const app = db.select().from(applications).where(eq(applications.id, applicationId)).get();
  if (!app) return { ok: false, error: "Application not found" };
  if (app.status === "submitted" || app.submittedAt) {
    if (app.status !== "submitted") {
      db.update(applications)
        .set({ status: "submitted", updatedAt: nowIso() })
        .where(eq(applications.id, applicationId))
        .run();
    }
    return { ok: true };
  }
  if (isAlreadySentSubmitError(app.error ?? "")) {
    if (app.status !== "failed") {
      setAppStatus(
        applicationId,
        "failed",
        `${app.error} Not retrying automatically — Ashby may already have this application.`,
      );
    }
    return {
      ok: false,
      error: "Not retrying this application — Ashby may already have it. Open History if you need to inspect the last attempt.",
    };
  }
  if (alreadySubmittedSameJob(app.jobId, applicationId)) {
    const error = "This job was already submitted; skipping duplicate";
    db.update(applications)
      .set({ status: "skipped", error, updatedAt: nowIso() })
      .where(eq(applications.id, applicationId))
      .run();
    logAppEvent({
      applicationId,
      jobId: app.jobId,
      kind: "submit_duplicate",
      level: "warn",
      message: error,
    });
    return { ok: false, error };
  }
  const wasQueued = app.status === "queued_submit" || app.status === "submitting";
  if (app.status === "submitting") {
    const age = Date.now() - Date.parse(app.updatedAt);
    if (!Number.isNaN(age) && age < STALE_SUBMIT_MS) {
      return { ok: false, error: "Submit already in progress" };
    }
  } else if (!CLAIMABLE_STATUSES.includes(app.status as (typeof CLAIMABLE_STATUSES)[number])) {
    return { ok: false, error: `Cannot submit from status ${app.status}` };
  }
  if (!claimForSubmit(applicationId)) {
    return { ok: false, error: "Submit already in progress" };
  }

  const job = db.select().from(jobs).where(eq(jobs.id, app.jobId)).get();
  if (!job) {
    setAppStatus(applicationId, wasQueued ? "queued_submit" : "pending_approval", "Job not found");
    return { ok: false, error: "Job not found" };
  }

  const flags = JSON.parse(app.flagsJson || "[]") as Array<{
    path: string;
    required: boolean;
  }>;
  const answers = JSON.parse(app.answersJson || "[]") as FieldAnswer[];
  const byPath = new Map(answers.map((a) => [a.path, a]));
  const blocking = flags.filter((f) => f.required && !byPath.get(f.path)?.value);
  if (blocking.length) {
    const error = "Required flagged fields are still empty";
    logAppEvent({
      applicationId,
      jobId: job.id,
      kind: "submit_blocked",
      level: "error",
      message: error,
      detail: { wasQueued, paths: blocking.map((f) => f.path), source: wasQueued ? "auto" : "manual" },
    });
    setAppStatus(applicationId, "pending_approval", error);
    return { ok: false, error };
  }
  const formFields = (JSON.parse(app.formJson || "{}") as { fields?: ApplyField[] }).fields ?? [];
  const emptyRequired = formFields.filter((f) => {
    if (!f.required || f.inputKind === "file") return false;
    const value = byPath.get(f.path)?.value;
    return value == null || value === "";
  });
  if (emptyRequired.length) {
    const error = `Required fields are still empty: ${emptyRequired.map((f) => f.label || f.path).join("; ")}`;
    logAppEvent({
      applicationId,
      jobId: job.id,
      kind: "submit_blocked",
      level: "error",
      message: error,
      detail: { wasQueued, source: wasQueued ? "auto" : "manual" },
    });
    setAppStatus(applicationId, "pending_approval", error);
    return { ok: false, error };
  }

  const { resumePath } = await syncCandidateResume();
  if (!resumePath || !fs.existsSync(resumePath)) {
    const error = "Resume PDF missing; cannot submit";
    logAppEvent({
      applicationId,
      jobId: job.id,
      kind: "submit_blocked",
      level: "error",
      message: error,
      detail: { wasQueued, source: wasQueued ? "auto" : "manual" },
    });
    setAppStatus(applicationId, "pending_approval", error);
    return { ok: false, error };
  }

  try {
    assertSubmitAllowed();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    logAppEvent({
      applicationId,
      jobId: job.id,
      kind: "submit_cooldown",
      level: "warn",
      message,
      detail: { wasQueued, source: wasQueued ? "auto" : "manual", matchScore: app.matchScore },
    });
    setAppStatus(applicationId, wasQueued ? "queued_submit" : "pending_approval", message);
    return { ok: false, error: message };
  }

  logAppEvent({
    applicationId,
    jobId: job.id,
    kind: "submit_start",
    level: "info",
    message: `Submitting ${job.companyName} — ${job.title}`,
    detail: {
      wasQueued,
      source: wasQueued ? "auto" : "manual",
      matchScore: app.matchScore,
      applyUrl: job.applyUrl,
    },
  });

  let result: SubmitResult;
  try {
    result = await getSource(job.source).submitApplication(
      {
        source: job.source,
        sourceJobId: job.sourceJobId,
        companySlug: job.companySlug,
        companyName: job.companyName,
        title: job.title,
        isRemote: job.isRemote,
        workplaceType: job.workplaceType,
        location: job.location,
        employmentType: job.employmentType,
        department: job.department,
        team: job.team,
        description: job.description,
        applyUrl: job.applyUrl,
        jobUrl: job.jobUrl,
        compensation: job.compensation,
        publishedAt: job.publishedAt ?? null,
      },
      { answers, resumePath },
    );
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    const nextStatus = nextStatusAfterSubmitFail({ wasQueued, error, spam: false });
    logAppEvent({
      applicationId,
      jobId: job.id,
      kind: "submit_fail",
      level: "error",
      message: error,
      detail: { wasQueued, source: wasQueued ? "auto" : "manual", nextStatus },
    });
    setAppStatus(applicationId, nextStatus, error);
    return { ok: false, error };
  }

  if (!result.ok) {
    const spam = /possible spam/i.test(result.error ?? "");
    recordSubmitResult(spam ? "spam" : "fail");
    if (spam) await closeSubmitChrome();
    const error = spam
      ? `${result.error ?? "Flagged as possible spam."} Turn off any VPN/proxy, stay on your normal home or mobile network, and wait before the next submit. Retrying immediately from the same session is what Ashby blocks.`
      : (result.error ?? "Submit failed");
    const nextStatus = nextStatusAfterSubmitFail({ wasQueued, error, spam });
    logAppEvent({
      applicationId,
      jobId: job.id,
      kind: spam ? "submit_spam" : "submit_fail",
      level: "error",
      message: error,
      screenshotPath: result.screenshotPath ?? null,
      detail: {
        wasQueued,
        source: wasQueued ? "auto" : "manual",
        matchScore: app.matchScore,
        nextStatus,
        applyUrl: job.applyUrl,
        confirmation: result.confirmation ?? null,
      },
    });
    setAppStatus(applicationId, nextStatus, error);
    return { ok: false, error };
  }

  recordSubmitResult("ok");
  logAppEvent({
    applicationId,
    jobId: job.id,
    kind: "submit_ok",
    level: "info",
    message: `Submitted ${job.companyName} — ${job.title}`,
    detail: {
      wasQueued,
      source: wasQueued ? "auto" : "manual",
      matchScore: app.matchScore,
      confirmation: result.confirmation ?? null,
      applyUrl: job.applyUrl,
    },
  });

  db.update(applications)
    .set({
      status: "submitted",
      submittedAt: nowIso(),
      updatedAt: nowIso(),
      error: null,
    })
    .where(eq(applications.id, applicationId))
    .run();
  return { ok: true };
}

let flushInFlight: Promise<{ submitted: number; skipped: number }> | null = null;

export async function flushQueuedSubmits(): Promise<{ submitted: number; skipped: number }> {
  if (flushInFlight) return flushInFlight;
  flushInFlight = flushQueuedSubmitsOnce().finally(() => {
    flushInFlight = null;
  });
  return flushInFlight;
}

async function flushQueuedSubmitsOnce(): Promise<{ submitted: number; skipped: number }> {
  try {
    assertSubmitAllowed();
  } catch {
    return { submitted: 0, skipped: 1 };
  }
  const next = db
    .select()
    .from(applications)
    .where(eq(applications.status, "queued_submit"))
    .all()
    .sort((a, b) => a.id - b.id)[0];
  if (!next) return { submitted: 0, skipped: 0 };
  logAppEvent({
    applicationId: next.id,
    jobId: next.jobId,
    kind: "flush_start",
    level: "info",
    message: `Auto-submit flushing application ${next.id}`,
    detail: { matchScore: next.matchScore },
  });
  const result = await submitApproved(next.id);
  return result.ok ? { submitted: 1, skipped: 0 } : { submitted: 0, skipped: 1 };
}

export function startAutoApplyBatch(): { queued: number } {
  const rows = db.select().from(applications).where(eq(applications.status, "auto_submit")).all();
  const ts = nowIso();
  for (const row of rows) {
    db.update(applications)
      .set({ status: "queued_submit", error: null, updatedAt: ts })
      .where(eq(applications.id, row.id))
      .run();
    logAppEvent({
      applicationId: row.id,
      jobId: row.jobId,
      kind: "auto_apply_start",
      level: "info",
      message: "Moved to auto-apply queue after Start auto apply",
      detail: { matchScore: row.matchScore },
    });
  }
  logAppEvent({
    kind: "auto_apply_batch",
    level: "info",
    message: `Start auto apply queued ${rows.length} application(s)`,
    detail: { queued: rows.length },
  });
  if (rows.length > 0) {
    void flushQueuedSubmits().catch((err) => {
      logAppEvent({
        kind: "flush_crash",
        level: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }
  return { queued: rows.length };
}

let autoLoopStarted = false;
export function startAutoSubmitLoop(): void {
  if (autoLoopStarted) return;
  autoLoopStarted = true;
  setInterval(() => {
    flushQueuedSubmits().catch((err) => {
      logAppEvent({
        kind: "flush_crash",
        level: "error",
        message: err instanceof Error ? err.message : String(err),
      });
    });
  }, 20_000);
}
