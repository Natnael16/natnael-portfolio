/**
 * Greenhouse adapter: listing only, from the public Job Board API
 * (https://developers.greenhouse.io/job-board.html). Greenhouse's apply API needs the
 * employer's key, so matches land in "Apply yourself" with the posting link.
 */
import { htmlToText } from "../lib/text.js";
import { fetchJson, HttpError } from "./http.js";
import type { BoardRef, JobSource, NormalizedJob } from "./types.js";

export type GreenhouseJob = {
  id: number;
  title?: string;
  updated_at?: string;
  first_published?: string;
  absolute_url?: string;
  content?: string;
  location?: { name?: string };
  departments?: Array<{ name?: string }>;
  offices?: Array<{ name?: string; location?: string | null }>;
  company_name?: string;
};

const REMOTE = /\bremote\b|\banywhere\b|\bworldwide\b/i;

export function mapGreenhouseJob(board: BoardRef, job: GreenhouseJob): NormalizedJob {
  const location = job.location?.name?.trim() || null;
  const offices = (job.offices ?? []).map((o) => `${o.name ?? ""} ${o.location ?? ""}`).join(" ");
  const description = htmlToText(job.content);
  const isRemote = REMOTE.test(location ?? "") || REMOTE.test(offices);
  const url = job.absolute_url || `https://job-boards.greenhouse.io/${board.slug}/jobs/${job.id}`;
  return {
    source: "greenhouse",
    sourceJobId: `${board.slug}:${job.id}`,
    companySlug: board.slug,
    companyName: job.company_name || board.name,
    title: job.title?.trim() || "Untitled",
    isRemote,
    workplaceType: isRemote ? "Remote" : null,
    location,
    employmentType: null,
    department: job.departments?.[0]?.name ?? null,
    team: null,
    description,
    applyUrl: url,
    jobUrl: url,
    compensation: null,
    publishedAt: job.first_published ?? job.updated_at ?? null,
  };
}

export const greenhouse: JobSource = {
  id: "greenhouse",
  async listJobs(board) {
    const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(board.slug)}/jobs?content=true`;
    try {
      const body = await fetchJson<{ jobs?: GreenhouseJob[] }>(url);
      return (body.jobs ?? []).filter((j) => j.id && j.title).map((j) => mapGreenhouseJob(board, j));
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        throw new Error(`Greenhouse board not found: ${board.slug}`);
      }
      throw err;
    }
  },
};
