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

/** Canned remote-role expectation. Not for on-site bands. */
export const REMOTE_MONTHLY_SALARY_USD = {
  min: 2000,
  max: 2500,
  band: "2000-2500 USD per month",
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

export function candidateProfile(): Profile {
  return {
    ...defaultProfile(),
    name: "Zerihun Getu",
    email: "zerihunmogesgetu@gmail.com",
    location: "Addis Ababa, Ethiopia",
    timezone: "Africa/Addis_Ababa",
    timezoneFlexible: true,
    linkedin: "https://linkedin.com/in/zerihungetu",
    github: "https://github.com/zerihunMoges",
    targetTitles: [
      "Software Engineer",
      "Backend Engineer",
      "Full Stack Engineer",
      "Product Engineer",
    ],
    excludeKeywords: [
      ...defaultProfile().excludeKeywords,
      "senior",
      "staff",
      "principal",
      "field",
    ],
    skills: [
      "Python",
      "Django",
      "TypeScript",
      "JavaScript",
      "React",
      "Next.js",
      "Node.js",
      "PostgreSQL",
      "Redis",
      "Docker",
      "AWS",
    ],
    yearsExperience: 2,
    maxRoleYears: 3,
    seniorityBand: "mid",
    noticePeriod: "1 week",
    education: [
      {
        schoolName: "Addis Ababa University",
        degree: "Bachelor of Software Engineering",
        field: "Software Engineering",
        startDate: "2019-09",
        endDate: "2024-07",
        isCurrent: false,
      },
    ],
    educationSummary: "BSc Software Engineering, Addis Ababa University, CGPA 3.75/4.0 (2019–2024)",
    salaryBand: REMOTE_MONTHLY_SALARY_USD.band,
    remoteOnly: true,
  };
}
