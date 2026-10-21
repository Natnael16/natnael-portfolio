const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
  ndash: "–",
  mdash: "—",
  hellip: "…",
  rsquo: "’",
  lsquo: "‘",
  rdquo: "”",
  ldquo: "“",
  bull: "•",
  middot: "·",
  euro: "€",
  pound: "£",
  copy: "©",
  reg: "®",
  trade: "™",
};

export function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? whole;
  });
}

/** HTML (or entity-escaped HTML, as Greenhouse sends it) to readable plain text with line breaks kept. */
export function htmlToText(html: string | null | undefined): string {
  if (!html) return "";
  let s = html;
  if (/&lt;\/?[a-z]/i.test(s) && !/<\/?[a-z]/i.test(s)) s = decodeEntities(s);
  s = s
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<(script|style)[\s\S]*?<\/\1>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(p|div|ul|ol|h[1-6]|section|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, " ");
  return decodeEntities(s)
    .replace(/[ \t\f\v\u00a0]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Map the many spellings boards use onto the profile's employment types. Null when unknown. */
export function normalizeEmploymentType(raw: string | string[] | null | undefined): string | null {
  const value = (Array.isArray(raw) ? raw.join(" ") : raw ?? "").toLowerCase();
  if (!value.trim()) return null;
  if (/\bintern(ship)?\b/.test(value)) return "Intern";
  if (/\bpart[\s_-]?time\b/.test(value)) return "PartTime";
  if (/\b(full[\s_-]?time|permanent)\b/.test(value)) return "FullTime";
  if (/\b(contract(or)?|freelance|temporary|temp|fixed[\s_-]?term)\b/.test(value)) return "Contract";
  return null;
}

export function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

/**
 * ISO string from an ISO date, "YYYY-MM-DD HH:mm:ss", an RFC 822 date, or unix seconds / millis.
 * A date-time with no zone is read as UTC.
 */
export function toIsoDate(value: string | number | null | undefined): string | null {
  if (value == null || value === "") return null;
  let ms: number;
  if (typeof value === "number" || /^\d+$/.test(String(value))) {
    const n = Number(value);
    ms = n < 1e12 ? n * 1000 : n;
  } else {
    const s = String(value).trim();
    const zoneless = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(s);
    ms = Date.parse(zoneless ? `${s.replace(" ", "T")}Z` : s);
  }
  return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
}

export function salaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
  currency = "USD",
  period = "year",
): string | null {
  const lo = Number(min) || 0;
  const hi = Number(max) || 0;
  if (!lo && !hi) return null;
  const fmt = (n: number) => n.toLocaleString("en-US");
  const range = lo && hi && lo !== hi ? `${fmt(lo)}-${fmt(hi)}` : fmt(lo || hi);
  return `${range} ${currency} per ${period}`;
}
