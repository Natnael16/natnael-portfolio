const RESERVED = new Set([
  "www",
  "www2",
  "blog",
  "about",
  "careers",
  "jobs",
  "job",
  "api",
  "app",
  "login",
  "signup",
  "signin",
  "embed",
  "application",
  "apply",
  "post",
  "posts",
  "static",
  "assets",
  "cdn",
  "admin",
  "support",
  "help",
  "docs",
  "legal",
  "privacy",
  "terms",
  "sitemap",
  "robots",
  "favicon",
  "undefined",
  "null",
  "true",
  "false",
  "index",
  "search",
  "explore",
  "pricing",
  "customers",
  "security",
  "posting-api",
  "job-board",
  "graphql",
  "non-user-graphql",
]);

/** Hosted boards and the public posting API; slugs may include spaces (%20). */
const SLUG_IN_URL =
  /(?:https?:\/\/)?(?:www\.)?(?:jobs\.ashbyhq\.com|api\.ashbyhq\.com\/posting-api\/job-board)\/([A-Za-z0-9](?:[A-Za-z0-9._\-]|%20|%2[0Dd]| ){0,79})(?=[/?#"'\s]|$)/gi;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const LEGAL_SUFFIX = /\b(incorporated|corporation|company|limited|llc|ltd|inc|corp|gmbh|plc|co)\.?$/i;
const ASHBY_OWN_HOSTS = new Set([
  "jobs",
  "api",
  "www",
  "www2",
  "app",
  "developers",
  "cdn",
  "academy",
  "ace",
  "docs",
  "embedded-media",
  "fleet",
  "internal",
  "operations",
  "sales",
  "status",
  "trust",
  "try",
  "you",
]);

export function isAshbyOwnHost(label: string): boolean {
  return ASHBY_OWN_HOSTS.has(label.toLowerCase());
}

/** `{board}.ashbyhq.com` custom hosts, excluding Ashby's own DNS. */
const ASHBY_SUBDOMAIN =
  /(?:https?:\/\/)?(?:www\.)?([A-Za-z0-9][A-Za-z0-9-]{0,62})\.ashbyhq\.com(?=[/:?#\s"']|$)/gi;

export function normalizeAshbySlug(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let slug = raw.trim();
  slug = slug.replace(/^https?:\/\//i, "");

  const host = slug.split(/[/?#]/)[0] ?? "";
  const sub = host.match(/^([A-Za-z0-9][A-Za-z0-9-]{0,62})\.ashbyhq\.com$/i);
  if (sub && !isAshbyOwnHost(sub[1])) {
    slug = sub[1];
  } else {
    slug = slug.replace(/^(www\.)?jobs\.ashbyhq\.com\//i, "");
    slug = slug.replace(/^api\.ashbyhq\.com\/posting-api\/job-board\//i, "");
    slug = slug.split(/[/?#]/)[0] ?? "";
  }

  try {
    slug = decodeURIComponent(slug.replace(/\+/g, "%20")).trim();
  } catch {
    return null;
  }
  slug = slug.replace(/\/+$/, "");
  slug = slug.replace(/\s+/g, " ").trim();
  if (/ashbyhq\.com/i.test(slug)) return null;
  if (!/^[A-Za-z0-9][A-Za-z0-9._ -]{0,79}$/.test(slug)) return null;
  if (RESERVED.has(slug.toLowerCase())) return null;
  if (UUID.test(slug)) return null;
  if (slug.includes("..")) return null;
  if (slug.startsWith(".")) return null;
  if (slug.endsWith(".")) return null;
  return slug.toLowerCase();
}

export function extractAshbySlugs(text: string): string[] {
  const found = new Set<string>();
  for (const match of text.matchAll(SLUG_IN_URL)) {
    const slug = normalizeAshbySlug(match[1]);
    if (slug) found.add(slug);
  }
  for (const match of text.matchAll(ASHBY_SUBDOMAIN)) {
    if (isAshbyOwnHost(match[1])) continue;
    const slug = normalizeAshbySlug(match[1]);
    if (slug) found.add(slug);
  }
  return [...found];
}

export function humanizeSlug(slug: string): string {
  const s = slug.trim();
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,24}$/i.test(s) && !s.includes(" ")) {
    const parts = s.split(".");
    const tld = parts.pop() ?? "";
    const head = parts.join(".").replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    return `${head}.${tld.toLowerCase()}`;
  }
  return s.replace(/[-_]+/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function addGuess(into: Set<string>, raw: string): void {
  const slug = normalizeAshbySlug(raw);
  if (slug) into.add(slug);
}

/** Candidate board names from a company title. Verified later via the posting API. */
export function slugGuessesFromName(name: string): string[] {
  const cleaned = name.replace(/\s+/g, " ").trim();
  if (!cleaned) return [];
  const stripped = cleaned.replace(LEGAL_SUFFIX, "").replace(/[,.|]+$/g, "").trim() || cleaned;
  const out = new Set<string>();
  for (const base of [cleaned, stripped]) {
    addGuess(out, base);
    addGuess(out, base.replace(/\s+/g, ""));
    addGuess(out, base.replace(/\s+/g, "-"));
    addGuess(out, base.replace(/\s+/g, "_"));
    addGuess(out, base.replace(/[^A-Za-z0-9]+/g, ""));
    addGuess(out, base.replace(/[^A-Za-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  }
  return [...out];
}

/** First hostname label often matches the Ashby slug (`linear.app` → `linear`). */
export function slugGuessesFromWebsite(website: string | null | undefined): string[] {
  if (!website) return [];
  try {
    const url = new URL(website.includes("://") ? website : `https://${website}`);
    const host = url.hostname.replace(/^www\./i, "");
    const label = host.split(".")[0] ?? "";
    return slugGuessesFromName(label);
  } catch {
    return [];
  }
}
