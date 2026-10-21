/**
 * Find every public Ashby board we can prove exists.
 * There is no official directory and no company cap — candidates come from
 * archives, crawls, name lists, and search, then each slug is verified on
 * Ashby's posting API.
 */
import fs from "node:fs";
import path from "node:path";
import { config } from "../config.js";
import {
  extractAshbySlugs,
  humanizeSlug,
  isAshbyOwnHost,
  normalizeAshbySlug,
  slugGuessesFromName,
  slugGuessesFromWebsite,
} from "../lib/ashbySlug.js";
import { mapPool, retryForever } from "../lib/pool.js";
import { sleep } from "../lib/time.js";

export type DiscoveredBoard = {
  slug: string;
  name: string;
};

export type DiscoverSourceStats = {
  wayback: number;
  commonCrawl: number;
  search: number;
  lists: number;
  names: number;
  urlscan: number;
  hn: number;
  embeds: number;
  subdomains: number;
};

export type DiscoverStats = {
  candidates: number;
  verified: number;
  rejected: number;
  inserted: number;
  alreadyKnown: number;
  waybackDone: boolean;
  sources: DiscoverSourceStats;
};

type CacheFile = {
  updatedAt: string;
  slugs: string[];
  candidates: string[];
  rejected: Record<string, string>;
  waybackResumeKey: string | null;
  waybackApiResumeKey: string | null;
  waybackDone: boolean;
  waybackApiDone: boolean;
  searchDone: boolean;
  searchExtraDone: boolean;
  ccDone: boolean;
  urlscanDone: boolean;
  hnDone: boolean;
  embedsDone: boolean;
  subdomainsDone: boolean;
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const CACHE_PATH = () => path.join(config.dataDir, "ashby-slugs.cache.json");

const CAREER_PATHS = ["/careers", "/jobs", "/company/careers", "/about/careers", "/join"];

function emptyCache(): CacheFile {
  return {
    updatedAt: "",
    slugs: [],
    candidates: [],
    rejected: {},
    waybackResumeKey: null,
    waybackApiResumeKey: null,
    waybackDone: false,
    waybackApiDone: false,
    searchDone: false,
    searchExtraDone: false,
    ccDone: false,
    urlscanDone: false,
    hnDone: false,
    embedsDone: false,
    subdomainsDone: false,
  };
}

function loadCache(): CacheFile {
  const file = CACHE_PATH();
  if (!fs.existsSync(file)) return emptyCache();
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as Partial<CacheFile>;
    return {
      ...emptyCache(),
      updatedAt: parsed.updatedAt ?? "",
      slugs: (Array.isArray(parsed.slugs) ? parsed.slugs : [])
        .map((s) => normalizeAshbySlug(s))
        .filter((s): s is string => Boolean(s)),
      candidates: (Array.isArray(parsed.candidates) ? parsed.candidates : [])
        .map((s) => normalizeAshbySlug(s))
        .filter((s): s is string => Boolean(s)),
      rejected: parsed.rejected && typeof parsed.rejected === "object" ? parsed.rejected : {},
      waybackResumeKey: parsed.waybackResumeKey ?? null,
      waybackApiResumeKey: parsed.waybackApiResumeKey ?? null,
      waybackDone: Boolean(parsed.waybackDone),
      waybackApiDone: Boolean(parsed.waybackApiDone),
      searchDone: Boolean(parsed.searchDone),
      searchExtraDone: Boolean(parsed.searchExtraDone),
      ccDone: Boolean(parsed.ccDone),
      urlscanDone: Boolean(parsed.urlscanDone),
      hnDone: Boolean(parsed.hnDone),
      embedsDone: Boolean(parsed.embedsDone),
      subdomainsDone: Boolean(parsed.subdomainsDone),
    };
  } catch {
    return emptyCache();
  }
}

function saveCache(cache: CacheFile) {
  cache.updatedAt = new Date().toISOString();
  fs.mkdirSync(path.dirname(CACHE_PATH()), { recursive: true });
  fs.writeFileSync(CACHE_PATH(), JSON.stringify(cache, null, 2));
}

async function fetchText(
  url: string,
  opts?: { timeoutMs?: number; headers?: Record<string, string> },
): Promise<{ status: number; text: string; url: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts?.timeoutMs ?? 45_000);
  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: {
        accept: "text/html,application/json;q=0.9,*/*;q=0.8",
        "user-agent": UA,
        ...opts?.headers,
      },
      redirect: "follow",
    });
    const text = await res.text();
    return { status: res.status, text, url: res.url };
  } finally {
    clearTimeout(timer);
  }
}

function isRetryable(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /429|rate limited|abort|timeout|ECONNRESET|ENOTFOUND|fetch failed|503|502|500/i.test(msg);
}

function addSlugs(into: Set<string>, text: string): number {
  const before = into.size;
  for (const slug of extractAshbySlugs(text)) into.add(slug);
  for (const slug of extractEmbeddedSlugs(text)) into.add(slug);
  return into.size - before;
}

function extractEmbeddedSlugs(text: string): string[] {
  const found = new Set<string>();
  const patterns = [
    /__ashbyBaseJobBoardUrl["']?\s*[:=]\s*["']([^"']+)/gi,
    /organizationHostedJobsPageName["']?\s*[:=]\s*["']([^"']+)/gi,
    /jobBoardName["']?\s*[:=]\s*["']([^"']+)/gi,
    /ashbyhq\.com\/(?:embed\/)?([A-Za-z0-9][A-Za-z0-9._% -]{0,79})/gi,
  ];
  for (const re of patterns) {
    for (const match of text.matchAll(re)) {
      const slug = normalizeAshbySlug(match[1]);
      if (slug) found.add(slug);
    }
  }
  return [...found];
}

function addGuesses(into: Set<string>, name: string | null | undefined, website?: string | null): number {
  const before = into.size;
  if (name) for (const slug of slugGuessesFromName(name)) into.add(slug);
  if (website) for (const slug of slugGuessesFromWebsite(website)) into.add(slug);
  return into.size - before;
}

async function discoverFromLists(into: Set<string>): Promise<number> {
  const urls = [
    "https://raw.githubusercontent.com/AkshatBhat/find-companies-using-ashby-job-boards/main/examples/example_verified_ashby_slugs.csv",
  ];
  const seedPaths = [
    path.resolve("data/ashby-boards.seed.json"),
    path.resolve("seed/ashby-boards.seed.json"),
  ];
  let added = 0;
  for (const seedPath of seedPaths) {
    if (!fs.existsSync(seedPath)) continue;
    const raw = fs.readFileSync(seedPath, "utf8");
    added += addSlugs(into, raw);
    try {
      const rows = JSON.parse(raw) as Array<{ slug?: string }>;
      for (const row of rows) {
        const slug = normalizeAshbySlug(row.slug);
        if (slug && !into.has(slug)) {
          into.add(slug);
          added += 1;
        }
      }
    } catch {
      /* not json */
    }
  }
  for (const url of urls) {
    try {
      const { text } = await fetchText(url, { timeoutMs: 20_000 });
      added += addSlugs(into, text);
    } catch (err) {
      console.warn(`discover list ${url}:`, err instanceof Error ? err.message : err);
    }
  }
  return added;
}

type YcCompany = {
  name?: string;
  slug?: string;
  website?: string;
  url?: string;
};

async function mergeYcJson(url: string, into: Map<string, YcCompany>, timeoutMs: number): Promise<number> {
  const before = into.size;
  try {
    const { status, text } = await fetchText(url, { timeoutMs });
    if (status !== 200) {
      console.warn(`discover yc ${url}: HTTP ${status}`);
      return 0;
    }
    const rows = JSON.parse(text) as YcCompany[];
    if (!Array.isArray(rows)) return 0;
    for (const row of rows) {
      const key = (row.name || row.slug || "").toLowerCase();
      if (key) into.set(key, row);
    }
  } catch (err) {
    console.warn(`discover yc ${url}:`, err instanceof Error ? err.message : err);
    return 0;
  }
  console.log(`discover yc ${url} companies=${into.size} (+${into.size - before})`);
  return into.size - before;
}

async function loadYcCompanies(includeAll = true): Promise<YcCompany[]> {
  const byName = new Map<string, YcCompany>();
  await mergeYcJson("https://yc-oss.github.io/api/companies/hiring.json", byName, 45_000);
  if (includeAll) {
    await mergeYcJson("https://yc-oss.github.io/api/companies/all.json", byName, 45_000);
  }
  return [...byName.values()];
}

async function discoverFromNames(into: Set<string>, tick?: () => Promise<void>): Promise<number> {
  const before = into.size;
  const companies = await loadYcCompanies();
  for (const row of companies) {
    addGuesses(into, row.name, row.website);
    const ycSlug = normalizeAshbySlug(row.slug);
    if (ycSlug) into.add(ycSlug);
  }
  try {
    const { status, text } = await fetchText("https://www.ashbyhq.com/customers", { timeoutMs: 25_000 });
    if (status === 200) {
      addedFromCustomerPage(into, text);
    }
  } catch (err) {
    console.warn("discover ashby customers:", err instanceof Error ? err.message : err);
  }
  const added = into.size - before;
  console.log(`discover names +${added} unique=${into.size}`);
  if (tick) await tick();
  return added;
}

function addedFromCustomerPage(into: Set<string>, html: string): void {
  addSlugs(into, html);
  for (const match of html.matchAll(/<(?:h[1-4]|figcaption)[^>]*>\s*([^<]{2,80})\s*</gi)) {
    addGuesses(into, match[1].replace(/&amp;/g, "&").replace(/&#\d+;/g, " "));
  }
  for (const match of html.matchAll(/alt=["']([^"']{2,80})["']/gi)) {
    if (/logo|ashby|customer/i.test(match[1])) continue;
    addGuesses(into, match[1]);
  }
  for (const match of html.matchAll(/\/customers\/([A-Za-z0-9][A-Za-z0-9_-]{1,79})/gi)) {
    addGuesses(into, match[1].replace(/-/g, " "));
    const slug = normalizeAshbySlug(match[1]);
    if (slug) into.add(slug);
  }
}

const SEARCH_QUERIES = [
  "site:jobs.ashbyhq.com",
  "site:jobs.ashbyhq.com software engineer",
  "site:jobs.ashbyhq.com remote",
  "site:jobs.ashbyhq.com \"apply\"",
  ...[..."abcdefghijklmnopqrstuvwxyz0123456789"].map((ch) => `site:jobs.ashbyhq.com/${ch}`),
];

const EXTRA_SEARCH_QUERIES = [
  "site:github.com jobs.ashbyhq.com",
  "site:github.com api.ashbyhq.com/posting-api/job-board",
  "site:news.ycombinator.com jobs.ashbyhq.com",
  "\"powered by Ashby\" careers",
  "inurl:embed jobs.ashbyhq.com",
  "site:jobs.ashbyhq.com/embed",
];

const SUBDOMAIN_SEARCH_QUERIES = [
  "site:ashbyhq.com -site:jobs.ashbyhq.com -site:www.ashbyhq.com -site:api.ashbyhq.com",
  "inurl:.ashbyhq.com careers OR jobs OR apply",
  "\"*.ashbyhq.com\" hiring OR careers",
];

async function duckDuckGoQuery(query: string, into: Set<string>): Promise<number> {
  let added = 0;
  for (let offset = 0; ; offset += 30) {
    const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}&s=${offset}`;
    try {
      const { status, text } = await fetchText(url, { timeoutMs: 25_000 });
      if (status !== 200) break;
      const n = addSlugs(into, text);
      added += n;
      const hasNext = /class="nav-link"|name="s"|Next/i.test(text) && /ashbyhq\.com/i.test(text);
      if (!hasNext || n === 0) break;
    } catch {
      break;
    }
    await sleep(700);
  }
  return added;
}

async function bingQuery(query: string, into: Set<string>): Promise<number> {
  let added = 0;
  for (let first = 1; ; first += 10) {
    const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&first=${first}`;
    try {
      const { status, text } = await fetchText(url, { timeoutMs: 25_000 });
      if (status !== 200) break;
      const n = addSlugs(into, text);
      added += n;
      if (!/ashbyhq\.com/i.test(text) || n === 0) break;
    } catch {
      break;
    }
    await sleep(800);
  }
  return added;
}

async function braveQuery(query: string, into: Set<string>): Promise<number> {
  let added = 0;
  for (let offset = 0; offset <= 90; offset += 10) {
    const url = `https://search.brave.com/search?q=${encodeURIComponent(query)}&offset=${offset}`;
    try {
      const { status, text } = await fetchText(url, { timeoutMs: 25_000 });
      if (status !== 200) break;
      const n = addSlugs(into, text);
      added += n;
      if (!/ashbyhq\.com/i.test(text) || n === 0) break;
    } catch {
      break;
    }
    await sleep(800);
  }
  return added;
}

async function yahooQuery(query: string, into: Set<string>): Promise<number> {
  let added = 0;
  for (let b = 1; b <= 91; b += 10) {
    const url = `https://search.yahoo.com/search?p=${encodeURIComponent(query)}&b=${b}`;
    try {
      const { status, text } = await fetchText(url, { timeoutMs: 25_000 });
      if (status !== 200) break;
      const n = addSlugs(into, text);
      added += n;
      if (!/ashbyhq\.com/i.test(text) || n === 0) break;
    } catch {
      break;
    }
    await sleep(800);
  }
  return added;
}

async function discoverFromSearch(
  into: Set<string>,
  tick?: () => Promise<void>,
): Promise<number> {
  let added = 0;
  for (const query of SEARCH_QUERIES) {
    added += await duckDuckGoQuery(query, into);
    added += await bingQuery(query, into);
    console.log(`discover search "${query}" → ${into.size} unique slugs`);
    if (tick) await tick();
  }
  return added;
}

async function discoverFromExtraSearch(
  into: Set<string>,
  tick?: () => Promise<void>,
): Promise<number> {
  let added = 0;
  const queries = [...EXTRA_SEARCH_QUERIES, "site:jobs.ashbyhq.com"];
  for (const query of queries) {
    added += await braveQuery(query, into);
    added += await yahooQuery(query, into);
    added += await duckDuckGoQuery(query, into);
    console.log(`discover extra search "${query}" → ${into.size} unique slugs`);
    if (tick) await tick();
  }
  return added;
}

type CdxField = "waybackResumeKey" | "waybackApiResumeKey";
type CdxDone = "waybackDone" | "waybackApiDone";

async function discoverFromWaybackCdx(
  into: Set<string>,
  cache: CacheFile,
  tick: (() => Promise<void>) | undefined,
  spec: { url: string; resume: CdxField; done: CdxDone; label: string },
): Promise<number> {
  let added = 0;
  let resumeKey = cache[spec.resume];
  if (cache[spec.done]) return 0;

  for (;;) {
    const params = new URLSearchParams({
      url: spec.url,
      output: "txt",
      fl: "original",
      limit: "20000",
      showResumeKey: "true",
    });
    if (resumeKey) params.set("resumeKey", resumeKey);
    const url = `https://web.archive.org/cdx/search/cdx?${params}`;
    try {
      const { status, text } = await retryForever(
        spec.label,
        async () => {
          const res = await fetchText(url, { timeoutMs: 90_000 });
          if (res.status === 429 || res.status >= 500) {
            throw new Error(`${spec.label} ${res.status}`);
          }
          return res;
        },
        isRetryable,
      );
      if (status !== 200 || !text.trim()) {
        cache[spec.done] = true;
        cache[spec.resume] = null;
        break;
      }
      const lines = text.split(/\r?\n/);
      let nextKey: string | null = null;
      const body: string[] = [];
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) {
          const rest = lines
            .slice(i + 1)
            .map((l) => l.trim())
            .filter(Boolean);
          if (rest.length === 1 && !/^https?:/i.test(rest[0])) {
            nextKey = rest[0];
            break;
          }
        }
        body.push(line);
      }
      const chunk = body.join("\n");
      added += addSlugs(into, chunk);
      console.log(`discover ${spec.label} +${added} running unique=${into.size}`);
      cache[spec.resume] = nextKey;
      cache.candidates = [...into];
      if (tick) await tick();
      if (!nextKey) {
        cache[spec.done] = true;
        break;
      }
      resumeKey = nextKey;
    } catch (err) {
      console.warn(`discover ${spec.label} paused:`, err instanceof Error ? err.message : err);
      break;
    }
    await sleep(400);
  }
  return added;
}

async function discoverFromWayback(
  into: Set<string>,
  cache: CacheFile,
  tick?: () => Promise<void>,
): Promise<number> {
  const hosted = await discoverFromWaybackCdx(into, cache, tick, {
    url: "jobs.ashbyhq.com/*",
    resume: "waybackResumeKey",
    done: "waybackDone",
    label: "wayback cdx",
  });
  const api = await discoverFromWaybackCdx(into, cache, tick, {
    url: "api.ashbyhq.com/posting-api/job-board/*",
    resume: "waybackApiResumeKey",
    done: "waybackApiDone",
    label: "wayback posting-api",
  });
  return hosted + api;
}

async function commonCrawlIndexes(): Promise<string[]> {
  try {
    const { status, text } = await fetchText("https://index.commoncrawl.org/collinfo.json", {
      timeoutMs: 30_000,
    });
    if (status !== 200) return [];
    const rows = JSON.parse(text) as Array<{ "cdx-api"?: string; id?: string }>;
    return rows.map((r) => r["cdx-api"]).filter((u): u is string => Boolean(u));
  } catch {
    return [];
  }
}

async function discoverFromCommonCrawl(
  into: Set<string>,
  tick?: () => Promise<void>,
  latestOnly = false,
): Promise<{ added: number; finished: boolean }> {
  const indexes = await commonCrawlIndexes();
  const selected = latestOnly ? indexes.slice(0, 2) : indexes.slice(0, 12);
  const patterns = ["jobs.ashbyhq.com/*", "api.ashbyhq.com/posting-api/job-board/*"];
  let added = 0;
  let finished = true;
  for (const cdx of selected) {
    for (const pattern of patterns) {
      for (let page = 0; ; page++) {
        const url = `${cdx}?url=${encodeURIComponent(pattern)}&output=json&fl=url&page=${page}`;
        try {
          const { status, text } = await fetchText(url, { timeoutMs: 90_000 });
          if (status === 404 || !text.trim()) break;
          if (status !== 200) {
            finished = false;
            break;
          }
          added += addSlugs(into, text);
          console.log(`discover cc ${cdx} ${pattern} page ${page} unique=${into.size}`);
          if (tick) await tick();
        } catch (err) {
          finished = false;
          console.warn(`discover cc ${cdx} page ${page}:`, err instanceof Error ? err.message : err);
          break;
        }
        await sleep(250);
      }
    }
  }
  return { added, finished: finished && selected.length > 0 };
}

async function discoverFromUrlscan(
  into: Set<string>,
  cache: CacheFile,
  tick?: () => Promise<void>,
): Promise<number> {
  let added = 0;
  const queries = cache.urlscanDone
    ? ["page.domain:jobs.ashbyhq.com"]
    : ["page.domain:jobs.ashbyhq.com", "domain:jobs.ashbyhq.com"];
  const maxPages = cache.urlscanDone ? 2 : 80;
  for (const query of queries) {
    let searchAfter: string | null = null;
    for (let page = 0; page < maxPages; page++) {
      const params = new URLSearchParams({ q: query, size: "100" });
      if (searchAfter) params.set("search_after", searchAfter);
      try {
        const { status, text } = await fetchText(`https://urlscan.io/api/v1/search/?${params}`, {
          timeoutMs: 30_000,
        });
        if (status !== 200) break;
        const payload = JSON.parse(text) as {
          results?: Array<{ task?: { url?: string }; page?: { url?: string }; sort?: unknown[] }>;
          has_more?: boolean;
        };
        const blob = JSON.stringify(payload);
        added += addSlugs(into, blob);
        const last = payload.results?.at(-1);
        searchAfter = last?.sort?.length ? last.sort.map(String).join(",") : null;
        console.log(`discover urlscan "${query}" p${page} unique=${into.size}`);
        if (tick) await tick();
        if (!payload.has_more || !searchAfter || !payload.results?.length) break;
      } catch (err) {
        console.warn("discover urlscan:", err instanceof Error ? err.message : err);
        break;
      }
      await sleep(1_200);
    }
  }
  cache.urlscanDone = true;
  return added;
}

async function discoverFromHn(into: Set<string>, cache: CacheFile, tick?: () => Promise<void>): Promise<number> {
  let added = 0;
  const queries = ["jobs.ashbyhq.com", "api.ashbyhq.com/posting-api/job-board"];
  const maxPages = cache.hnDone ? 2 : 20;
  for (const query of queries) {
    for (let page = 0; page < maxPages; page++) {
      const url = `https://hn.algolia.com/api/v1/search?query=${encodeURIComponent(query)}&hitsPerPage=100&page=${page}`;
      try {
        const { status, text } = await fetchText(url, { timeoutMs: 25_000 });
        if (status !== 200) break;
        const payload = JSON.parse(text) as { nbPages?: number; hits?: unknown[] };
        added += addSlugs(into, text);
        console.log(`discover hn "${query}" p${page} unique=${into.size}`);
        if (tick) await tick();
        if (!payload.hits?.length || page + 1 >= (payload.nbPages ?? 0)) break;
      } catch (err) {
        console.warn("discover hn:", err instanceof Error ? err.message : err);
        break;
      }
      await sleep(400);
    }
  }
  cache.hnDone = true;
  return added;
}

function labelsFromAshbyHosts(text: string): string[] {
  const labels = new Set<string>();
  for (const match of text.matchAll(
    /(?:^|[/"'\s,=[\]{}])(?:https?:\/\/)?(?:www\.)?([A-Za-z0-9][A-Za-z0-9-]{0,62})\.ashbyhq\.com\b/gi,
  )) {
    const label = match[1].toLowerCase();
    if (isAshbyOwnHost(label)) continue;
    labels.add(label);
  }
  return [...labels];
}

function absorbHostText(text: string, into: Set<string>, hosts: Set<string>): number {
  const before = into.size;
  addSlugs(into, text);
  for (const label of labelsFromAshbyHosts(text)) {
    hosts.add(label);
    const slug = normalizeAshbySlug(label);
    if (slug) into.add(slug);
  }
  return into.size - before;
}

async function harvestDnsAndCtHosts(into: Set<string>, hosts: Set<string>): Promise<number> {
  const before = into.size;
  const urls = [
    "https://api.hackertarget.com/hostsearch/?q=ashbyhq.com",
    "https://api.certspotter.com/v1/issuances?domain=ashbyhq.com&include_subdomains=true&expand=dns_names",
    "https://crt.sh/?q=%25.ashbyhq.com&output=json",
  ];
  for (const url of urls) {
    try {
      const { status, text } = await fetchText(url, { timeoutMs: 20_000 });
      if (status !== 200 || !text.trim()) {
        console.warn(`discover subdomains ${url}: HTTP ${status}`);
        continue;
      }
      absorbHostText(text, into, hosts);
    } catch (err) {
      console.warn(`discover subdomains ${url}:`, err instanceof Error ? err.message : err);
    }
  }
  return into.size - before;
}

async function harvestUrlscanSubdomains(
  into: Set<string>,
  hosts: Set<string>,
  tick?: () => Promise<void>,
): Promise<number> {
  let added = 0;
  const queries = [
    "page.domain:ashbyhq.com AND NOT page.domain:jobs.ashbyhq.com AND NOT page.domain:www.ashbyhq.com AND NOT page.domain:app.ashbyhq.com",
    "domain:ashbyhq.com AND NOT page.domain:jobs.ashbyhq.com",
  ];
  for (const query of queries) {
    let searchAfter: string | null = null;
    for (let page = 0; page < 20; page++) {
      const params = new URLSearchParams({ q: query, size: "100" });
      if (searchAfter) params.set("search_after", searchAfter);
      try {
        const { status, text } = await fetchText(`https://urlscan.io/api/v1/search/?${params}`, {
          timeoutMs: 30_000,
        });
        if (status !== 200) break;
        const payload = JSON.parse(text) as {
          results?: Array<{ sort?: unknown[] }>;
          has_more?: boolean;
        };
        added += absorbHostText(text, into, hosts);
        const last = payload.results?.at(-1);
        searchAfter = last?.sort?.length ? last.sort.map(String).join(",") : null;
        console.log(`discover subdomains urlscan p${page} unique=${into.size} hosts=${hosts.size}`);
        if (tick) await tick();
        if (!payload.has_more || !searchAfter || !payload.results?.length) break;
      } catch (err) {
        console.warn("discover subdomains urlscan:", err instanceof Error ? err.message : err);
        break;
      }
      await sleep(1_200);
    }
  }
  return added;
}

async function probeSubdomainHosts(
  into: Set<string>,
  hosts: Set<string>,
  tick?: () => Promise<void>,
): Promise<number> {
  const labels = [...hosts].filter((label) => !isAshbyOwnHost(label)).slice(0, 200);
  if (!labels.length) return 0;
  const before = into.size;
  let scanned = 0;
  await mapPool(labels, 6, async (label) => {
    try {
      const { status, text, url } = await fetchText(`https://${label}.ashbyhq.com/`, {
        timeoutMs: 8_000,
      });
      if (url) absorbHostText(url, into, hosts);
      if (status < 400 && text) absorbHostText(text, into, hosts);
    } catch {
      /* dead or not a board host */
    }
    scanned += 1;
    if (scanned % 25 === 0 || scanned === labels.length) {
      console.log(`discover subdomains probe ${scanned}/${labels.length} unique=${into.size}`);
    }
  });
  if (tick) await tick();
  return into.size - before;
}

async function discoverFromSubdomains(
  into: Set<string>,
  cache: CacheFile,
  tick?: () => Promise<void>,
): Promise<number> {
  const before = into.size;
  const hosts = new Set<string>();
  await harvestDnsAndCtHosts(into, hosts);
  console.log(`discover subdomains dns/ct unique=${into.size} hosts=${hosts.size}`);
  if (tick) await tick();

  await harvestUrlscanSubdomains(into, hosts, tick);

  if (!cache.subdomainsDone) {
    const known = new Set(into);
    for (const query of SUBDOMAIN_SEARCH_QUERIES) {
      await duckDuckGoQuery(query, into);
      await bingQuery(query, into);
      await braveQuery(query, into);
      await yahooQuery(query, into);
      console.log(`discover subdomains search "${query}" → ${into.size} unique slugs`);
      if (tick) await tick();
    }
    for (const slug of into) {
      if (known.has(slug)) continue;
      if (/^[a-z0-9][a-z0-9-]{0,62}$/i.test(slug) && !isAshbyOwnHost(slug)) {
        hosts.add(slug);
      }
    }
    try {
      const hnUrl =
        "https://hn.algolia.com/api/v1/search?query=" +
        encodeURIComponent(".ashbyhq.com") +
        "&hitsPerPage=100&page=0";
      const { status, text } = await fetchText(hnUrl, { timeoutMs: 25_000 });
      if (status === 200) absorbHostText(text, into, hosts);
    } catch (err) {
      console.warn("discover subdomains hn:", err instanceof Error ? err.message : err);
    }
  }

  await probeSubdomainHosts(into, hosts, tick);
  cache.subdomainsDone = true;
  const added = into.size - before;
  console.log(`discover subdomains +${added} unique=${into.size} hosts=${hosts.size}`);
  if (tick) await tick();
  return added;
}

function originFromWebsite(website: string): string | null {
  try {
    const url = new URL(website.includes("://") ? website : `https://${website}`);
    if (!/^https?:$/.test(url.protocol)) return null;
    return `${url.protocol}//${url.host}`;
  } catch {
    return null;
  }
}

async function discoverFromEmbeds(
  into: Set<string>,
  cache: CacheFile,
  tick?: () => Promise<void>,
): Promise<number> {
  if (cache.embedsDone) return 0;
  const companies = await loadYcCompanies(false);
  const origins: string[] = [];
  const seen = new Set<string>();
  for (const row of companies) {
    const origin = originFromWebsite(row.website || "");
    if (!origin || seen.has(origin)) continue;
    seen.add(origin);
    origins.push(origin);
    if (origins.length >= 2_500) break;
  }
  console.log(`discover embeds crawling ${origins.length} career sites`);
  const before = into.size;
  let scanned = 0;
  await mapPool(origins, 6, async (origin) => {
    for (const suffix of CAREER_PATHS) {
      try {
        const { status, text } = await fetchText(`${origin}${suffix}`, { timeoutMs: 8_000 });
        if (status >= 400 || !text) continue;
        const n = addSlugs(into, text);
        if (n > 0 || /ashby|__ashbyBaseJobBoardUrl/i.test(text)) break;
      } catch {
        /* dead origin */
      }
    }
    scanned += 1;
    if (scanned % 50 === 0 || scanned === origins.length) {
      console.log(`discover embeds ${scanned}/${origins.length} unique=${into.size}`);
    }
  });
  cache.embedsDone = true;
  const added = into.size - before;
  console.log(`discover embeds +${added} unique=${into.size}`);
  if (tick) await tick();
  return added;
}

export type VerifyResult = {
  slug: string;
  ok: boolean;
  name: string | null;
};

export async function verifyAshbyBoard(slug: string): Promise<VerifyResult> {
  const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(slug)}`;
  const { status, text } = await retryForever(
    `verify ${slug}`,
    async () => {
      const res = await fetchText(url, {
        timeoutMs: 20_000,
        headers: { accept: "application/json" },
      });
      if (res.status === 429 || res.status >= 500) {
        throw new Error(`Ashby rate limited listing ${slug}`);
      }
      return res;
    },
    isRetryable,
  );
  if (status !== 200) return { slug, ok: false, name: null };
  try {
    JSON.parse(text);
  } catch {
    return { slug, ok: false, name: null };
  }
  return { slug, ok: true, name: humanizeSlug(slug) };
}

export async function collectAshbyCandidates(opts?: {
  skipSearch?: boolean;
  onProgress?: (slugs: string[], cache: CacheFile) => Promise<void>;
}): Promise<{ slugs: string[]; sources: DiscoverSourceStats; waybackDone: boolean; cache: CacheFile }> {
  const cache = loadCache();
  const slugs = new Set<string>(
    [...cache.slugs, ...cache.candidates]
      .map((s) => normalizeAshbySlug(s))
      .filter((s): s is string => Boolean(s)),
  );
  const sources: DiscoverSourceStats = {
    wayback: 0,
    commonCrawl: 0,
    search: 0,
    lists: 0,
    names: 0,
    urlscan: 0,
    hn: 0,
    embeds: 0,
    subdomains: 0,
  };

  const tick = async () => {
    cache.candidates = [...slugs];
    if (opts?.onProgress) await opts.onProgress([...slugs], cache);
  };

  sources.lists = await discoverFromLists(slugs);
  await tick();

  sources.names = await discoverFromNames(slugs, tick);

  if (cache.searchDone && !opts?.skipSearch) {
    sources.search += await duckDuckGoQuery("site:jobs.ashbyhq.com", slugs);
    sources.search += await bingQuery("site:jobs.ashbyhq.com", slugs);
    await tick();
  }

  const extra = await Promise.all([
    discoverFromCommonCrawl(slugs, tick, cache.ccDone).then((r) => {
      if (r.finished) cache.ccDone = true;
      return r.added;
    }),
    discoverFromWayback(slugs, cache, tick),
    cache.searchDone || opts?.skipSearch
      ? Promise.resolve(0)
      : discoverFromSearch(slugs, tick).then((n) => {
          cache.searchDone = true;
          return n;
        }),
    cache.searchExtraDone || opts?.skipSearch
      ? Promise.resolve(0)
      : discoverFromExtraSearch(slugs, tick).then((n) => {
          cache.searchExtraDone = true;
          return n;
        }),
    discoverFromUrlscan(slugs, cache, tick),
    discoverFromHn(slugs, cache, tick),
  ]);
  sources.commonCrawl = extra[0];
  sources.wayback = extra[1];
  sources.search += extra[2] + extra[3];
  sources.urlscan = extra[4];
  sources.hn = extra[5];

  sources.subdomains = await discoverFromSubdomains(slugs, cache, tick);
  sources.embeds = await discoverFromEmbeds(slugs, cache, tick);

  cache.candidates = [...slugs];
  saveCache(cache);
  await tick();
  return {
    slugs: [...slugs],
    sources,
    waybackDone: cache.waybackDone && cache.waybackApiDone,
    cache,
  };
}

export async function verifyNewBoards(
  candidates: string[],
  already: Set<string>,
  cache: CacheFile,
): Promise<{ verified: DiscoveredBoard[]; rejected: number }> {
  const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const pending = candidates.filter((slug) => {
    if (already.has(slug)) return false;
    const rejectedAt = cache.rejected[slug];
    if (rejectedAt && Date.parse(rejectedAt) > weekAgo) return false;
    return true;
  });

  const verified: DiscoveredBoard[] = [];
  let rejected = 0;
  if (!pending.length) return { verified, rejected };
  console.log(`discover verify ${pending.length} slugs against posting API`);
  let done = 0;
  await mapPool(pending, 8, async (slug) => {
    const result = await verifyAshbyBoard(slug);
    if (result.ok) {
      verified.push({ slug, name: result.name ?? humanizeSlug(slug) });
      delete cache.rejected[slug];
    } else {
      rejected += 1;
      cache.rejected[slug] = new Date().toISOString();
    }
    done += 1;
    if (done % 200 === 0 || done === pending.length) {
      console.log(`discover verify ${done}/${pending.length} live=${verified.length} rejected=${rejected}`);
    }
  });
  return { verified, rejected };
}

export { loadCache, saveCache };
