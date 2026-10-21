/**
 * LinkedIn public job search: the logged-out "jobs-guest" pages anyone can open in a browser.
 * No account, cookies or login are used, so there is nothing of yours to get restricted, and
 * nothing is ever submitted on LinkedIn. Matches land in "Apply yourself" with the link.
 *
 * LinkedIn's terms do not allow automated collection, so this feed is deliberately small and
 * slow: a few searches per run, a capped number of detail pages, and a pause between requests.
 * Turn it off with FEEDS (drop "linkedin") if you would rather not use it.
 */
import { config } from "../../config.js";
import { decodeEntities, htmlToText, normalizeEmploymentType, slugify, toIsoDate } from "../../lib/text.js";
import { sleep } from "../../lib/time.js";
import { fetchText } from "../http.js";
import type { JobFeed, NormalizedJob } from "../types.js";

const BROWSER_HEADERS = {
  "user-agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0 Safari/537.36",
  "accept-language": "en-US,en;q=0.9",
};

export type LinkedInCard = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  postedAt: string | null;
  salary: string | null;
  url: string;
};

function textOf(chunk: string, className: string): string | null {
  const re = new RegExp(`<([a-z0-9]+)[^>]*class="[^"]*\\b${className}\\b[^"]*"[^>]*>([\\s\\S]*?)</\\1>`, "i");
  const m = chunk.match(re);
  if (!m) return null;
  const text = htmlToText(m[2]).replace(/\s+/g, " ").trim();
  return text || null;
}

/** Cards from a seeMoreJobPostings search page. */
export function parseLinkedInSearch(html: string): LinkedInCard[] {
  const cards: LinkedInCard[] = [];
  const seen = new Set<string>();
  for (const chunk of html.split(/<li[\s>]/i).slice(1)) {
    const id =
      chunk.match(/urn:li:jobPosting:(\d+)/)?.[1] ??
      chunk.match(/\/jobs\/view\/[^"?]*?(\d{6,})(?:[/?"]|$)/)?.[1];
    if (!id || seen.has(id)) continue;
    const title = textOf(chunk, "base-search-card__title");
    const company = textOf(chunk, "base-search-card__subtitle");
    if (!title || !company) continue;
    seen.add(id);
    const datetime = chunk.match(/<time[^>]*datetime="([^"]+)"/i)?.[1] ?? null;
    cards.push({
      id,
      title: decodeEntities(title),
      company: decodeEntities(company),
      location: textOf(chunk, "job-search-card__location"),
      postedAt: toIsoDate(datetime),
      salary: textOf(chunk, "job-search-card__salary-info"),
      url: `https://www.linkedin.com/jobs/view/${id}/`,
    });
  }
  return cards;
}

export type LinkedInDetail = {
  description: string;
  employmentType: string | null;
  seniority: string | null;
  /** Company careers page when the posting applies off LinkedIn. Null for Easy Apply. */
  externalApplyUrl: string | null;
};

/** The jobPosting page for one id. */
export function parseLinkedInDetail(html: string): LinkedInDetail {
  const start = html.search(/class="[^"]*show-more-less-html__markup/);
  let description = "";
  if (start >= 0) {
    const open = html.indexOf(">", start) + 1;
    const end = html.indexOf("show-more-less-html__button", open);
    description = htmlToText(html.slice(open, end > open ? html.lastIndexOf("<", end) : undefined));
  }

  const criteria = new Map<string, string>();
  for (const m of html.matchAll(
    /description__job-criteria-subheader[^>]*>([\s\S]*?)<\/h3>[\s\S]*?description__job-criteria-text[^>]*>([\s\S]*?)<\/span>/gi,
  )) {
    criteria.set(htmlToText(m[1]).toLowerCase(), htmlToText(m[2]));
  }

  let externalApplyUrl: string | null = null;
  const code = html.match(/<code[^>]*id="applyUrl"[^>]*>\s*<!--\s*"?([^"]*?)"?\s*-->/i)?.[1];
  if (code) {
    const raw = decodeEntities(code);
    const inner = raw.match(/[?&]url=([^&]+)/)?.[1];
    try {
      externalApplyUrl = inner ? decodeURIComponent(inner) : raw.startsWith("http") ? raw : null;
    } catch {
      externalApplyUrl = null;
    }
  }

  return {
    description,
    employmentType: criteria.get("employment type") ?? null,
    seniority: criteria.get("seniority level") ?? null,
    externalApplyUrl,
  };
}

export function linkedInJob(card: LinkedInCard, detail: LinkedInDetail): NormalizedJob {
  return {
    source: "linkedin",
    sourceJobId: card.id,
    companySlug: slugify(card.company) || "unknown",
    companyName: card.company,
    title: card.title,
    // Every search filters on f_WT=2 (remote).
    isRemote: true,
    workplaceType: "Remote",
    location: card.location,
    employmentType: normalizeEmploymentType(detail.employmentType),
    department: null,
    team: null,
    description: detail.seniority ? `${detail.description}\n\nSeniority level: ${detail.seniority}` : detail.description,
    applyUrl: detail.externalApplyUrl || card.url,
    jobUrl: card.url,
    compensation: card.salary,
    publishedAt: card.postedAt,
  };
}

function searchUrl(keywords: string, location: string, maxAgeDays: number, start: number): string {
  const params = new URLSearchParams({
    keywords,
    location,
    f_WT: "2",
    f_TPR: `r${Math.max(1, Math.round(maxAgeDays)) * 86_400}`,
    sortBy: "DD",
    start: String(start),
  });
  return `https://www.linkedin.com/jobs-guest/jobs/api/seeMoreJobPostings/search?${params}`;
}

function pause(): Promise<void> {
  return sleep(2_500 + Math.random() * 2_500);
}

function isRateLimit(err: unknown): boolean {
  return /^429\b/.test(err instanceof Error ? err.message : String(err));
}

async function collectCards(phrases: string[], maxAgeDays: number): Promise<Map<string, LinkedInCard>> {
  const cards = new Map<string, LinkedInCard>();
  for (const phrase of phrases) {
    for (const location of config.linkedinLocations) {
      for (let page = 0; page < config.linkedinPagesPerSearch; page += 1) {
        let html: string;
        try {
          html = await fetchText(searchUrl(phrase, location, maxAgeDays, page * 10), { headers: BROWSER_HEADERS });
        } catch (err) {
          // 429 means LinkedIn wants a break: stop searching this run and keep what we have.
          if (isRateLimit(err)) return cards;
          throw err;
        }
        const found = parseLinkedInSearch(html);
        if (!found.length && html.length > 2_000) {
          console.warn("linkedin: search page returned HTML but no job cards; the markup may have changed");
        }
        for (const card of found) cards.set(card.id, card);
        await pause();
        if (found.length < 10) break;
      }
    }
  }
  return cards;
}

export const linkedin: JobFeed = {
  id: "linkedin",
  label: "LinkedIn",
  trust: "open",
  async search({ keywords, maxAgeDays, isKnown, wantsTitle }) {
    const phrases = config.linkedinSearches.length ? config.linkedinSearches : keywords.slice(0, 3);
    const cards = await collectCards(phrases, maxAgeDays);
    const out: NormalizedJob[] = [];
    let details = 0;
    for (const card of cards.values()) {
      if (isKnown(card.id) || !wantsTitle(card.title)) continue;
      if (details >= config.linkedinMaxDetails) break;
      details += 1;
      try {
        const html = await fetchText(`https://www.linkedin.com/jobs-guest/jobs/api/jobPosting/${card.id}`, {
          headers: BROWSER_HEADERS,
        });
        out.push(linkedInJob(card, parseLinkedInDetail(html)));
      } catch (err) {
        if (isRateLimit(err)) break;
        console.warn(`linkedin: detail ${card.id} failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      await pause();
    }
    return out;
  },
};
