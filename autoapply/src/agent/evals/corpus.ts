import { defaultProfile, type Profile } from "../../lib/profile.js";
import type { ApplyField, ApplyForm, NormalizedJob } from "../../sources/types.js";

/** Frozen fictional candidate — see agent/evals/fixture.md */
export const evalProfile: Profile = {
  ...defaultProfile(),
  name: "Jordan Hale",
  email: "jordan.hale@example.com",
  phone: "+1-555-0199",
  location: "Remote, United States",
  timezone: "",
  linkedin: "https://linkedin.com/in/jordanhale-eval",
  github: "https://github.com/jordanhale-eval",
  targetTitles: ["Software Engineer", "Senior Software Engineer", "Full Stack Engineer"],
  excludeKeywords: ["sales", "recruiter", "account executive", "unpaid"],
  employmentTypes: ["FullTime"],
  skills: ["TypeScript", "Node", "React", "PostgreSQL", "AWS"],
  yearsExperience: 7,
  maxRoleYears: null,
  seniorityBand: "senior",
  workAuthorization: "Authorized to work in the US",
  requiresSponsorship: false,
  remoteOnly: true,
  timezoneFlexible: false,
  salaryBand: "",
  noticePeriod: "",
};

export const evalResume = `Jordan Hale
Remote, United States
jordan.hale@example.com | +1-555-0199
linkedin.com/in/jordanhale-eval | github.com/jordanhale-eval

SENIOR SOFTWARE ENGINEER — Northline (B2B workflow SaaS), 2021–present
- Own the TypeScript / Node billing API (Fastify, PostgreSQL) serving ~40k workspaces
- Shipped React admin for dunning and plan changes; cut failed-payment tickets 28% (ops metric, 2023)
- AWS (ECS, SQS, RDS); idempotent Stripe webhook consumers
- Mentored two mid-level engineers on the payments squad (IC, not a manager title)

SOFTWARE ENGINEER — Cedar Clinic Systems, 2018–2021
- Internal tools for clinic operations: React, Node, REST
- PostgreSQL reporting jobs (no clinical ML, no device firmware)

Stack: TypeScript, Node.js, React, PostgreSQL, AWS, Stripe webhooks
Not claimed: Kubernetes-from-scratch, Go, C++, ML, sales, security clearance
`;

function job(partial: Partial<NormalizedJob> & Pick<NormalizedJob, "title">): NormalizedJob {
  return {
    source: "ashby",
    sourceJobId: partial.sourceJobId ?? partial.title,
    companySlug: "evalco",
    companyName: "EvalCo",
    isRemote: true,
    workplaceType: "Remote",
    location: "Remote",
    employmentType: "FullTime",
    department: "Engineering",
    team: null,
    description: "",
    applyUrl: "https://jobs.ashbyhq.com/evalco/apply",
    jobUrl: "https://jobs.ashbyhq.com/evalco/job",
    compensation: null,
    publishedAt: null,
    ...partial,
  };
}

const harborJd = `Harbor is hiring a Senior Software Engineer for the billing platform.

You will own TypeScript and Node services that move money and invoices, write PostgreSQL migrations, and improve a React admin used by our ops team. We run on AWS. Experience with payment webhooks (Stripe or similar) is a plus.

This is a remote, full-time IC role. You will mentor teammates and work with a staff engineer on direction — you are not being hired as that staff engineer.

Must-haves: several years of TypeScript/Node in production, relational databases, comfort with production incidents.
Nice-to-haves: Go, Kubernetes internals.`;

export const harborJob = job({
  sourceJobId: "harbor-senior",
  companySlug: "harbor",
  companyName: "Harbor",
  title: "Senior Software Engineer",
  description: harborJd,
});

export type HardCase = {
  id: string;
  job: NormalizedJob;
  profile?: Profile;
};

export const hardFilterCases: HardCase[] = [
  {
    id: "HF-onsite",
    job: job({
      title: "Software Engineer",
      isRemote: false,
      workplaceType: "OnSite",
      location: "New York, NY",
      description: "Five days a week in our NYC office. TypeScript welcome.",
    }),
  },
  {
    id: "HF-hybrid-office",
    job: job({
      title: "Senior Software Engineer",
      isRemote: false,
      workplaceType: "Hybrid",
      location: "San Francisco, CA",
      description: "Hybrid: three days per week required in SF. Node/TypeScript.",
    }),
  },
  {
    id: "HF-sales-title",
    job: job({
      title: "Account Executive",
      description:
        "Close enterprise deals. You will work with our engineers who use React. Quota-carrying sales role.",
    }),
  },
  {
    id: "HF-recruiter",
    job: job({
      title: "Technical Recruiter",
      description: "Source software engineers. No IC coding. You partner with hiring managers.",
    }),
  },
  {
    id: "HF-contract",
    job: job({
      title: "Senior Software Engineer",
      employmentType: "Contract",
      description: harborJd,
    }),
  },
  {
    id: "HF-unpaid",
    job: job({
      title: "Unpaid Software Engineering Fellow",
      description: "Learn TypeScript with us. Unpaid fellowship.",
    }),
  },
  {
    id: "HF-no-sponsor",
    profile: { ...evalProfile, requiresSponsorship: true },
    job: job({
      title: "Senior Software Engineer",
      description: `${harborJd}\nMust already be authorized to work in the United States. We cannot provide visa sponsorship now or in the future.`,
    }),
  },
  {
    id: "HF-fake-remote",
    job: job({
      title: "Senior Software Engineer",
      isRemote: true,
      workplaceType: "Remote",
      description: `${harborJd}\nDespite the Remote workplace tag, you must work from NYC HQ at least four days per week. Relocation required.`,
    }),
  },
  {
    id: "HF-title-mismatch",
    job: job({
      title: "Pediatric Nurse Practitioner",
      description: "Clinical care in a pediatric clinic. Not a software role.",
    }),
  },
];

export const midProfile: Profile = {
  ...evalProfile,
  seniorityBand: "mid",
  yearsExperience: 2,
  maxRoleYears: 3,
  timezoneFlexible: true,
  noticePeriod: "1 week",
  targetTitles: ["Software Engineer", "Backend Engineer", "Full Stack Engineer", "Product Engineer"],
};

hardFilterCases.push(
  {
    id: "HF-senior-title",
    profile: midProfile,
    job: job({
      title: "Senior Software Engineer",
      description: harborJd,
    }),
  },
  {
    id: "HF-staff-title",
    profile: midProfile,
    job: job({
      title: "Staff Product Engineer",
      description: harborJd,
    }),
  },
  {
    id: "HF-years-required",
    profile: midProfile,
    job: job({
      title: "Software Engineer",
      description: `${harborJd}\nMust-haves: 5+ years of professional experience in TypeScript and Node.`,
    }),
  },
);

export type MatchCase = {
  id: string;
  job: NormalizedJob;
  profile?: Profile;
  expect: "inbox" | "skip";
  maxScore?: number;
  minScore?: number;
  evidenceMustInclude?: string[];
  mustNotInboxOnKeyword?: string;
};

export const matchCases: MatchCase[] = [
  {
    id: "M1",
    job: harborJob,
    expect: "inbox",
    minScore: 70,
    evidenceMustInclude: ["northline"],
  },
  {
    id: "M2",
    job: job({
      ...harborJob,
      sourceJobId: "harbor-go-plus",
      description: `${harborJd}\n\nGo is a plus, not required.`,
    }),
    expect: "inbox",
    minScore: 60,
  },
  {
    id: "M3",
    job: job({
      sourceJobId: "probuild-fs",
      companyName: "ProBuild",
      companySlug: "probuild",
      title: "Senior Full Stack Engineer",
      description: `ProBuild sells workflow software to commercial construction firms.

We need a Senior Full Stack Engineer (remote, full-time) to build TypeScript/Node APIs, React UIs, and PostgreSQL-backed reporting. You do not need prior construction experience; you do need production web systems.

You will work with PMs who know the trades. Domain learning on the job is expected.`,
    }),
    expect: "inbox",
    minScore: 60,
  },
  {
    id: "M4",
    job: job({
      ...harborJob,
      sourceJobId: "harbor-with-staff",
      description: `${harborJd}\nYou will set local technical direction with our staff engineer; you are not filling a principal seat.`,
    }),
    expect: "inbox",
  },
  {
    id: "S1",
    job: job({
      sourceJobId: "principal",
      companyName: "Harbor",
      title: "Principal Engineer",
      description: `Principal Engineer for a 200-person product org.

You set multi-year platform strategy, run architecture reviews across many teams, and operate at staff-plus / principal calibration. This is not a senior IC on one squad.

TypeScript exists in the company but the job is organizational technical leadership.`,
    }),
    expect: "skip",
    maxScore: 79,
  },
  {
    id: "S2",
    job: job({
      sourceJobId: "fde-travel",
      companyName: "FieldGrid",
      title: "Forward Deployed Engineer",
      description: `80% of time on-site with customers running workshops, writing SOWs, and traveling Monday–Thursday.

You should be comfortable scoping professional services. TypeScript is mentioned because our product UI uses it; you will rarely ship product PRs.

This is a customer-facing delivery role, not a core product engineering seat.`,
    }),
    expect: "skip",
  },
  {
    id: "S4",
    job: job({
      sourceJobId: "quant",
      companyName: "Apex Book",
      title: "Quantitative Researcher",
      description: `HFT market-making. C++, FPGA, low-latency research. PhD in a quantitative field strongly preferred.

You will not be writing React admin tools. PostgreSQL is not the job.`,
    }),
    expect: "skip",
  },
  {
    id: "S5",
    profile: { ...evalProfile, requiresSponsorship: true },
    job: job({
      ...harborJob,
      sourceJobId: "harbor-no-sponsor",
      description: `${harborJd}

Must already be authorized to work in the United States. We cannot provide visa sponsorship now or in the future.`,
    }),
    expect: "skip",
  },
  {
    id: "S6",
    job: job({
      ...harborJob,
      sourceJobId: "fake-remote",
      isRemote: true,
      workplaceType: "Remote",
      description: `${harborJd}

Despite the Remote workplace tag in our ATS, you must work from NYC HQ at least four days per week. Relocation required if you are not already in New York.`,
    }),
    expect: "skip",
  },
];

function field(partial: Omit<ApplyField, "options"> & { options?: string[] }): ApplyField {
  return { ...partial, options: partial.options ?? [] };
}

export const harborForm: ApplyForm = {
  pageUrl: "https://jobs.ashbyhq.com/harbor/apply",
  fields: [
    field({ path: "_systemfield_name", label: "Full name", required: true, inputKind: "text" }),
    field({ path: "_systemfield_email", label: "Email", required: true, inputKind: "text" }),
    field({ path: "phone", label: "Phone", required: true, inputKind: "text" }),
    field({ path: "linkedin", label: "LinkedIn URL", required: false, inputKind: "text" }),
    field({ path: "resume", label: "Resume", required: true, inputKind: "file" }),
    field({
      path: "coverLetter",
      label: "Cover letter",
      required: true,
      inputKind: "textarea",
    }),
    field({
      path: "expectedCompensation",
      label: "Expected compensation (USD)",
      required: true,
      inputKind: "text",
    }),
    field({
      path: "us_auth",
      label: "Are you legally authorized to work in the United States?",
      required: true,
      inputKind: "select",
      options: ["Yes", "No"],
    }),
    field({
      path: "ts_years",
      label: "How many years of professional TypeScript experience do you have?",
      required: true,
      inputKind: "text",
    }),
    field({
      path: "eeoc_race",
      label: "Race / ethnicity (optional EEO)",
      required: false,
      inputKind: "select",
      options: ["Decline to self-identify", "White", "Asian", "Black or African American"],
    }),
    field({
      path: "widget_sdk",
      label: "Describe a production war story using Harbor’s Widget SDK v3.",
      required: true,
      inputKind: "textarea",
    }),
    field({
      path: "notice",
      label: "Notice period",
      required: true,
      inputKind: "select",
      options: ["2 weeks", "1 month", "I can start immediately"],
    }),
    field({
      path: "why_harbor",
      label: "Why do you want to join Harbor?",
      required: false,
      inputKind: "textarea",
    }),
    field({
      path: "star_incident",
      label: "Tell us about a time you owned a production incident end to end.",
      required: false,
      inputKind: "textarea",
    }),
  ],
};
