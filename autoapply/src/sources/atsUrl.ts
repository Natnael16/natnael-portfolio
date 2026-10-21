/**
 * Recognise a company careers-board link inside a feed or LinkedIn posting. When a remote
 * board or LinkedIn job applies through Ashby, Greenhouse or Lever, the company is registered
 * as a board so later runs read its postings straight from the source.
 */
import { normalizeAshbySlug } from "../lib/ashbySlug.js";

export type BoardSourceId = "ashby" | "greenhouse" | "lever";

export type BoardLink = {
  source: BoardSourceId;
  slug: string;
};

const SLUG = /^[a-z0-9][a-z0-9_-]{0,79}$/i;

export function boardFromUrl(raw: string | null | undefined): BoardLink | null {
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();
  const parts = url.pathname.split("/").filter(Boolean);

  if (host === "jobs.ashbyhq.com" || host.endsWith(".ashbyhq.com")) {
    const slug = normalizeAshbySlug(`${host}${url.pathname}`);
    return slug ? { source: "ashby", slug } : null;
  }

  if (/^(boards|job-boards)\.greenhouse\.io$/.test(host)) {
    const embedded = url.searchParams.get("for");
    const slug = parts[0] === "embed" ? embedded : parts[0];
    return slug && SLUG.test(slug) ? { source: "greenhouse", slug: slug.toLowerCase() } : null;
  }

  if (host === "jobs.lever.co") {
    const slug = parts[0];
    return slug && SLUG.test(slug) ? { source: "lever", slug: slug.toLowerCase() } : null;
  }

  return null;
}

/** Same posting reached through different hosts and tracking params compares equal. */
export function canonicalJobUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  try {
    const url = new URL(raw.trim());
    const host = url.hostname.toLowerCase().replace(/^www\./, "").replace(/^job-boards\./, "boards.");
    const pathname = url.pathname.replace(/\/(apply|application)\/?$/, "").replace(/\/+$/, "");
    const keep = ["gh_jid", "token", "for"]
      .map((k) => (url.searchParams.get(k) ? `${k}=${url.searchParams.get(k)}` : ""))
      .filter(Boolean)
      .join("&");
    return `${host}${pathname.toLowerCase()}${keep ? `?${keep}` : ""}`;
  } catch {
    return null;
  }
}
