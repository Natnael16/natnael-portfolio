import { eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { runs } from "../db/schema.js";
import { nowIso } from "../lib/time.js";
import { startAutoApplyBatch } from "./apply.js";
import { discoverAndStoreBoards } from "./discover.js";
import type { DiscoverStats } from "../sources/ashbyDiscover.js";
import { ingestFeeds } from "./feeds.js";
import { ingestBoards, type IngestStats } from "./ingest.js";
import { notifyRunDigest, countPending } from "./notify.js";
import { emptyProcessStats, processNewJobs, type ProcessStats } from "./process.js";
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
  const out = emptyProcessStats();
  for (const key of Object.keys(out) as Array<keyof ProcessStats>) out[key] = a[key] + b[key];
  return out;
}

async function executeRun(runId: number): Promise<void> {
  const startedAt = nowIso();
  try {
    await syncCandidateResume();
    // Feeds first: an apply link that points at Ashby/Greenhouse/Lever registers that board,
    // so the board ingest right after already reads it.
    const feeds = await ingestFeeds();
    let ingest = await ingestBoards();
    let processed = await processNewJobs();
    let discover: DiscoverStats | null = null;
    if (config.ashbyDiscovery) {
      discover = await discoverAndStoreBoards();
      ingest = sumIngest(ingest, await ingestBoards());
      processed = sumProcess(processed, await processNewJobs());
    }
    const pendingAfter = countPending();
    const stats = { feeds, discover, ingest, processed, pending: pendingAfter };
    db.update(runs)
      .set({
        status: "ok",
        finishedAt: nowIso(),
        statsJson: JSON.stringify(stats),
      })
      .where(eq(runs.id, runId))
      .run();
    await notifyRunDigest(startedAt).catch((err) => console.error("notify failed", err));
    if (config.autoSubmitAfterRun) startAutoApplyBatch();
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
