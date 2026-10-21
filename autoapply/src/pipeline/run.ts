import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { runs } from "../db/schema.js";
import { nowIso } from "../lib/time.js";
import { discoverAndStoreBoards } from "./discover.js";
import { ingestBoards, type IngestStats } from "./ingest.js";
import { notifyPending, countPending } from "./notify.js";
import { processNewJobs, type ProcessStats } from "./process.js";
import { syncCandidateResume } from "../lib/store.js";

let starting = false;

export function runInProgress(): boolean {
  if (starting) return true;
  return Boolean(db.select().from(runs).where(eq(runs.status, "running")).get());
}

function sumIngest(a: IngestStats, b: IngestStats): IngestStats {
  return {
    boards: b.boards,
    fetched: a.fetched + b.fetched,
    upserted: a.upserted + b.upserted,
    errors: a.errors + b.errors,
  };
}

function sumProcess(a: ProcessStats, b: ProcessStats): ProcessStats {
  return {
    considered: a.considered + b.considered,
    skipped: a.skipped + b.skipped,
    matched: a.matched + b.matched,
    drafted: a.drafted + b.drafted,
    pending: a.pending + b.pending,
    failed: a.failed + b.failed,
    retried: a.retried + b.retried,
    alreadyScanned: a.alreadyScanned + b.alreadyScanned,
    tooOld: a.tooOld + b.tooOld,
    queuedAuto: a.queuedAuto + b.queuedAuto,
  };
}

async function executeRun(runId: number): Promise<void> {
  const pendingBefore = countPending();
  try {
    await syncCandidateResume();
    const ingestKnown = await ingestBoards();
    const processedKnown = await processNewJobs();
    const discover = await discoverAndStoreBoards();
    const ingestNew = await ingestBoards();
    const processedNew = await processNewJobs();
    const ingest = sumIngest(ingestKnown, ingestNew);
    const processed = sumProcess(processedKnown, processedNew);
    const pendingAfter = countPending();
    const stats = { discover, ingest, processed, pending: pendingAfter };
    db.update(runs)
      .set({
        status: "ok",
        finishedAt: nowIso(),
        statsJson: JSON.stringify(stats),
      })
      .where(eq(runs.id, runId))
      .run();
    const created = pendingAfter - pendingBefore;
    if (created > 0) await notifyPending(created);
    console.log(`run ${runId} ok`, stats);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    db.update(runs)
      .set({
        status: "error",
        finishedAt: nowIso(),
        error: message,
      })
      .where(eq(runs.id, runId))
      .run();
    console.error(`run ${runId} failed`, message);
    throw err;
  }
}

export function startRunInBackground(): { runId: number } {
  if (runInProgress()) {
    const running = db.select().from(runs).where(eq(runs.status, "running")).get();
    throw new Error(`Run ${running?.id ?? "current"} already in progress`);
  }
  starting = true;
  const inserted = db
    .insert(runs)
    .values({ startedAt: nowIso(), status: "running" })
    .returning({ id: runs.id })
    .all();
  const runId = inserted[0].id;
  void executeRun(runId)
    .catch(() => undefined)
    .finally(() => {
      starting = false;
    });
  return { runId };
}

export async function runOnce(): Promise<{ runId: number }> {
  const { runId } = startRunInBackground();
  for (;;) {
    const latest = db.select().from(runs).where(eq(runs.id, runId)).get();
    if (!latest || latest.status !== "running") {
      if (latest?.status === "error") {
        throw new Error(latest.error ?? "Run failed");
      }
      return { runId };
    }
    await new Promise((r) => setTimeout(r, 500));
  }
}
