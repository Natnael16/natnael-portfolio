import { and, eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { companies, jobs } from "../db/schema.js";
import { containsWord, titlesOverlap } from "../agent/match.js";
import { loadProfileRecord } from "../lib/store.js";
import { nowIso } from "../lib/time.js";
import { boardFromUrl } from "../sources/atsUrl.js";
import { enabledFeeds } from "../sources/feeds/index.js";
import { upsertJob } from "./ingest.js";

export type FeedStats = {
  feeds: number;
  fetched: number;
  upserted: number;
  boardsFound: number;
  errors: string[];
};

/**
 * Read every enabled cross-company feed. When a posting applies through Ashby, Greenhouse or
 * Lever, that company is added as a board so ingest reads it straight from the source (and
 * Ashby roles become auto-applyable).
 */
export async function ingestFeeds(): Promise<FeedStats> {
  const stats: FeedStats = { feeds: 0, fetched: 0, upserted: 0, boardsFound: 0, errors: [] };
  const { profile } = loadProfileRecord();
  const feeds = enabledFeeds();
  stats.feeds = feeds.length;

  for (const feed of feeds) {
    try {
      const postings = await feed.search({
        keywords: profile.targetTitles,
        maxAgeDays: config.jobMaxAgeDays,
        isKnown: (id) =>
          Boolean(
            db
              .select({ id: jobs.id })
              .from(jobs)
              .where(and(eq(jobs.source, feed.id), eq(jobs.sourceJobId, id)))
              .get(),
          ),
        wantsTitle: (title) =>
          titlesOverlap(title, profile.targetTitles) && !profile.excludeKeywords.some((k) => containsWord(title, k)),
      });
      stats.fetched += postings.length;
      for (const posting of postings) {
        if (upsertJob(posting).created) stats.upserted += 1;
        if (registerBoard(posting.applyUrl, posting.companyName)) stats.boardsFound += 1;
      }
      console.log(`feed ${feed.id}: ${postings.length} postings`);
    } catch (err) {
      const message = `${feed.id}: ${err instanceof Error ? err.message : String(err)}`;
      stats.errors.push(message);
      console.error(`feed ${message}`);
    }
  }
  return stats;
}

/** Add the careers board behind an apply link. Returns true when it is new. */
export function registerBoard(applyUrl: string, companyName: string): boolean {
  const board = boardFromUrl(applyUrl);
  if (!board) return false;
  const existing = db
    .select({ id: companies.id })
    .from(companies)
    .where(and(eq(companies.source, board.source), eq(companies.slug, board.slug)))
    .get();
  if (existing) return false;
  db.insert(companies)
    .values({ slug: board.slug, name: companyName || board.slug, source: board.source, enabled: true, createdAt: nowIso() })
    .run();
  return true;
}
