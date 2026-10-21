import { canonicalJobUrl } from "../sources/atsUrl.js";
import type { NormalizedJob } from "../sources/types.js";

const COMPANY_SUFFIX = /\b(inc|llc|ltd|limited|gmbh|corp|corporation|co|company|plc|sa|ag|bv|oy|ab|pty)\b\.?/g;

function compact(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "");
}

/**
 * Keys that identify the same opening seen on different sites: company + title, and the
 * canonical apply / posting URL. Two jobs sharing any key are the same posting.
 */
export function dedupeKeys(job: Pick<NormalizedJob, "companyName" | "title" | "applyUrl" | "jobUrl">): string[] {
  const keys = new Set<string>();
  const company = compact(job.companyName.toLowerCase().replace(COMPANY_SUFFIX, " "));
  const title = compact(job.title);
  if (company && title && company !== "unknowncompany") keys.add(`t:${company}|${title}`);
  for (const url of [job.applyUrl, job.jobUrl]) {
    const canonical = canonicalJobUrl(url);
    if (canonical) keys.add(`u:${canonical}`);
  }
  return [...keys];
}
