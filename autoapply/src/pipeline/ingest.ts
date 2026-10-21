import { and, eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { companies, jobs } from "../db/schema.js";
import { mapPool, retryForever } from "../lib/pool.js";
import { nowIso, sleep } from "../lib/time.js";
import { keepRecoveredApplyUrl } from "../sources/ashby.js";
import { getSource } from "../sources/registry.js";
import type { NormalizedJob } from "../sources/types.js";

export type IngestStats = {
  boards: number;
  fetched: number;
  upserted: number;
  errors: number;
};

function isRetryableIngest(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limited|timeout|ECONNRESET|503|502|500/i.test(msg);
}

export function upsertJob(job: NormalizedJob): { id: number; created: boolean } {
  const fetchedAt = nowIso();
  const existing = db
    .select()
    .from(jobs)
    .where(and(eq(jobs.source, job.source), eq(jobs.sourceJobId, job.sourceJobId)))
    .get();

  if (existing) {
    db.update(jobs)
      .set({
        title: job.title,
        isRemote: job.isRemote,
        workplaceType: job.workplaceType,
        location: job.location,
        employmentType: job.employmentType,
        department: job.department,
        team: job.team,
        description: job.description,
        applyUrl: keepRecoveredApplyUrl(existing.applyUrl, job.applyUrl),
        jobUrl: job.jobUrl,
        compensation: job.compensation,
        publishedAt: job.publishedAt ?? existing.publishedAt,
        fetchedAt,
        companyName: job.companyName,
      })
      .where(eq(jobs.id, existing.id))
      .run();
    return { id: existing.id, created: false };
  }

  const result = db
    .insert(jobs)
    .values({
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
      publishedAt: job.publishedAt,
      fetchedAt,
      createdAt: fetchedAt,
    })
    .returning({ id: jobs.id })
    .all();

  return { id: result[0].id, created: true };
}

export async function ingestBoards(): Promise<IngestStats> {
  const stats: IngestStats = { boards: 0, fetched: 0, upserted: 0, errors: 0 };
  const list = db.select().from(companies).where(eq(companies.enabled, true)).all();
  stats.boards = list.length;

  await mapPool(list, config.ingestConcurrency, async (company) => {
    try {
      const source = getSource(company.source || "ashby");
      const postings = await retryForever(
        `ingest ${company.slug}`,
        () => source.listJobs({ slug: company.slug, name: company.name }),
        isRetryableIngest,
      );
      stats.fetched += postings.length;
      for (const posting of postings) {
        const { created } = upsertJob(posting);
        if (created) stats.upserted += 1;
      }
      db.update(companies)
        .set({ lastFetchedAt: nowIso(), lastError: null, failCount: 0 })
        .where(eq(companies.id, company.id))
        .run();
    } catch (err) {
      stats.errors += 1;
      const message = err instanceof Error ? err.message : String(err);
      db.update(companies)
        .set({
          lastError: message,
          failCount: company.failCount + 1,
        })
        .where(eq(companies.id, company.id))
        .run();
      console.error(`ingest ${company.slug}: ${message}`);
    }
    await sleep(120);
  });

  return stats;
}
