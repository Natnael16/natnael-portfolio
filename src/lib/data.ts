// Every piece of text on the site lives here. Sources: public/Natnael_Tadele_Resume.pdf and
// the Upwork contract record (dates, hours, reviews). Nothing here is invented: if it is not in
// one of those, it does not go on the site.

export const PROFILE = {
  name: "Natnael Tadele",
  fullName: "Natnael Tadele Denbi",
  firstName: "Natnael",
  initials: "NT",
  role: "Senior Full-Stack Engineer",
  roleLong: "Senior Full-Stack Software Engineer",
  location: "Addis Ababa, Ethiopia",
  locationNote: "Working remotely with teams worldwide",
  email: "natnaeldenbi@gmail.com",
  phone: "+251 961 088 592",
  phoneHref: "tel:+251961088592",
  github: "https://github.com/Natnael16",
  linkedin: "https://www.linkedin.com/in/natnael-tadele-b3534b230",
  upwork: "https://www.upwork.com/freelancers/~0176dea95fcd40c51d",
  resume: "/Natnael_Tadele_Resume.pdf",
  site: "https://natnael.website",
  /** Résumé PROFILE paragraph, verbatim. */
  resumeSummary:
    "Senior Full-Stack Software Engineer with 4 years of experience designing, building, and scaling production web and mobile systems for startups and international clients. Strong track record of owning features end-to-end, improving system performance, and delivering reliable software used by thousands of users in live environments. Experienced in remote collaboration and independent delivery.",
  tagline: "I build production web systems that ship and scale, with mobile experience where the product needs it.",
  currently: "Lead Software Developer · KiwiKrave",
  education: "BSc Software Engineering, Addis Ababa University",
  /** Paraphrase of the résumé's own words: "owning features end-to-end … delivering reliable software". */
  quote: "Own it end to end, and ship software people can rely on in production.",
};

/** From the Upwork profile and contract record. */
export const UPWORK = {
  badge: "Top Rated Plus",
  topPercent: "Top 3%",
  jss: "100%",
  rating: "5.0",
  hours: "2,200+",
  contracts: "6 contracts",
};

export const NAV = [
  { id: "reviews", label: "Reviews" },
  { id: "proof", label: "Impact" },
  { id: "work", label: "Work" },
  { id: "stack", label: "Stack" },
  { id: "path", label: "Path" },
  { id: "contact", label: "Contact" },
] as const;

export type Family = "Languages" | "Frontend" | "Backend" | "Mobile" | "Data" | "Cloud" | "AI";

export type Skill = {
  name: string;
  symbol: string;
  family: Family;
  /** Brand logo file in public/logos, or a concept icon id. */
  logo?: string;
  concept?: "api" | "micro" | "cicd" | "rag" | "vector" | "agent" | "llm" | "search" | "review";
  usedIn: string[];
};

export const FAMILIES: Family[] = ["Languages", "Frontend", "Backend", "Mobile", "Data", "Cloud", "AI"];

export const SKILLS: Skill[] = [
  { name: "TypeScript", symbol: "Ts", family: "Languages", logo: "typescript", usedIn: [] },
  { name: "JavaScript", symbol: "Js", family: "Languages", logo: "javascript", usedIn: [] },
  { name: "Python", symbol: "Py", family: "Languages", logo: "python", usedIn: ["A2SV (taught)"] },
  { name: "Dart", symbol: "Da", family: "Languages", logo: "dart", usedIn: [] },
  { name: "Java", symbol: "Jv", family: "Languages", logo: "java", usedIn: [] },
  { name: "React", symbol: "Re", family: "Frontend", logo: "react", usedIn: ["QuickSync"] },
  { name: "Next.js", symbol: "Nx", family: "Frontend", logo: "nextjs", usedIn: [] },
  { name: "Angular", symbol: "Ng", family: "Frontend", logo: "angular", usedIn: [] },
  { name: "Node.js", symbol: "No", family: "Backend", logo: "nodejs", usedIn: ["KiwiKrave", "RateEat"] },
  { name: "NestJS", symbol: "Ne", family: "Backend", logo: "nestjs", usedIn: [] },
  { name: "Django", symbol: "Dj", family: "Backend", logo: "django", usedIn: ["QuickSync"] },
  { name: "Flask", symbol: "Fl", family: "Backend", logo: "flask", usedIn: [] },
  { name: "Spring Boot", symbol: "Sp", family: "Backend", logo: "spring", usedIn: [] },
  { name: "REST APIs", symbol: "Ap", family: "Backend", concept: "api", usedIn: ["QuickSync", "KiwiKrave", "Adify-AI"] },
  { name: "Microservices", symbol: "Ms", family: "Backend", concept: "micro", usedIn: [] },
  { name: "Flutter", symbol: "Fu", family: "Mobile", logo: "flutter", usedIn: ["KiwiKrave", "A2SV (taught)"] },
  { name: "Firebase", symbol: "Fb", family: "Mobile", logo: "firebase", usedIn: [] },
  { name: "PostgreSQL", symbol: "Pg", family: "Data", logo: "postgresql", usedIn: [] },
  { name: "MongoDB", symbol: "Mg", family: "Data", logo: "mongodb", usedIn: [] },
  { name: "MySQL", symbol: "My", family: "Data", logo: "mysql", usedIn: [] },
  { name: "Supabase", symbol: "Sb", family: "Data", logo: "supabase", usedIn: [] },
  { name: "AWS", symbol: "Aw", family: "Cloud", logo: "aws", usedIn: [] },
  { name: "Docker", symbol: "Dk", family: "Cloud", logo: "docker", usedIn: [] },
  { name: "Kubernetes", symbol: "K8", family: "Cloud", logo: "kubernetes", usedIn: [] },
  { name: "DigitalOcean", symbol: "Do", family: "Cloud", logo: "digitalocean", usedIn: [] },
  { name: "Git", symbol: "Gt", family: "Cloud", logo: "git", usedIn: [] },
  { name: "CI/CD", symbol: "Ci", family: "Cloud", concept: "cicd", usedIn: [] },
  { name: "LLM integration", symbol: "Ll", family: "AI", concept: "llm", usedIn: ["Adify-AI"] },
  { name: "RAG pipelines", symbol: "Rg", family: "AI", concept: "rag", usedIn: [] },
  { name: "Vector search", symbol: "Vs", family: "AI", concept: "vector", usedIn: ["Elunic"] },
  { name: "BM25", symbol: "Bm", family: "AI", concept: "search", usedIn: ["Elunic"] },
  { name: "Agentic systems", symbol: "Ag", family: "AI", concept: "agent", usedIn: [] },
  { name: "Claude", symbol: "Cl", family: "AI", logo: "claude", usedIn: [] },
  { name: "Claude Code", symbol: "Cc", family: "AI", concept: "review", usedIn: [] },
  { name: "Shopify", symbol: "Sh", family: "Backend", logo: "shopify", usedIn: ["Adify-AI", "QuickSync"] },
];

export type Project = {
  id: string;
  title: string;
  kicker: string;
  period: string;
  description: string;
  features: string[];
  tech: string[];
  ui: "adify" | "search" | "kiosk" | "sync" | "reviews";
};

export const PROJECTS: Project[] = [
  {
    id: "kiwikrave",
    title: "KiwiKrave",
    kicker: "Lead Software Developer · US startup",
    period: "2025 – Present",
    description:
      "Multi-platform food ordering ecosystem: customer mobile apps, merchant dashboards, self-service kiosks and kitchen display systems. I architected the backend APIs, core business workflows and on-demand delivery relay integration.",
    features: ["Customer apps & kiosks", "Kitchen display systems", "Delivery relay integration", "1,000+ daily users"],
    tech: ["Flutter", "Node.js", "REST APIs"],
    ui: "kiosk",
  },
  {
    id: "adify",
    title: "Adify-AI",
    kicker: "Lead Engineer · AI SaaS",
    period: "2025 – Present",
    description:
      "AI-driven Shopify SaaS with LLM-powered automation and video generation pipelines. I own the backend APIs, billing flows and core architecture, and drove AI cost and latency down to make the unit economics work.",
    features: ["LLM-powered automation", "Video generation pipelines", "Billing flows", "AI cost & latency down"],
    tech: ["Shopify", "LLM integration", "REST APIs"],
    ui: "adify",
  },
  {
    id: "elunic",
    title: "Enterprise Search",
    kicker: "Lead Developer · Elunic, Germany",
    period: "2025 – 2026",
    description:
      "Rebuilt document search inside an established enterprise codebase with BM25 and vector-based retrieval, about 92% faster than the SQL LIKE queries it replaced, then cut latency further with caching and query optimization.",
    features: ["~92% faster search", "BM25 + vector retrieval", "AI-powered features", "Promoted to Lead Developer"],
    tech: ["BM25", "Vector search"],
    ui: "search",
  },
  {
    id: "quicksync",
    title: "QuickSync",
    kicker: "Software Developer · Dubai, UAE",
    period: "2024 – 2025",
    description:
      "High-traffic inventory synchronization platform serving 10,000+ active users. Merchants sell across Shopify, Amazon, Etsy, Square, eBay and Clover with near-real-time sync, after I cut critical API time by 52%.",
    features: ["10,000+ active users", "6 platforms in one sync engine", "52% faster critical APIs", "Concurrent processing"],
    tech: ["Django", "React", "Shopify"],
    ui: "sync",
  },
  {
    id: "rateeat",
    title: "RateEat",
    kicker: "Full-Stack Developer · MVP",
    period: "2021",
    description:
      "Restaurant discovery platform whose initial Node.js backend MVP I built. It grew to 920+ users, 420+ restaurants, 5,970+ reviews and 15,880+ dishes.",
    features: ["920+ users", "420+ restaurants", "5,970+ reviews", "15,880+ dishes"],
    tech: ["Node.js", "JavaScript", "REST APIs"],
    ui: "reviews",
  },
];

export type Proof = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  label: string;
  caption: string;
  detail: string;
  /** Platform logo in public/logos, with the brand colour used for its soft glow. */
  logo?: { file: string; tint: string; alt: string };
  icon?: "users" | "bolt" | "search" | "stream" | "clock" | "star";
};

export const PROOF: Proof[] = [
  {
    value: 92,
    prefix: "~",
    suffix: "%",
    label: "Faster document search",
    caption: "Elunic, Germany",
    detail: "SQL LIKE replaced with BM25 + vector search.",
    icon: "search",
  },
  {
    value: 158,
    suffix: "M+",
    label: "Inventory events a day",
    caption: "QuickSync, at full load",
    detail: "~5,000 merchants × ~22 storefronts, one webhook per store per minute.",
    icon: "stream",
  },
  {
    value: 52,
    suffix: "%",
    label: "Faster critical APIs",
    caption: "QuickSync",
    detail: "Concurrent processing and backend optimization.",
    icon: "bolt",
  },
  {
    value: 10000,
    suffix: "+",
    label: "Active users",
    caption: "QuickSync",
    detail: "Merchants selling across six commerce platforms.",
    icon: "users",
  },
  {
    value: 1000,
    suffix: "+",
    label: "Daily users",
    caption: "KiwiKrave",
    detail: "Apps, kiosks and kitchen displays running live restaurant operations.",
    icon: "users",
  },
  {
    value: 400,
    suffix: "+",
    label: "Problems solved",
    caption: "LeetCode & Codeforces",
    detail: "Competitive programming training at A2SV.",
    logo: { file: "leetcode", tint: "#FFA116", alt: "LeetCode" },
  },
];

export type Stop = {
  year: string;
  title: string;
  place: string;
  detail: string;
  kind: "work" | "education";
};

/** Chronological, oldest first. */
export const PATH: Stop[] = [
  {
    year: "2019",
    title: "BSc Software Engineering",
    place: "Addis Ababa University",
    detail: "Started the degree, finished in 2024.",
    kind: "education",
  },
  {
    year: "2021",
    title: "Full-Stack Developer",
    place: "RateEat",
    detail: "Built the initial Node.js backend MVP; the platform grew to 920+ users and 5,970+ reviews.",
    kind: "work",
  },
  {
    year: "2022",
    title: "Head of Education",
    place: "A2SV · Google-backed academy",
    detail: "Led and mentored 15 undergraduates in Python, data structures, algorithms and Flutter. Solved 400+ problems on LeetCode and Codeforces.",
    kind: "education",
  },
  {
    year: "2023",
    title: "Senior Full-Stack Engineer",
    place: "Upwork · Freelance",
    detail: "Production systems for clients in Germany, the USA and the UAE. Top Rated Plus, 100% Job Success, 2,200+ hours.",
    kind: "work",
  },
  {
    year: "2024",
    title: "Software Developer",
    place: "QuickSync · Dubai, UAE",
    detail: "High-traffic inventory sync for 10,000+ active users across six commerce platforms; critical API time cut by 52%.",
    kind: "work",
  },
  {
    year: "2025",
    title: "Lead Engineer",
    place: "Adify-AI",
    detail: "Leading an AI-driven Shopify SaaS: LLM automation, video generation pipelines, billing and core architecture.",
    kind: "work",
  },
  {
    year: "2025",
    title: "Lead Software Developer",
    place: "KiwiKrave · USA · current",
    detail: "Leading the build: backend APIs, core workflows and delivery relay integration for apps, kiosks and kitchen displays.",
    kind: "work",
  },
  {
    year: "2025",
    title: "Lead Developer",
    place: "Elunic · Germany",
    detail: "Rebuilt enterprise search (~92% faster), shipped AI features, promoted to Lead Developer. Through Aug 2026.",
    kind: "work",
  },
];

export type Word = {
  quote: string;
  contract: string;
  period: string;
  hours: string;
  tags: string[];
};

/** Upwork reviews, verbatim. Clients are not named because the reviews are not attributed publicly. */
export const WORDS: Word[] = [
  {
    quote:
      "We really can't say enough good things about working with Natnael. From day one, he was reliable, professional, and just easy to work with. During his time with us he contributed across 5 projects and was promoted to lead developer. He has a positive attitude, great communication and was genuinely invested in doing good work, not just checking boxes.",
    contract: "Full Stack Developer",
    period: "Oct 2025 – Aug 2026",
    hours: "1,456 hours",
    tags: ["Reliable", "Committed to Quality", "Solution Oriented"],
  },
  {
    quote: "Natnael was a pleasure to work with. He delivered quality backend work, communicated clearly, and was always professional.",
    contract: "Developer · Full Stack & Mobile",
    period: "Oct 2025 – Jan 2026",
    hours: "291 hours",
    tags: ["Collaborative", "Committed to Quality"],
  },
  {
    quote:
      "Communication was smooth, deadlines were respected, and the overall collaboration was professional and efficient. I would definitely consider working together again in the future.",
    contract: "Full Stack Developer",
    period: "Oct 2025",
    hours: "Short engagement",
    tags: ["Collaborative", "Clear Communicator", "Reliable"],
  },
  {
    quote: "Natnael is a great individual, we look forward to the next job.",
    contract: "Lead Developer · Full Stack & Mobile",
    period: "Jul – Oct 2025",
    hours: "457 hours",
    tags: [],
  },
];
