/**
 * Curated remote-job boards with public APIs or feeds. Each board asks for light use and a
 * link back, so every board is read once per run and the stored job keeps the board's own URL.
 *
 * - Remotive:          https://remotive.com/api/remote-jobs (docs: github.com/remotive-com/remote-jobs-api)
 * - RemoteOK:          https://remoteok.com/api
 * - We Work Remotely:  per-category RSS, https://weworkremotely.com/remote-job-rss-feed
 * - Himalayas:         https://himalayas.app/jobs/api
 * - Jobicy:            https://jobicy.com/api/v2/remote-jobs
 */
import { decodeEntities, htmlToText, normalizeEmploymentType, salaryRange, slugify, toIsoDate } from "../../lib/text.js";
import { sleep } from "../../lib/time.js";
import { fetchJson, fetchText } from "../http.js";
import type { JobFeed, NormalizedJob } from "../types.js";

function feedJob(fields: Omit<NormalizedJob, "companySlug" | "isRemote" | "workplaceType" | "department" | "team">): NormalizedJob {
  return {
    ...fields,
    companySlug: slugify(fields.companyName) || "unknown",
    isRemote: true,
    workplaceType: "Remote",
    department: null,
    team: null,
  };
}

// --- Remotive -------------------------------------------------------------------------------

export type RemotiveJob = {
  id: number;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  tags?: string[];
  job_type?: string;
  publication_date?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
};

export function mapRemotiveJob(j: RemotiveJob): NormalizedJob {
  const url = j.url || `https://remotive.com/remote-jobs/${j.id}`;
  return feedJob({
    source: "remotive",
    sourceJobId: String(j.id),
    companyName: j.company_name?.trim() || "Unknown company",
    title: j.title?.trim() || "Untitled",
    location: j.candidate_required_location?.trim() || null,
    employmentType: normalizeEmploymentType(j.job_type),
    description: htmlToText(j.description),
    applyUrl: url,
    jobUrl: url,
    compensation: j.salary?.trim() || null,
    publishedAt: toIsoDate(j.publication_date),
  });
}

export const remotive: JobFeed = {
  id: "remotive",
  label: "Remotive",
  trust: "curated",
  async search() {
    const body = await fetchJson<{ jobs?: RemotiveJob[] }>(
      "https://remotive.com/api/remote-jobs?category=software-dev",
    );
    return (body.jobs ?? []).filter((j) => j.id && j.title).map(mapRemotiveJob);
  },
};

// --- RemoteOK -------------------------------------------------------------------------------

export type RemoteOkJob = {
  id?: string | number;
  slug?: string;
  epoch?: number;
  date?: string;
  company?: string;
  position?: string;
  tags?: string[];
  description?: string;
  location?: string;
  salary_min?: number;
  salary_max?: number;
  apply_url?: string;
  url?: string;
};

export function mapRemoteOkJob(j: RemoteOkJob): NormalizedJob {
  const url = j.url || `https://remoteok.com/remote-jobs/${j.slug ?? j.id}`;
  return feedJob({
    source: "remoteok",
    sourceJobId: String(j.id),
    companyName: decodeEntities(j.company?.trim() || "Unknown company"),
    title: decodeEntities(j.position?.trim() || "Untitled"),
    location: j.location?.trim() || null,
    employmentType: null,
    description: htmlToText(j.description),
    applyUrl: url,
    jobUrl: url,
    compensation: salaryRange(j.salary_min, j.salary_max),
    publishedAt: toIsoDate(j.date ?? j.epoch ?? null),
  });
}

export const remoteok: JobFeed = {
  id: "remoteok",
  label: "RemoteOK",
  trust: "curated",
  async search() {
    // The first array element is RemoteOK's legal notice, not a job.
    const body = await fetchJson<RemoteOkJob[]>("https://remoteok.com/api?tag=dev");
    return (Array.isArray(body) ? body : []).filter((j) => j.id && j.position).map(mapRemoteOkJob);
  },
};

// --- We Work Remotely (RSS) -----------------------------------------------------------------

const WWR_CATEGORIES = [
  "remote-full-stack-programming-jobs",
  "remote-back-end-programming-jobs",
  "remote-front-end-programming-jobs",
];

function tag(item: string, name: string): string | null {
  const m = item.match(new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}>`, "i"));
  if (!m) return null;
  const inner = m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, "$1").trim();
  return decodeEntities(inner);
}

export function parseWeWorkRemotelyRss(xml: string): NormalizedJob[] {
  const out: NormalizedJob[] = [];
  for (const m of xml.matchAll(/<item>([\s\S]*?)<\/item>/gi)) {
    const item = m[1];
    const rawTitle = tag(item, "title") ?? "";
    const link = tag(item, "link") ?? tag(item, "guid") ?? "";
    if (!rawTitle || !link) continue;
    // Titles are "Company: Role".
    const split = rawTitle.indexOf(": ");
    const companyName = split > 0 ? rawTitle.slice(0, split).trim() : "Unknown company";
    const title = split > 0 ? rawTitle.slice(split + 2).trim() : rawTitle.trim();
    const region = tag(item, "region");
    const country = tag(item, "country");
    out.push(
      feedJob({
        source: "weworkremotely",
        sourceJobId: link.replace(/^https?:\/\/(www\.)?weworkremotely\.com/, ""),
        companyName,
        title,
        location: [region, country].filter(Boolean).join(" · ") || null,
        employmentType: normalizeEmploymentType(tag(item, "type")),
        description: htmlToText(tag(item, "description")),
        applyUrl: link,
        jobUrl: link,
        compensation: null,
        publishedAt: toIsoDate(tag(item, "pubDate")),
      }),
    );
  }
  return out;
}

export const weworkremotely: JobFeed = {
  id: "weworkremotely",
  label: "We Work Remotely",
  trust: "curated",
  async search() {
    const seen = new Set<string>();
    const out: NormalizedJob[] = [];
    for (const category of WWR_CATEGORIES) {
      const xml = await fetchText(`https://weworkremotely.com/categories/${category}.rss`);
      for (const job of parseWeWorkRemotelyRss(xml)) {
        if (seen.has(job.sourceJobId)) continue;
        seen.add(job.sourceJobId);
        out.push(job);
      }
      await sleep(1_000);
    }
    return out;
  },
};

// --- Himalayas ------------------------------------------------------------------------------

export type HimalayasJob = {
  guid?: string;
  title?: string;
  excerpt?: string;
  companyName?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string;
  seniority?: string[];
  locationRestrictions?: string[];
  timezoneRestrictions?: number[];
  categories?: string[];
  description?: string;
  pubDate?: number | string;
  applicationLink?: string;
};

export function mapHimalayasJob(j: HimalayasJob): NormalizedJob {
  const url = j.applicationLink || j.guid || "";
  const restricted = (j.locationRestrictions ?? []).filter(Boolean);
  return feedJob({
    source: "himalayas",
    sourceJobId: j.guid || url,
    companyName: j.companyName?.trim() || "Unknown company",
    title: j.title?.trim() || "Untitled",
    // Himalayas leaves locationRestrictions empty when a role is open worldwide.
    location: restricted.length ? restricted.join(", ") : "Worldwide",
    employmentType: normalizeEmploymentType(j.employmentType),
    description: htmlToText(j.description) || j.excerpt?.trim() || "",
    applyUrl: url,
    jobUrl: j.guid || url,
    compensation: salaryRange(j.minSalary, j.maxSalary, j.currency || "USD"),
    publishedAt: toIsoDate(j.pubDate ?? null),
  });
}

export const himalayas: JobFeed = {
  id: "himalayas",
  label: "Himalayas",
  trust: "curated",
  async search({ maxAgeDays }) {
    const out: NormalizedJob[] = [];
    const oldest = Date.now() - maxAgeDays * 86_400_000;
    // Newest first, 20 per page. Stop once a page is all older than the age window.
    for (let page = 0; page < 10; page += 1) {
      const body = await fetchJson<{ jobs?: HimalayasJob[] }>(
        `https://himalayas.app/jobs/api?limit=20&offset=${page * 20}`,
      );
      const jobs = (body.jobs ?? []).filter((j) => j.title && (j.guid || j.applicationLink)).map(mapHimalayasJob);
      out.push(...jobs);
      const fresh = jobs.some((j) => j.publishedAt && Date.parse(j.publishedAt) >= oldest);
      if (jobs.length < 20 || !fresh) break;
      await sleep(1_000);
    }
    return out;
  },
};

// --- Jobicy ---------------------------------------------------------------------------------

export type JobicyJob = {
  id: number;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  jobIndustry?: string[];
  jobType?: string[];
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  annualSalaryMin?: number | string;
  annualSalaryMax?: number | string;
  salaryCurrency?: string;
};

export function mapJobicyJob(j: JobicyJob): NormalizedJob {
  const url = j.url || `https://jobicy.com/jobs/${j.id}`;
  return feedJob({
    source: "jobicy",
    sourceJobId: String(j.id),
    companyName: decodeEntities(j.companyName?.trim() || "Unknown company"),
    title: decodeEntities(j.jobTitle?.trim() || "Untitled"),
    location: j.jobGeo?.trim() || null,
    employmentType: normalizeEmploymentType(j.jobType),
    description: htmlToText(j.jobDescription) || j.jobExcerpt?.trim() || "",
    applyUrl: url,
    jobUrl: url,
    compensation: salaryRange(Number(j.annualSalaryMin), Number(j.annualSalaryMax), j.salaryCurrency || "USD"),
    publishedAt: toIsoDate(j.pubDate ?? null),
  });
}

export const jobicy: JobFeed = {
  id: "jobicy",
  label: "Jobicy",
  trust: "curated",
  async search() {
    // The engineering filter has had more than one slug; fall back to the unfiltered latest 50.
    let lastError: unknown = null;
    for (const query of ["count=50&industry=dev", "count=50&industry=engineering", "count=50"]) {
      try {
        const body = await fetchJson<{ jobs?: JobicyJob[] }>(`https://jobicy.com/api/v2/remote-jobs?${query}`);
        const jobs = (body.jobs ?? []).filter((j) => j.id && j.jobTitle);
        if (jobs.length) return jobs.map(mapJobicyJob);
      } catch (err) {
        lastError = err;
      }
    }
    if (lastError) throw lastError;
    return [];
  },
};
