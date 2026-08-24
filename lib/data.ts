// All site content lives here. Edit this file to update the site.

export const site = {
  name: "Natnael Tadele Denbi",
  shortName: "Natnael Tadele",
  role: "Senior Full-Stack Software Engineer",
  tagline: "I build production web, mobile and AI systems that ship and scale.",
  location: "Addis Ababa, Ethiopia · Working worldwide (remote)",
  email: "natnaeldenbi@gmail.com",
  phone: "+251 961 088 592",
  upworkUrl: "https://www.upwork.com/freelancers/~0176dea95fcd40c51d",
  githubUrl: "https://github.com/Natnael16",
  linkedinUrl: "https://www.linkedin.com/in/natnael-tadele-b3534b230",
  resumeFile: "/Natnael_Tadele_Resume.pdf",
};

export const heroStats = [
  { value: "Top Rated Plus", label: "Upwork badge, top 3% of talent" },
  { value: "100%", label: "Job Success Score" },
  { value: "2,200+", label: "Hours delivered on Upwork" },
  { value: "10,000+", label: "Active users on systems I've built" },
];

export const clients = [
  { name: "Elunic", meta: "Enterprise Software · Germany" },
  { name: "KiwiKrave", meta: "Food-Tech Startup · USA" },
  { name: "QuickSync", meta: "E-commerce Platform · Dubai, UAE" },
  { name: "Adify-AI", meta: "AI SaaS · Lead Engineer" },
  { name: "A2SV", meta: "Google-backed Academy" },
];

export const services = [
  {
    title: "Full-Stack Web Applications",
    icon: "stack",
    description:
      "End-to-end SaaS and enterprise products with Next.js, React, Django and Node.js. From architecture and APIs to polished, fast frontends deployed on AWS.",
    points: ["Next.js / React / TypeScript", "Django / NestJS / Node.js", "PostgreSQL · MongoDB · Supabase"],
  },
  {
    title: "AI & LLM Integration",
    icon: "spark",
    description:
      "LLM-powered features that hold up in production: RAG pipelines, vector & BM25 search, agentic workflows, and AI automation, with cost and latency engineered down.",
    points: ["RAG & vector search", "OpenAI · Claude · agentic systems", "AI cost & latency optimization"],
  },
  {
    title: "Mobile Ecosystems",
    icon: "phone",
    description:
      "Multi-platform Flutter apps backed by real-time APIs: customer apps, merchant dashboards, kiosks and kitchen displays operating as one system.",
    points: ["Flutter / Dart / Bloc", "Real-time sync & maps", "Firebase · Supabase"],
  },
  {
    title: "Backend & DevOps",
    icon: "server",
    description:
      "High-traffic APIs, third-party integrations and infrastructure that stays up: Docker, Kubernetes, CI/CD and AWS, with caching and query optimization baked in.",
    points: ["AWS (EC2, S3, CloudFront, Lambda)", "Docker · Kubernetes · CI/CD", "Microservices & API design"],
  },
];

export const results = [
  {
    metric: "~92%",
    headline: "faster document search",
    detail:
      "Replaced SQL LIKE queries with BM25 + vector-based search in an enterprise system at Elunic (Germany), then cut latency further with caching and query optimization.",
  },
  {
    metric: "52%",
    headline: "reduction in critical API time",
    detail:
      "Re-engineered QuickSync's hottest execution path with concurrent processing and backend optimization, on a platform serving 10,000+ active users.",
  },
  {
    metric: "1,000+",
    headline: "daily users served",
    detail:
      "Architected KiwiKrave's food-ordering ecosystem (customer apps, merchant dashboards, kiosks and KDS) running live restaurant operations every day.",
  },
  {
    metric: "6",
    headline: "platform integrations shipped",
    detail:
      "Connected Shopify, Amazon, Etsy, Square, eBay and Clover into one near-real-time inventory synchronization engine.",
  },
];

export const projects = [
  {
    name: "Adify-AI",
    role: "Lead Engineer · SaaS Product",
    period: "2025 - Present",
    description:
      "AI-driven Shopify SaaS with LLM-powered automation and video generation pipelines. I own the backend APIs, billing flows and core architecture, and drove AI cost and latency down to make the unit economics work.",
    tags: ["AI / LLM", "Shopify", "Video pipelines", "Billing", "Backend architecture"],
    accent: "violet",
  },
  {
    name: "QuickSync",
    role: "Software Developer · Dubai, UAE",
    period: "2024 - 2025",
    description:
      "High-traffic inventory synchronization platform serving 10,000+ active users. Merchants sell across Shopify, Amazon, Etsy, Square, eBay and Clover with reliable, near-real-time sync, after I cut critical API time by 52%.",
    tags: ["Django", "React", "Concurrency", "E-commerce APIs", "10K+ users"],
    accent: "cyan",
  },
  {
    name: "KiwiKrave",
    role: "Full-Stack Engineer · US Startup",
    period: "2023 - Present",
    description:
      "Multi-platform food ordering ecosystem: customer mobile apps, merchant dashboards, self-service kiosks and kitchen display systems. I architected the backend APIs, core business workflows and on-demand delivery relay integration.",
    tags: ["Flutter", "Node.js", "Real-time ops", "Delivery logistics", "1K+ daily users"],
    accent: "emerald",
  },
  {
    name: "Enterprise Search at Elunic",
    role: "Lead Developer · Germany",
    period: "2023 - Present",
    description:
      "Rebuilt document search inside an established enterprise codebase with BM25 and vector-based retrieval (~92% faster), shipped AI-powered features for internal and client-facing tools, and was promoted to Lead Developer, setting technical direction and reviewing the in-house team's code.",
    tags: ["Vector search", "BM25", "AI features", "Tech leadership", "Enterprise"],
    accent: "amber",
  },
  {
    name: "RateEat",
    role: "Full-Stack Developer",
    period: "2021",
    description:
      "Restaurant discovery platform whose initial Node.js backend MVP I built. It grew to 920+ users, 420+ restaurants, 5,970+ reviews and 15,880+ dishes.",
    tags: ["Node.js", "MVP to growth", "Geolocation", "Reviews"],
    accent: "rose",
  },
];

export const timeline = [
  {
    period: "Oct 2023 - Present",
    title: "Senior Full-Stack Engineer · Upwork (Freelance)",
    org: "Elunic (Germany) · KiwiKrave (USA)",
    body: "Production systems for international clients across consumer, SaaS and enterprise domains. Top Rated Plus, 100% Job Success, 2,200+ hours. Trusted to independently design, implement and deploy features in live environments; promoted to Lead Developer at Elunic.",
  },
  {
    period: "Apr 2025 - Present",
    title: "Lead Engineer · Adify-AI",
    org: "AI SaaS Product",
    body: "Leading an AI-driven Shopify SaaS: LLM automation, video generation pipelines, billing and core architecture.",
  },
  {
    period: "Mar 2024 - Oct 2025",
    title: "Software Developer · QuickSync",
    org: "Dubai, UAE",
    body: "Built and maintained a high-traffic inventory sync platform for 10,000+ active users across six major e-commerce channels.",
  },
  {
    period: "Dec 2022 - Mar 2024",
    title: "Head of Education · A2SV",
    org: "Google-backed Academy · Addis Ababa",
    body: "Led and mentored 15 undergraduates in Python, data structures, algorithms and Flutter at Africa to Silicon Valley.",
  },
  {
    period: "2019 - 2024",
    title: "BSc Software Engineering",
    org: "Addis Ababa University",
    body: "Alongside intensive competitive programming training in data structures and algorithms with A2SV, where I solved 400+ problems on LeetCode and Codeforces.",
  },
];

export const skills = [
  {
    group: "Languages & Frameworks",
    items: ["Python", "TypeScript / JavaScript", "Dart", "Django", "NestJS", "Node.js", "React", "Next.js", "Flutter", "Flask"],
  },
  {
    group: "AI Engineering",
    items: ["LLM integration", "RAG pipelines", "Vector search", "BM25", "Agentic systems", "OpenAI", "Claude"],
  },
  {
    group: "Databases",
    items: ["PostgreSQL", "MongoDB", "MySQL", "Supabase", "Firebase"],
  },
  {
    group: "Cloud & DevOps",
    items: ["AWS (EC2, S3, CloudFront, Lambda)", "Docker", "Kubernetes", "CI/CD", "DigitalOcean"],
  },
  {
    group: "Practices",
    items: ["Microservices", "API design", "Agile / Scrum", "Code review", "Tech leadership", "Mentorship"],
  },
];

export const upworkProof = {
  badge: "Top Rated Plus",
  jss: "100%",
  rating: "5.0",
  jobs: "6 contracts",
  hours: "2,200+ hours",
  note: "Top Rated Plus places freelancers in roughly the top 3% on Upwork, earned through long-running contracts with perfect feedback.",
};

export const testimonials = [
  {
    quote:
      "We really can't say enough good things about working with Natnael. From day one, he was reliable, professional, and just easy to work with. During his time with us he contributed across 5 projects and was promoted to lead developer. He has a positive attitude, great communication and was genuinely invested in doing good work, not just checking boxes. Having him on the team made everything smoother and honestly more enjoyable. We're really grateful for everything he brought to this collaboration, and if the opportunity comes up again, we'd love to work with him once more. Five stars, no hesitation.",
    contract: "Full Stack Developer",
    period: "Oct 2025 - Aug 2026",
    hours: "1,456 hours",
    endorsements: ["Reliable", "Committed to Quality", "Solution Oriented"],
    featured: true,
  },
  {
    quote:
      "Natnael was a pleasure to work with. He delivered quality backend work, communicated clearly, and was always professional.",
    contract: "Developer · Full Stack & Mobile",
    period: "Oct 2025 - Jan 2026",
    hours: "291 hours",
    endorsements: ["Collaborative", "Committed to Quality"],
    featured: false,
  },
  {
    quote:
      "It was a pleasure working with him. Communication was smooth, deadlines were respected, and the overall collaboration was professional and efficient. I would definitely consider working together again in the future. Recommended!",
    contract: "Full Stack Developer",
    period: "Oct 2025",
    hours: "Short engagement",
    endorsements: ["Collaborative", "Clear Communicator", "Reliable"],
    featured: false,
  },
  {
    quote: "Natnael is a great individual, we look forward to the next job.",
    contract: "Lead Developer · Full Stack & Mobile",
    period: "Jul - Oct 2025",
    hours: "457 hours",
    endorsements: [],
    featured: false,
  },
];
