import {
  integer,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const companies = sqliteTable(
  "companies",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    name: text("name").notNull(),
    source: text("source").notNull().default("ashby"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    lastFetchedAt: text("last_fetched_at"),
    lastError: text("last_error"),
    failCount: integer("fail_count").notNull().default(0),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("companies_source_slug_idx").on(t.source, t.slug)],
);

export const jobs = sqliteTable(
  "jobs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    source: text("source").notNull(),
    sourceJobId: text("source_job_id").notNull(),
    companySlug: text("company_slug").notNull(),
    companyName: text("company_name").notNull(),
    title: text("title").notNull(),
    isRemote: integer("is_remote", { mode: "boolean" }).notNull().default(false),
    workplaceType: text("workplace_type"),
    location: text("location"),
    employmentType: text("employment_type"),
    department: text("department"),
    team: text("team"),
    description: text("description").notNull().default(""),
    applyUrl: text("apply_url").notNull(),
    jobUrl: text("job_url").notNull(),
    compensation: text("compensation"),
    publishedAt: text("published_at"),
    fetchedAt: text("fetched_at").notNull(),
    createdAt: text("created_at").notNull(),
  },
  (t) => [uniqueIndex("jobs_source_id_idx").on(t.source, t.sourceJobId)],
);

export const applications = sqliteTable("applications", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  jobId: integer("job_id").notNull(),
  status: text("status").notNull(),
  matchScore: integer("match_score"),
  matchJson: text("match_json"),
  formJson: text("form_json"),
  answersJson: text("answers_json"),
  flagsJson: text("flags_json"),
  critiqueJson: text("critique_json"),
  error: text("error"),
  submittedAt: text("submitted_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const profile = sqliteTable("profile", {
  id: integer("id").primaryKey(),
  json: text("json").notNull(),
  resumePath: text("resume_path"),
  resumeOriginalName: text("resume_original_name"),
  resumeText: text("resume_text"),
  updatedAt: text("updated_at").notNull(),
});

export const runs = sqliteTable("runs", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  startedAt: text("started_at").notNull(),
  finishedAt: text("finished_at"),
  status: text("status").notNull(),
  statsJson: text("stats_json"),
  error: text("error"),
});

export const sessions = sqliteTable("sessions", {
  token: text("token").primaryKey(),
  createdAt: text("created_at").notNull(),
});

export const applicationEvents = sqliteTable("application_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  applicationId: integer("application_id"),
  jobId: integer("job_id"),
  kind: text("kind").notNull(),
  level: text("level").notNull(),
  message: text("message").notNull(),
  detailJson: text("detail_json"),
  screenshotPath: text("screenshot_path"),
  createdAt: text("created_at").notNull(),
});
