import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { companies, jobs } from "../db/schema.js";
import { humanizeSlug, normalizeAshbySlug } from "../lib/ashbySlug.js";
import { nowIso } from "../lib/time.js";
import {
  collectAshbyCandidates,
  saveCache,
  verifyNewBoards,
  type DiscoverStats,
} from "../sources/ashbyDiscover.js";

let discovering = false;

export function isDiscovering(): boolean {
  return discovering;
}

export async function discoverAndStoreBoards(opts?: {
  skipSearch?: boolean;
}): Promise<DiscoverStats> {
  if (discovering) {
    throw new Error("Board discovery already in progress");
  }
  discovering = true;
  const createdAt = nowIso();
  try {
    const existing = db.select().from(companies).all();
    for (const row of existing) {
      const slug = normalizeAshbySlug(row.slug);
      if (!slug || slug !== row.slug.toLowerCase()) {
        db.delete(jobs).where(eq(jobs.companySlug, row.slug)).run();
        db.delete(companies).where(eq(companies.id, row.id)).run();
        continue;
      }
      const name = humanizeSlug(slug);
      if (name !== row.name) {
        db.update(companies).set({ name }).where(eq(companies.id, row.id)).run();
      }
    }
    const kept = db.select().from(companies).all();
    const already = new Set(
      kept.filter((row) => (row.source || "ashby") === "ashby").map((row) => row.slug.toLowerCase()),
    );

    let inserted = 0;
    let rejected = 0;
    let verifiedCount = 0;
    let chain = Promise.resolve();

    const flush = (slugs: string[], cache: Parameters<typeof verifyNewBoards>[2]) => {
      chain = chain.then(async () => {
        try {
          const result = await verifyNewBoards(slugs, already, cache);
          verifiedCount += result.verified.length;
          rejected += result.rejected;
          for (const board of result.verified) {
            if (already.has(board.slug)) continue;
            try {
              db.insert(companies)
                .values({
                  slug: board.slug,
                  name: board.name || humanizeSlug(board.slug),
                  source: "ashby",
                  enabled: true,
                  createdAt,
                })
                .run();
              already.add(board.slug);
              inserted += 1;
            } catch {
              already.add(board.slug);
            }
          }
          cache.slugs = [...already];
          saveCache(cache);
        } catch (err) {
          console.error("discover verify flush", err);
        }
      });
      return chain;
    };

    const { slugs, sources, waybackDone, cache } = await collectAshbyCandidates({
      skipSearch: opts?.skipSearch,
      onProgress: flush,
    });
    await flush(slugs, cache);
    enableAllCompanies();

    const stats: DiscoverStats = {
      candidates: slugs.length,
      verified: verifiedCount,
      rejected,
      inserted,
      alreadyKnown: kept.length,
      waybackDone,
      sources,
    };
    console.log("discover boards", stats);
    return stats;
  } finally {
    discovering = false;
  }
}

export function enableAllCompanies(): { enabled: number } {
  db.update(companies).set({ enabled: true }).run();
  const enabled = db.select().from(companies).where(eq(companies.enabled, true)).all().length;
  return { enabled };
}
