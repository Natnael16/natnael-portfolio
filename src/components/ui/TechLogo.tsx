import { SKILLS, type Skill } from "@/lib/data";

/** Brand logos copied into public/logos (devicon "original" SVGs and simple-icons; licences alongside). */
const BRAND: Record<string, string> = Object.fromEntries(
  SKILLS.filter((s) => s.logo).map((s) => [s.name, `/logos/${s.logo}.svg`]),
);

const stroke = { fill: "none", stroke: "currentColor", strokeWidth: 1.4, strokeLinecap: "round", strokeLinejoin: "round" } as const;

/** Thin line icons for skills that are ideas rather than products. */
const CONCEPT: Record<NonNullable<Skill["concept"]>, React.ReactNode> = {
  api: (
    <g {...stroke}>
      <path d="M9 8 4 12l5 4M15 8l5 4-5 4M13.5 6l-3 12" />
    </g>
  ),
  micro: (
    <g {...stroke}>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="8.5" y="14" width="7" height="7" rx="1.5" />
      <path d="M6.5 10v2h11v-2M12 12v2" />
    </g>
  ),
  cicd: (
    <g {...stroke}>
      <path d="M4 12a8 8 0 0 1 14-5.3M20 12a8 8 0 0 1-14 5.3" />
      <path d="M18 3v4h-4M6 21v-4h4" />
    </g>
  ),
  llm: (
    <g {...stroke}>
      <path d="M4 6h16v10H9l-5 4z" />
      <path d="M8 10h8M8 13h5" />
    </g>
  ),
  rag: (
    <g {...stroke}>
      <path d="M4 5h9v14H4z" />
      <path d="M7 9h3M7 12h3M7 15h3" />
      <path d="M13 12h4m0 0-2-2m2 2-2 2" />
      <circle cx="19.5" cy="12" r="1.5" />
    </g>
  ),
  vector: (
    <g {...stroke}>
      <path d="M4 20 20 4M4 20h6M4 20v-6" />
      <circle cx="15" cy="9" r="1.2" />
      <circle cx="9" cy="6" r="1.2" />
      <circle cx="18" cy="15" r="1.2" />
    </g>
  ),
  search: (
    <g {...stroke}>
      <circle cx="10.5" cy="10.5" r="6" />
      <path d="m15 15 5 5M8 10.5h5M8 8h3" />
    </g>
  ),
  agent: (
    <g {...stroke}>
      <rect x="5" y="8" width="14" height="11" rx="3" />
      <path d="M12 4v4M9.5 13h.01M14.5 13h.01M9.5 16.2h5" />
      <circle cx="12" cy="3.5" r="1" />
    </g>
  ),
  review: (
    <g {...stroke}>
      <path d="M4 5h16v11H4z" />
      <path d="m7 9 2 2-2 2M11 13h4" />
      <path d="m15 19 2 2 4-4" />
    </g>
  ),
};

/** Near-black logos that vanish on the dark page; shown inverted (hue kept). */
const DARK_LOGOS = new Set(["Next.js", "Flask", "Django", "AWS"]);

export function isBrand(name: string): boolean {
  return name in BRAND;
}

export function TechLogo({ name, size = 20, className }: { name: string; size?: number; className?: string }) {
  if (BRAND[name]) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={BRAND[name]}
        alt=""
        width={size}
        height={size}
        className={className}
        style={DARK_LOGOS.has(name) ? { filter: "invert(1) hue-rotate(180deg)" } : undefined}
        loading="lazy"
        decoding="async"
      />
    );
  }
  const concept = SKILLS.find((s) => s.name === name)?.concept;
  if (!concept) return null;
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} className={className} aria-hidden="true">
      {CONCEPT[concept]}
    </svg>
  );
}
