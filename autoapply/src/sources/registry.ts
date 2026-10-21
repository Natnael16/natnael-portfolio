import type { JobSource, SourceTrust } from "./types.js";
import { ashby } from "./ashby.js";
import { getFeed } from "./feeds/index.js";
import { greenhouse } from "./greenhouse.js";
import { lever } from "./lever.js";

const sources: Record<string, JobSource> = {
  ashby,
  greenhouse,
  lever,
};

export function getSource(id: string): JobSource {
  const src = sources[id];
  if (!src) {
    throw new Error(`Unknown job source "${id}". Register it in src/sources/registry.ts`);
  }
  return src;
}

export function isBoardSource(id: string): boolean {
  return id in sources;
}

/** True when the agent can fill and submit this source's form itself. */
export function canAutoApply(sourceId: string): boolean {
  const src = sources[sourceId];
  return Boolean(src?.extractApplyForm && src.submitApplication);
}

export function sourceTrust(sourceId: string): SourceTrust {
  if (sources[sourceId]) return "ats";
  return getFeed(sourceId)?.trust ?? "open";
}

export function sourceLabel(sourceId: string): string {
  const feed = getFeed(sourceId);
  if (feed) return feed.label;
  return sourceId.charAt(0).toUpperCase() + sourceId.slice(1);
}

/** Boards first, then curated feeds, then open ones, so a duplicate keeps its best source. */
export function sourcePriority(sourceId: string): number {
  if (canAutoApply(sourceId)) return 0;
  return { ats: 1, curated: 2, open: 3 }[sourceTrust(sourceId)];
}
