import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { getCookie } from "hono/cookie";
import { cors } from "hono/cors";
import fs from "node:fs";
import path from "node:path";
import { eq, desc, inArray, notInArray } from "drizzle-orm";
import {
  attachSessionCookie,
  clearSessionCookie,
  COOKIE,
  createSession,
  destroySession,
  requireAuth,
  sessionValid,
} from "./auth.js";
import { config } from "./config.js";
import { db } from "./db/client.js";
import { applications, companies, jobs, profile, runs } from "./db/schema.js";
import type { Profile } from "./lib/profile.js";
import { extractPdfText } from "./lib/resumeFile.js";
import { normalizeAshbySlug } from "./lib/ashbySlug.js";
import { listAppEvents, logAppEvent } from "./lib/appLog.js";
import { loadProfileRecord, syncCandidateResume } from "./lib/store.js";
import { nowIso } from "./lib/time.js";
import { retagInboxForAutoApply, startAutoApplyBatch, startAutoSubmitLoop, submitApproved } from "./pipeline/apply.js";
import { discoverAndStoreBoards, enableAllCompanies, isDiscovering } from "./pipeline/discover.js";
import { retryApplication } from "./pipeline/process.js";
import { runInProgress, startRunInBackground } from "./pipeline/run.js";
import type { FieldAnswer } from "./sources/types.js";

const app = new Hono();

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173", "http://127.0.0.1:5173"],
    credentials: true,
  }),
);
app.use("*", requireAuth);

app.get("/health", (c) => c.json({ ok: true }));

app.post("/api/login", async (c) => {
  const body = await c.req.json<{ password?: string }>();
  if (!body.password || body.password !== config.dashboardPassword) {
    return c.json({ error: "invalid password" }, 401);
  }
  const token = createSession();
  attachSessionCookie(c, token);
  return c.json({ ok: true });
});

app.post("/api/logout", (c) => {
  destroySession(getCookie(c, COOKIE));
  clearSessionCookie(c);
  return c.json({ ok: true });
});

app.get("/api/me", (c) => {
  if (!sessionValid(getCookie(c, COOKIE))) return c.json({ error: "unauthorized" }, 401);
  return c.json({ ok: true });
});

app.get("/api/inbox", (c) => {
  retagInboxForAutoApply();
  const rows = db
    .select({
      application: applications,
      job: jobs,
    })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(inArray(applications.status, ["pending_approval", "auto_submit"]))
    .orderBy(desc(applications.matchScore))
    .all();
  return c.json({
    items: rows.map(serializeApp),
    autoCount: rows.filter((r) => r.application.status === "auto_submit").length,
    reviewCount: rows.filter((r) => r.application.status === "pending_approval").length,
    queuedCount: db
      .select()
      .from(applications)
      .where(inArray(applications.status, ["queued_submit", "submitting"]))
      .all().length,
  });
});

app.get("/api/history", (c) => {
  const status = c.req.query("status");
  const where =
    status === "submitted"
      ? eq(applications.status, "submitted")
      : status === "failed"
        ? eq(applications.status, "failed")
        : notInArray(applications.status, [
            "pending_approval",
            "auto_submit",
            "submitted",
            "failed",
          ]);
  const rows = db
    .select({ application: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(where)
    .orderBy(desc(applications.updatedAt))
    .all()
    .slice(0, 200);
  return c.json({ items: rows.map(serializeApp) });
});

app.get("/api/applications/:id", (c) => {
  const id = Number(c.req.param("id"));
  const row = db
    .select({ application: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.id, id))
    .get();
  if (!row) return c.json({ error: "not found" }, 404);
  return c.json(serializeApp(row));
});

app.patch("/api/applications/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ answers?: FieldAnswer[]; flags?: unknown }>();
  const appRow = db.select().from(applications).where(eq(applications.id, id)).get();
  if (!appRow) return c.json({ error: "not found" }, 404);
  db.update(applications)
    .set({
      answersJson: body.answers ? JSON.stringify(body.answers) : appRow.answersJson,
      flagsJson: body.flags ? JSON.stringify(body.flags) : appRow.flagsJson,
      updatedAt: nowIso(),
    })
    .where(eq(applications.id, id))
    .run();
  return c.json({ ok: true });
});

app.post("/api/applications/:id/skip", (c) => {
  const id = Number(c.req.param("id"));
  db.update(applications)
    .set({ status: "skipped", updatedAt: nowIso() })
    .where(eq(applications.id, id))
    .run();
  return c.json({ ok: true });
});

app.post("/api/applications/:id/mark-submitted", (c) => {
  const id = Number(c.req.param("id"));
  const appRow = db.select().from(applications).where(eq(applications.id, id)).get();
  if (!appRow) return c.json({ error: "not found" }, 404);
  if (appRow.status === "submitted") return c.json({ ok: true, status: "submitted" });
  const ts = nowIso();
  db.update(applications)
    .set({
      status: "submitted",
      submittedAt: appRow.submittedAt ?? ts,
      updatedAt: ts,
      error: null,
    })
    .where(eq(applications.id, id))
    .run();
  logAppEvent({
    applicationId: id,
    jobId: appRow.jobId,
    kind: "mark_submitted",
    message: "Marked submitted from the dashboard (not sent by the agent)",
    detail: { previousStatus: appRow.status },
  });
  return c.json({ ok: true, status: "submitted" });
});

app.post("/api/applications/:id/retry", async (c) => {
  const id = Number(c.req.param("id"));
  const result = await retryApplication(id);
  if (!result.ok) return c.json({ error: result.error, status: result.status }, 400);
  return c.json({ ok: true, status: result.status });
});

app.post("/api/applications/:id/refill", async (c) => {
  const id = Number(c.req.param("id"));
  const result = await retryApplication(id);
  if (!result.ok) return c.json({ error: result.error, status: result.status }, 400);
  return c.json({ ok: true, status: result.status });
});

app.post("/api/inbox/auto-apply", (c) => {
  const result = startAutoApplyBatch();
  return c.json({ ok: true, ...result });
});

app.post("/api/applications/:id/approve", async (c) => {
  const id = Number(c.req.param("id"));
  const appRow = db.select().from(applications).where(eq(applications.id, id)).get();
  if (!appRow) return c.json({ error: "not found" }, 404);
  const flags = JSON.parse(appRow.flagsJson || "[]") as Array<{ path: string; required: boolean }>;
  const answers = JSON.parse(appRow.answersJson || "[]") as FieldAnswer[];
  const byPath = new Map(answers.map((a) => [a.path, a]));
  const blocking = flags.filter((f) => f.required && !byPath.get(f.path)?.value);
  if (blocking.length) {
    return c.json({ error: "Fill required flagged fields before approve", blocking }, 400);
  }
  db.update(applications)
    .set({ status: "approved", updatedAt: nowIso() })
    .where(eq(applications.id, id))
    .run();
  const result = await submitApproved(id);
  if (!result.ok) return c.json({ error: result.error }, 500);
  return c.json({ ok: true });
});

app.get("/api/profile", async (c) => {
  const rec = await syncCandidateResume();
  return c.json({
    profile: rec.profile,
    resumeOriginalName: rec.resumeOriginalName,
    hasResume: Boolean(rec.resumePath),
  });
});

app.put("/api/profile", async (c) => {
  const body = (await c.req.json()) as Partial<Profile>;
  const rec = loadProfileRecord();
  const next = { ...rec.profile, ...body };
  db.update(profile)
    .set({ json: JSON.stringify(next), updatedAt: nowIso() })
    .where(eq(profile.id, 1))
    .run();
  return c.json({ ok: true, profile: next });
});

app.post("/api/profile/resume", async (c) => {
  const form = await c.req.parseBody();
  const file = form.file;
  if (!(file instanceof File)) return c.json({ error: "file required" }, 400);
  const buf = Buffer.from(await file.arrayBuffer());
  const dest = path.join(config.dataDir, "uploads", `resume${path.extname(file.name) || ".pdf"}`);
  fs.writeFileSync(dest, buf);
  let resumeText = "";
  try {
    resumeText = await extractPdfText(dest);
  } catch (err) {
    console.error("resume text extract failed", err);
  }
  db.update(profile)
    .set({
      resumePath: dest,
      resumeOriginalName: file.name,
      resumeText,
      updatedAt: nowIso(),
    })
    .where(eq(profile.id, 1))
    .run();
  return c.json({ ok: true, resumeOriginalName: file.name, textChars: resumeText.length });
});

app.get("/api/companies", (c) => {
  const items = db.select().from(companies).all();
  return c.json({
    items,
    total: items.length,
    enabled: items.filter((row) => row.enabled).length,
    discovering: isDiscovering(),
    scanning: runInProgress(),
  });
});

app.post("/api/companies", async (c) => {
  const body = await c.req.json<{ slug?: string; name?: string; source?: string }>();
  const slug = normalizeAshbySlug(body.slug);
  if (!slug) return c.json({ error: "slug required" }, 400);
  const name = (body.name ?? slug).trim();
  const source = (body.source ?? "ashby").trim() || "ashby";
  try {
    db.insert(companies)
      .values({ slug, name, source, enabled: true, createdAt: nowIso() })
      .run();
  } catch {
    return c.json({ error: "slug already exists" }, 409);
  }
  return c.json({ ok: true, slug, source });
});

app.post("/api/companies/discover", (c) => {
  if (runInProgress() || isDiscovering()) {
    return c.json({ error: "A scan or discovery is already running" }, 409);
  }
  void discoverAndStoreBoards().catch((err) => console.error("discover failed", err));
  return c.json({ ok: true, started: true });
});

app.post("/api/companies/enable-all", (c) => {
  const result = enableAllCompanies();
  return c.json({ ok: true, ...result });
});

app.patch("/api/companies/:id", async (c) => {
  const id = Number(c.req.param("id"));
  const body = await c.req.json<{ enabled?: boolean; name?: string }>();
  db.update(companies)
    .set({
      ...(body.enabled != null ? { enabled: body.enabled } : {}),
      ...(body.name ? { name: body.name } : {}),
    })
    .where(eq(companies.id, id))
    .run();
  return c.json({ ok: true });
});

app.get("/api/runs", (c) => {
  const items = db.select().from(runs).orderBy(desc(runs.id)).all().slice(0, 30);
  return c.json({ items });
});

app.post("/api/runs/once", (c) => {
  if (isDiscovering()) {
    return c.json({ error: "Board discovery is already running" }, 409);
  }
  try {
    const { runId } = startRunInBackground();
    return c.json({ ok: true, runId, started: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 409);
  }
});

app.get("/api/events", (c) => {
  const limit = Number(c.req.query("limit") ?? 250);
  return c.json({ items: listAppEvents(limit) });
});

app.get("/api/screenshots/:file", (c) => {
  const file = path.basename(c.req.param("file"));
  if (!file || file !== c.req.param("file")) return c.json({ error: "not found" }, 404);
  const full = path.join(config.dataDir, "screenshots", file);
  if (!fs.existsSync(full)) return c.json({ error: "not found" }, 404);
  const buf = fs.readFileSync(full);
  const type = file.toLowerCase().endsWith(".png") ? "image/png" : "application/octet-stream";
  return new Response(buf, { headers: { "content-type": type } });
});

function serializeApp(row: { application: typeof applications.$inferSelect; job: typeof jobs.$inferSelect }) {
  return {
    id: row.application.id,
    status: row.application.status,
    matchScore: row.application.matchScore,
    match: parseJson(row.application.matchJson),
    form: parseJson(row.application.formJson),
    answers: parseJson(row.application.answersJson) ?? [],
    flags: parseJson(row.application.flagsJson) ?? [],
    critique: parseJson(row.application.critiqueJson),
    error: row.application.error,
    submittedAt: row.application.submittedAt,
    updatedAt: row.application.updatedAt,
    createdAt: row.application.createdAt,
    job: {
      id: row.job.id,
      title: row.job.title,
      companyName: row.job.companyName,
      companySlug: row.job.companySlug,
      location: row.job.location,
      workplaceType: row.job.workplaceType,
      employmentType: row.job.employmentType,
      applyUrl: row.job.applyUrl,
      jobUrl: row.job.jobUrl,
      compensation: row.job.compensation,
      description: row.job.description,
    },
  };
}

function parseJson(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

const distDir = path.resolve("web/dist");
if (fs.existsSync(distDir)) {
  app.use("/*", serveStatic({ root: "./web/dist" }));
  app.get("*", async (c, next) => {
    if (c.req.path.startsWith("/api")) return next();
    const html = fs.readFileSync(path.join(distDir, "index.html"), "utf8");
    return c.html(html);
  });
}

serve({ fetch: app.fetch, port: config.port }, () => {
  console.log(`web listening on ${config.port}`);
  startAutoSubmitLoop();
});
