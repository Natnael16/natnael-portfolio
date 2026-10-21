export type Job = {
  id: number;
  title: string;
  companyName: string;
  companySlug: string;
  location: string | null;
  workplaceType: string | null;
  employmentType: string | null;
  applyUrl: string;
  jobUrl: string;
  compensation: string | null;
  description: string;
};

export type Answer = {
  path: string;
  label?: string;
  type: string;
  value: string | null;
  confidence: string;
  source: string;
};

export type Flag = { path: string; reason: string; required: boolean };

export type FormField = {
  path: string;
  label: string;
  required: boolean;
  inputKind: string;
  options: string[];
};

export type Application = {
  id: number;
  status: string;
  matchScore: number | null;
  match: {
    score?: number;
    decision?: string;
    confidence?: string;
    summary?: string;
    evidence?: string[];
    gaps?: string[];
    skipReason?: string | null;
  } | null;
  form: { fields?: FormField[]; pageUrl?: string } | null;
  answers: Answer[];
  flags: Flag[];
  critique: { ok?: boolean; violations?: string[] } | null;
  error: string | null;
  submittedAt: string | null;
  updatedAt: string;
  job: Job;
};

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    credentials: "include",
    ...init,
    headers: {
      ...(init?.body && !(init.body instanceof FormData)
        ? { "content-type": "application/json" }
        : {}),
      ...init?.headers,
    },
  });
  if (res.status === 401) throw new Error("unauthorized");
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((data as { error?: string }).error || res.statusText);
  return data as T;
}

export const api = {
  me: () => req<{ ok: boolean }>("/api/me"),
  login: (password: string) =>
    req("/api/login", { method: "POST", body: JSON.stringify({ password }) }),
  logout: () => req("/api/logout", { method: "POST" }),
  inbox: () =>
    req<{ items: Application[]; autoCount: number; reviewCount: number; queuedCount: number }>("/api/inbox"),
  history: (status?: "submitted" | "failed") =>
    req<{ items: Application[] }>(`/api/history${status ? `?status=${status}` : ""}`),
  application: (id: number) => req<Application>(`/api/applications/${id}`),
  saveAnswers: (id: number, answers: Answer[]) =>
    req(`/api/applications/${id}`, { method: "PATCH", body: JSON.stringify({ answers }) }),
  skip: (id: number) => req(`/api/applications/${id}/skip`, { method: "POST" }),
  markSubmitted: (id: number) =>
    req<{ ok: boolean; status?: string }>(`/api/applications/${id}/mark-submitted`, { method: "POST" }),
  approve: (id: number) => req(`/api/applications/${id}/approve`, { method: "POST" }),
  retry: (id: number) =>
    req<{ ok: boolean; status?: string }>(`/api/applications/${id}/retry`, { method: "POST" }),
  refill: (id: number) =>
    req<{ ok: boolean; status?: string }>(`/api/applications/${id}/refill`, { method: "POST" }),
  profile: () =>
    req<{
      profile: Record<string, unknown>;
      resumeOriginalName: string | null;
      hasResume: boolean;
    }>("/api/profile"),
  saveProfile: (profile: Record<string, unknown>) =>
    req("/api/profile", { method: "PUT", body: JSON.stringify(profile) }),
  uploadResume: (file: File) => {
    const body = new FormData();
    body.append("file", file);
    return req("/api/profile/resume", { method: "POST", body });
  },
  companies: () =>
    req<{
      items: Array<{
        id: number;
        slug: string;
        name: string;
        enabled: boolean;
        lastFetchedAt: string | null;
        lastError: string | null;
      }>;
      total: number;
      enabled: number;
      discovering: boolean;
      scanning: boolean;
    }>("/api/companies"),
  addCompany: (slug: string, name?: string) =>
    req("/api/companies", { method: "POST", body: JSON.stringify({ slug, name }) }),
  patchCompany: (id: number, enabled: boolean) =>
    req(`/api/companies/${id}`, { method: "PATCH", body: JSON.stringify({ enabled }) }),
  discoverCompanies: () => req("/api/companies/discover", { method: "POST" }),
  enableAllCompanies: () => req<{ ok: boolean; enabled: number }>("/api/companies/enable-all", { method: "POST" }),
  runs: () =>
    req<{
      items: Array<{
        id: number;
        status: string;
        startedAt: string;
        finishedAt: string | null;
        statsJson: string | null;
        error: string | null;
      }>;
    }>("/api/runs"),
  runOnce: () => req("/api/runs/once", { method: "POST" }),
  startAutoApply: () => req<{ ok: boolean; queued: number }>("/api/inbox/auto-apply", { method: "POST" }),
  events: (limit = 250) =>
    req<{
      items: Array<{
        id: number;
        createdAt: string;
        kind: string;
        level: string;
        message: string;
        applicationId: number | null;
        jobId: number | null;
        status: string | null;
        matchScore: number | null;
        companyName: string | null;
        title: string | null;
        screenshotPath: string | null;
        screenshotName: string | null;
        detail: unknown;
      }>;
    }>(`/api/events?limit=${limit}`),
};
