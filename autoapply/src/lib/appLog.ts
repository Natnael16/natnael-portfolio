import fs from "node:fs";
import path from "node:path";
import { desc, eq } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { applicationEvents, applications, jobs } from "../db/schema.js";
import { nowIso } from "./time.js";

export type LogLevel = "info" | "warn" | "error";

export type AppLogInput = {
  applicationId?: number | null;
  jobId?: number | null;
  kind: string;
  level?: LogLevel;
  message: string;
  detail?: Record<string, unknown>;
  screenshotPath?: string | null;
};

const jsonlPath = () => path.join(config.dataDir, "logs", "auto-apply.jsonl");

function appendJsonl(row: Record<string, unknown>) {
  const file = jsonlPath();
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.appendFileSync(file, `${JSON.stringify(row)}\n`);
}

export function logAppEvent(input: AppLogInput): void {
  const createdAt = nowIso();
  const level = input.level ?? "info";
  const detailJson = input.detail ? JSON.stringify(input.detail) : null;
  const line = `[${createdAt}] ${level.toUpperCase()} ${input.kind} app=${input.applicationId ?? "-"} ${input.message}`;
  if (level === "error") console.error(line);
  else if (level === "warn") console.warn(line);
  else console.log(line);

  try {
    db.insert(applicationEvents)
      .values({
        applicationId: input.applicationId ?? null,
        jobId: input.jobId ?? null,
        kind: input.kind,
        level,
        message: input.message.slice(0, 4000),
        detailJson,
        screenshotPath: input.screenshotPath ?? null,
        createdAt,
      })
      .run();
  } catch (err) {
    console.error("application_events insert failed", err);
  }

  try {
    appendJsonl({
      createdAt,
      level,
      kind: input.kind,
      applicationId: input.applicationId ?? null,
      jobId: input.jobId ?? null,
      message: input.message,
      detail: input.detail ?? null,
      screenshotPath: input.screenshotPath ?? null,
    });
  } catch (err) {
    console.error("auto-apply jsonl write failed", err);
  }
}

export function listAppEvents(limit = 200) {
  const cap = Math.min(500, Math.max(1, limit));
  const rows = db
    .select()
    .from(applicationEvents)
    .orderBy(desc(applicationEvents.id))
    .all()
    .slice(0, cap);

  return rows.map((row) => {
    const app = row.applicationId
      ? db.select().from(applications).where(eq(applications.id, row.applicationId)).get()
      : null;
    const job = row.jobId
      ? db.select().from(jobs).where(eq(jobs.id, row.jobId)).get()
      : app
        ? db.select().from(jobs).where(eq(jobs.id, app.jobId)).get()
        : null;
    let detail: unknown = null;
    if (row.detailJson) {
      try {
        detail = JSON.parse(row.detailJson);
      } catch {
        detail = row.detailJson;
      }
    }
    return {
      id: row.id,
      createdAt: row.createdAt,
      kind: row.kind,
      level: row.level,
      message: row.message,
      applicationId: row.applicationId,
      jobId: row.jobId ?? app?.jobId ?? null,
      status: app?.status ?? null,
      matchScore: app?.matchScore ?? null,
      companyName: job?.companyName ?? null,
      title: job?.title ?? null,
      screenshotPath: row.screenshotPath,
      screenshotName: row.screenshotPath ? path.basename(row.screenshotPath) : null,
      detail,
    };
  });
}
