export type EducationEntry = {
  schoolName: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
};

export type Profile = {
  name: string;
  email: string;
  phone: string;
  location: string;
  timezone: string;
  linkedin: string;
  github: string;
  portfolio: string;
  website: string;
  twitter: string;
  pronouns: string;
  targetTitles: string[];
  excludeKeywords: string[];
  employmentTypes: string[];
  skills: string[];
  yearsExperience: number | null;
  /** Skip postings that require more years than this. Null = no cap. */
  maxRoleYears: number | null;
  seniorityBand: "junior" | "mid" | "senior" | "staff";
  workAuthorization: string;
  requiresSponsorship: boolean;
  visaType: string;
  remoteOnly: boolean;
  /** Can work any timezone, including US hours. Do not skip jobs only for TZ overlap. */
  timezoneFlexible: boolean;
  /**
   * Regions a remote posting may be limited to and still be open to you ("Worldwide", "EMEA",
   * "Africa", your country). A posting limited to somewhere else is skipped. Empty = no check.
   */
  eligibleRegions: string[];
  willingToRelocate: string;
  salaryBand: string;
  noticePeriod: string;
  earliestStart: string;
  howHeard: string;
  referralName: string;
  languages: string;
  education: EducationEntry[];
  educationSummary: string;
  canContactEmployer: string;
  gdprConsent: boolean;
  attestTruth: boolean;
  exportControl: string;
  cannedAnswers: Record<string, string>;
};

export function defaultProfile(): Profile {
  return {
    name: "",
    email: "",
    phone: "",
    location: "",
    timezone: "Africa/Addis_Ababa",
    linkedin: "",
    github: "",
    portfolio: "",
    website: "",
    twitter: "",
    pronouns: "",
    targetTitles: ["Software Engineer", "Backend Engineer", "Full Stack Engineer", "Product Engineer"],
    excludeKeywords: [
      "sales",
      "recruiter",
      "account executive",
      "unpaid",
      "intern",
      "designer",
      "marketing",
      "support",
      "relations",
      "advocate",
      "solutions",
      "manager",
      "director",
    ],
    employmentTypes: ["FullTime"],
    skills: [],
    yearsExperience: 2,
    maxRoleYears: 3,
    seniorityBand: "mid",
    workAuthorization: "",
    requiresSponsorship: false,
    visaType: "",
    remoteOnly: true,
    timezoneFlexible: true,
    eligibleRegions: [],
    willingToRelocate: "",
    salaryBand: "",
    noticePeriod: "1 week",
    earliestStart: "",
    howHeard: "",
    referralName: "",
    languages: "",
    education: [],
    educationSummary: "",
    canContactEmployer: "",
    gdprConsent: false,
    attestTruth: false,
    exportControl: "",
    cannedAnswers: {},
  };
}

/** The operator: Natnael Tadele. Facts mirror candidate/resume.pdf and natnael.website. */
export function candidateProfile(): Profile {
  return {
    ...defaultProfile(),
    name: "Natnael Tadele Denbi",
    email: "natnaeldenbi@gmail.com",
    phone: "+251 961 088 592",
    location: "Addis Ababa, Ethiopia",
    timezone: "Africa/Addis_Ababa",
    timezoneFlexible: true,
    eligibleRegions: ["Worldwide", "Anywhere", "Global", "EMEA", "Africa", "Ethiopia"],
    linkedin: "https://www.linkedin.com/in/natnael-tadele-b3534b230",
    github: "https://github.com/Natnael16",
    portfolio: "https://natnael.website",
    website: "https://natnael.website",
    targetTitles: [
      "Senior Full Stack Engineer",
      "Full Stack Engineer",
      "Senior Software Engineer",
      "Software Engineer",
      "Backend Engineer",
      "AI Engineer",
      "LLM Engineer",
      "Product Engineer",
      "Founding Engineer",
      "Lead Developer",
    ],
    excludeKeywords: [
      "sales",
      "recruiter",
      "account executive",
      "unpaid",
      "intern",
      "designer",
      "marketing",
      "support",
      "relations",
      "advocate",
      "director",
      "principal",
      "distinguished",
      "engineering manager",
      "vp",
      "android",
      "ios",
      "embedded",
      "firmware",
      "data scientist",
      "qa",
    ],
    employmentTypes: ["FullTime", "Contract"],
    skills: [
      "TypeScript",
      "JavaScript",
      "Python",
      "Node.js",
      "NestJS",
      "Django",
      "Flask",
      "React",
      "Next.js",
      "Flutter",
      "Dart",
      "PostgreSQL",
      "MongoDB",
      "MySQL",
      "Supabase",
      "Firebase",
      "AWS",
      "Docker",
      "Kubernetes",
      "CI/CD",
      "LLM",
      "RAG",
      "Vector search",
      "OpenAI",
      "Claude",
      "Shopify",
      "REST APIs",
      "Microservices",
    ],
    yearsExperience: 4,
    maxRoleYears: 5,
    seniorityBand: "senior",
    workAuthorization:
      "Based in Addis Ababa, Ethiopia. Works remotely as an independent contractor. No US, UK, EU or Canadian work authorization is claimed.",
    requiresSponsorship: false,
    education: [
      {
        schoolName: "Addis Ababa University",
        degree: "BSc Software Engineering",
        field: "Software Engineering",
        startDate: "2019-10",
        endDate: "2024-06",
        isCurrent: false,
      },
    ],
    educationSummary: "BSc Software Engineering, Addis Ababa University (2019–2024)",
    remoteOnly: true,
  };
}
