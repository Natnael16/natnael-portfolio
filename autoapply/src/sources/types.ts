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

export interface JobSource {
  id: string;
  listJobs(board: BoardRef): Promise<NormalizedJob[]>;
  extractApplyForm(job: NormalizedJob): Promise<ApplyForm>;
  submitApplication(job: NormalizedJob, payload: ApplyPayload): Promise<SubmitResult>;
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
