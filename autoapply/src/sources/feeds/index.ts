import { config } from "../../config.js";
import type { JobFeed } from "../types.js";
import { linkedin } from "./linkedin.js";
import { himalayas, jobicy, remoteok, remotive, weworkremotely } from "./remoteBoards.js";

export const allFeeds: JobFeed[] = [remotive, weworkremotely, himalayas, jobicy, remoteok, linkedin];

export function getFeed(id: string): JobFeed | undefined {
  return allFeeds.find((f) => f.id === id);
}

/** Feeds named in FEEDS, in that order. Unknown names are reported once and ignored. */
export function enabledFeeds(): JobFeed[] {
  const out: JobFeed[] = [];
  for (const id of config.feeds) {
    const feed = getFeed(id);
    if (feed) out.push(feed);
    else console.warn(`FEEDS: unknown feed "${id}" (known: ${allFeeds.map((f) => f.id).join(", ")})`);
  }
  return out;
}
