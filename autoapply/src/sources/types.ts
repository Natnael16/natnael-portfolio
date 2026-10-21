export type BoardRef = {
  slug: string;
  name: string;
};

export type NormalizedJob = {
  source: string;
  sourceJobId: string;
  companySlug: string;
  companyName: string;
  title: string;
  isRemote: boolean;
  workplaceType: string | null;
  location: string | null;
  employmentType: string | null;
  department: string | null;
  team: string | null;
  description: string;
  applyUrl: string;
  jobUrl: string;
  compensation: string | null;
  publishedAt: string | null;
};

export type ApplyField = {
  path: string;
  label: string;
  required: boolean;
  inputKind:
    | "text"
    | "textarea"
    | "select"
    | "multiselect"
    | "file"
    | "checkbox"
    | "radio"
    | "date"
    | "number"
    | "other";
  options: string[];
};

export type ApplyForm = {
  fields: ApplyField[];
  pageUrl: string;
};

export type ApplyPayload = {
  answers: Array<{ path: string; value: string | null; type?: string; label?: string }>;
  resumePath: string | null;
};

export type SubmitResult = {
  ok: boolean;
  confirmation?: string;
  error?: string;
  screenshotPath?: string;
};

/**
 * How much the place a job was listed vouches for the employer.
 * ats: the company's own careers system. curated: a remote board that reviews postings.
 * open: anyone can post (LinkedIn), so scam checks matter most.
 */
export type SourceTrust = "ats" | "curated" | "open";

/** A per-company careers board (Ashby, Greenhouse, Lever). */
export interface JobSource {
  id: string;
  listJobs(board: BoardRef): Promise<NormalizedJob[]>;
  /**
   * Only sources the agent can fill and submit implement these two. Matches from any other
   * source land in "Apply yourself" with the link instead of being drafted.
   */
  extractApplyForm?(job: NormalizedJob): Promise<ApplyForm>;
  submitApplication?(job: NormalizedJob, payload: ApplyPayload): Promise<SubmitResult>;
}

export type FeedQuery = {
  /** Search phrases, e.g. "full stack engineer". Feeds without search filter locally. */
  keywords: string[];
  /** Only return postings newer than this. */
  maxAgeDays: number;
  /** Feeds that pay per detail request (LinkedIn) skip ids already stored. */
  isKnown: (sourceJobId: string) => boolean;
  /** Cheap title pre-check so detail requests are only spent on plausible roles. */
  wantsTitle: (title: string) => boolean;
};

/** A cross-company search or listing (remote boards, LinkedIn). */
export interface JobFeed {
  id: string;
  label: string;
  trust: SourceTrust;
  search(query: FeedQuery): Promise<NormalizedJob[]>;
}

export type MatchResult = {
  score: number;
  decision: "inbox" | "skip";
  confidence: "high" | "medium" | "low";
  summary: string;
  evidence: string[];
  gaps: string[];
  skipReason: string | null;
};

export type FieldAnswer = {
  path: string;
  /** Verbatim form prompt. Never a renamed concept. */
  label?: string;
  /** Playbook id (why_company, behavioral, …). Routing only. */
  type: string;
  value: string | null;
  confidence: "high" | "medium" | "low";
  source: "profile" | "resume" | "canned" | "empty";
};

export type DraftFlag = {
  path: string;
  reason: string;
  required: boolean;
};

export type DraftResult = {
  answers: FieldAnswer[];
  flags: DraftFlag[];
  coverLetter: string | null;
};

export type CritiqueCorrection = {
  path: string;
  value: string;
  source?: FieldAnswer["source"];
};

export type CritiqueResult = {
  ok: boolean;
  violations: string[];
  flags: DraftFlag[];
  corrections?: CritiqueCorrection[];
  strippedPaths?: string[];
};
