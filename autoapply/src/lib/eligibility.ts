/**
 * "Remote" rarely means "from anywhere". This decides, without a model, whether a remote
 * posting is open to someone living where the profile says, using the posting's location
 * field and the residency / work-authorization sentences in its description.
 *
 * It only skips on a clear restriction. Vague or missing locations pass, and the match
 * agent still reads the full posting.
 */
import type { NormalizedJob } from "../sources/types.js";
import type { Profile } from "./profile.js";

export type Eligibility = { eligible: boolean; reason: string | null };

/** Words that may stand in for each region name someone puts in eligibleRegions. */
const REGION_ALIASES: Record<string, string[]> = {
  worldwide: [
    "worldwide",
    "anywhere",
    "global",
    "globally",
    "international",
    "anywhere in the world",
    "all countries",
    "any country",
    "any location",
    "around the world",
    "world",
  ],
  anywhere: ["anywhere", "worldwide", "global"],
  global: ["global", "globally", "worldwide", "anywhere"],
  emea: ["emea", "europe, middle east and africa", "europe, middle east, and africa", "europe middle east africa"],
  africa: ["africa", "african", "sub-saharan africa", "east africa", "eastern africa", "pan-african"],
  ethiopia: ["ethiopia", "addis ababa"],
};

/** Places a posting can be limited to. "US" is matched case-sensitively so the word "us" is not a country. */
const GEO_PATTERNS: RegExp[] = [
  /\bUS\b/,
  /\bU\.S\.?(A\.?)?(?=$|[^A-Za-z])/,
  /\b(usa|united states|america|americas|north america|latin america|latam|south america|central america)\b/i,
  /\b(canada|mexico|brazil|argentina|colombia|chile|peru)\b/i,
  /\b(uk|u\.k\.|united kingdom|england|scotland|great britain|britain|ireland)\b/i,
  /\b(europe|european union|eu|eea|european economic area|schengen)\b/i,
  /\b(germany|france|spain|portugal|netherlands|belgium|poland|italy|sweden|norway|denmark|finland|switzerland|austria|czech republic|czechia|romania|ukraine|greece|hungary|estonia|lithuania|latvia|bulgaria|croatia|serbia)\b/i,
  /\b(india|pakistan|bangladesh|sri lanka|philippines|indonesia|vietnam|thailand|malaysia|singapore|japan|china|korea|taiwan|hong kong|asia|apac|asia pacific|australia|new zealand|anz|oceania)\b/i,
  /\b(israel|turkey|uae|united arab emirates|saudi arabia|qatar|middle east|mena)\b/i,
  /\b(nigeria|kenya|south africa|egypt|ghana|morocco|rwanda|uganda|tanzania)\b/i,
  /\b(alabama|alaska|arizona|arkansas|california|colorado|connecticut|delaware|florida|georgia|hawaii|idaho|illinois|indiana|iowa|kansas|kentucky|louisiana|maine|maryland|massachusetts|michigan|minnesota|mississippi|missouri|montana|nebraska|nevada|new hampshire|new jersey|new mexico|new york|north carolina|north dakota|ohio|oklahoma|oregon|pennsylvania|rhode island|south carolina|south dakota|tennessee|texas|utah|vermont|virginia|washington|west virginia|wisconsin|wyoming)\b/i,
  /\b(san francisco|bay area|seattle|boston|chicago|austin|denver|los angeles|nyc|london|berlin|amsterdam|paris|toronto|vancouver|dublin|bangalore|bengaluru|tel aviv)\b/i,
];

/** Location words that say nothing about where you may live. */
const LOCATION_NOISE =
  /\b(remote|remotely|fully|100%|only|based|within|from|in|the|and|or|any|of|work|working|home|wfh|distributed|flexible|first|friendly|multiple|various|locations?|unspecified|tbd|n\/a|na|other|hybrid|full[- ]?time|part[- ]?time|contract|time ?zones?|hours|overlap|(utc|gmt)\s*[+-−]?\s*\d{0,2}(:\d\d)?|utc|gmt|cet|cest|eet|est|edt|pst|pdt|cst|et|pt|ct)\b/gi;

function escape(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function aliasesFor(regions: string[]): string[] {
  const out = new Set<string>();
  for (const raw of regions) {
    const r = raw.trim().toLowerCase();
    if (!r) continue;
    out.add(r);
    for (const alias of REGION_ALIASES[r] ?? []) out.add(alias);
  }
  return [...out];
}

function mentionsAny(text: string, phrases: string[]): string | null {
  const lower = text.toLowerCase();
  for (const p of phrases) {
    if (new RegExp(`(^|[^a-z])${escape(p)}($|[^a-z])`).test(lower)) return p;
  }
  return null;
}

function mentionsGeo(text: string): string | null {
  for (const re of GEO_PATTERNS) {
    const m = text.match(re);
    if (m) return m[0];
  }
  return null;
}

/** A clause that starts with "if you're in the US…" describes one case, not a requirement. */
function isConditional(description: string, index: number): boolean {
  const before = description.slice(Math.max(0, index - 90), index).toLowerCase();
  return /\b(if|where|unless|when)\b[^.]*$/.test(before) || /for (candidates|applicants|roles|those) (in|based|located)[^.]*$/.test(before);
}

const RESTRICTION_PATTERNS: Array<{ re: RegExp; label: string }> = [
  {
    re: /\b(?:must|need to|needs to|required to|have to|has to|should)\s+(?:currently\s+)?(?:be\s+)?(?:reside|residing|live|living|located|based|a resident|a citizen)\s+(?:in|within|of)\s+(?:the\s+)?([^.;:\n]{2,60})/gi,
    label: "residency",
  },
  {
    re: /\b(?:authori[sz]ed|eligible|legally (?:able|permitted|allowed)|the right|permission)\s+to\s+work\s+(?:in|within|for)\s+(?:the\s+)?([^.;:\n]{2,60})/gi,
    label: "work authorization",
  },
  {
    re: /\bopen (?:only )?to\s+(?:candidates|applicants|people|residents|those|individuals|talent)\s+(?:who are\s+)?(?:currently\s+)?(?:based |located |residing |living )?(?:in|of|from|within)\s+(?:the\s+)?([^.;:\n]{2,80})/gi,
    label: "location",
  },
  {
    re: /\b(?:candidates|applicants|residents)\s+(?:based |located )?(?:in|from)\s+(?:the\s+)?([^.;:\n]{2,40}?)\s+only\b/gi,
    label: "location",
  },
  {
    re: /\b(US|U\.S\.|USA|UK|Canada|EU|Europe|LATAM|North America|Americas|APAC|India)[- ](?:only|based (?:candidates|applicants|residents|employees|engineers|talent|team members))\b/g,
    label: "location",
  },
];

export function remoteEligibility(job: Pick<NormalizedJob, "location" | "description">, profile: Profile): Eligibility {
  const regions = profile.eligibleRegions ?? [];
  if (!regions.length) return { eligible: true, reason: null };
  const ok = aliasesFor([...regions, profile.location]);

  // Location field first: "Worldwide" / "EMEA" pass, "USA" / "Remote - Europe" fail, "Remote" or a
  // timezone note says nothing about where you may live.
  const location = (job.location ?? "").trim();
  if (location && !mentionsAny(location, ok)) {
    const leftover = location
      .replace(/\b[A-Za-z.]+\s+(time ?zones?|working hours|business hours|hours)\b/gi, " ")
      .replace(LOCATION_NOISE, " ");
    const geo = mentionsGeo(leftover);
    if (geo) return { eligible: false, reason: `Remote, but limited to ${job.location}` };
  }

  // Then the description: residency, work authorization and "X only" sentences.
  // "U.S." would end the captured place at its first dot, so spell abbreviations without them.
  const description = (job.description ?? "")
    .slice(0, 12_000)
    .replace(/\bU\.S\.A\.?/g, "USA")
    .replace(/\bU\.S\.?(?![A-Za-z])/g, "US")
    .replace(/\bU\.K\.?(?![A-Za-z])/g, "UK");
  for (const { re, label } of RESTRICTION_PATTERNS) {
    for (const m of description.matchAll(re)) {
      const place = m[1] ?? "";
      if (isConditional(description, m.index ?? 0)) continue;
      if (mentionsAny(place, ok)) continue;
      if (label === "work authorization" && mentionsAny(place, aliasesFor([profile.workAuthorization]))) continue;
      const geo = mentionsGeo(place);
      if (!geo) continue;
      if (label === "work authorization" && authorizationCovers(profile.workAuthorization, geo)) continue;
      return { eligible: false, reason: `Posting requires ${label} in ${geo}: "${m[0].trim().slice(0, 120)}"` };
    }
  }
  return { eligible: true, reason: null };
}

/** True when the profile's work-authorization note says yes to that place (e.g. "US citizen" vs "US"). */
function authorizationCovers(workAuthorization: string, geo: string): boolean {
  const auth = workAuthorization.toLowerCase();
  if (!auth.trim() || /\bno\b[^.]*\bauthori[sz]ation\b|\bnot (authori[sz]ed|claimed)\b/.test(auth)) return false;
  return mentionsAny(auth, [geo.toLowerCase()]) != null;
}
