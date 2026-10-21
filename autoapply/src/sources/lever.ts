/**
 * Lever adapter: listing only, from the public Postings API
 * (https://github.com/lever/postings-api). Applying through the API needs the employer's
 * key, so matches land in "Apply yourself" with the posting link.
 */
import { htmlToText, normalizeEmploymentType, salaryRange } from "../lib/text.js";
import { fetchJson, HttpError } from "./http.js";
import type { BoardRef, JobSource, NormalizedJob } from "./types.js";

export type LeverPosting = {
  id: string;
  text?: string;
  hostedUrl?: string;
  applyUrl?: string;
  createdAt?: number;
  workplaceType?: string;
  country?: string;
  categories?: {
    commitment?: string;
    department?: string;
    location?: string;
    team?: string;
    allLocations?: string[];
  };
  descriptionPlain?: string;
  description?: string;
  lists?: Array<{ text?: string; content?: string }>;
  additionalPlain?: string;
  salaryRange?: { min?: number; max?: number; currency?: string; interval?: string };
  salaryDescriptionPlain?: string;
};

export function mapLeverPosting(board: BoardRef, p: LeverPosting): NormalizedJob {
  const locations = p.categories?.allLocations?.length
    ? p.categories.allLocations.join(" / ")
    : p.categories?.location ?? null;
  const isRemote = p.workplaceType === "remote" || /\bremote\b/i.test(locations ?? "");
  const lists = (p.lists ?? [])
    .map((l) => `${l.text ?? ""}\n${htmlToText(l.content)}`.trim())
    .filter(Boolean)
    .join("\n\n");
  const description = [p.descriptionPlain?.trim() || htmlToText(p.description), lists, p.additionalPlain?.trim()]
    .filter(Boolean)
    .join("\n\n");
  const salary = p.salaryRange
    ? salaryRange(
        p.salaryRange.min,
        p.salaryRange.max,
        p.salaryRange.currency || "USD",
        /month/i.test(p.salaryRange.interval ?? "") ? "month" : /hour/i.test(p.salaryRange.interval ?? "") ? "hour" : "year",
      )
    : null;
  const url = p.hostedUrl || `https://jobs.lever.co/${board.slug}/${p.id}`;
  return {
    source: "lever",
    sourceJobId: `${board.slug}:${p.id}`,
    companySlug: board.slug,
    companyName: board.name,
    title: p.text?.trim() || "Untitled",
    isRemote,
    workplaceType: isRemote ? "Remote" : p.workplaceType || null,
    location: locations,
    employmentType: normalizeEmploymentType(p.categories?.commitment),
    department: p.categories?.department ?? null,
    team: p.categories?.team ?? null,
    description,
    applyUrl: p.applyUrl || `${url}/apply`,
    jobUrl: url,
    compensation: salary ?? (p.salaryDescriptionPlain?.trim() || null),
    publishedAt: p.createdAt ? new Date(p.createdAt).toISOString() : null,
  };
}

export const lever: JobSource = {
  id: "lever",
  async listJobs(board) {
    const url = `https://api.lever.co/v0/postings/${encodeURIComponent(board.slug)}?mode=json`;
    try {
      const body = await fetchJson<LeverPosting[]>(url);
      return (Array.isArray(body) ? body : []).filter((p) => p.id && p.text).map((p) => mapLeverPosting(board, p));
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        throw new Error(`Lever board not found: ${board.slug}`);
      }
      throw err;
    }
  },
};
