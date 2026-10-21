/**
 * Live test: ingest boards, match against the candidate profile, draft at most
 * 2 applications, save a full report. Does not submit.
 */
import fs from "node:fs";
import path from "node:path";
import { z } from "zod";
import { completeJson, isModelConfigured } from "../src/agent/model.js";
import { config } from "../src/config.js";
import { db } from "../src/db/client.js";
import { applications, companies, jobs, profile as profileTable } from "../src/db/schema.js";
import { candidateProfile } from "../src/lib/profile.js";
import { loadCandidateResumeMaterials } from "../src/lib/resumeFile.js";
import { nowIso } from "../src/lib/time.js";
import { ingestBoards } from "../src/pipeline/ingest.js";
import { processNewJobs } from "../src/pipeline/process.js";
import { eq } from "drizzle-orm";

const MAX_DRAFTS = 2;
const BOARDS = ["cursor", "posthog", "resend", "ramp", "notion"];

async function seedProfile() {
  const { resumePath, resumeOriginalName, resumeText } = await loadCandidateResumeMaterials();
  const next = candidateProfile();

  db.update(profileTable)
    .set({
      json: JSON.stringify(next),
      resumePath,
      resumeOriginalName,
      resumeText,
      updatedAt: nowIso(),
    })
    .where(eq(profileTable.id, 1))
    .run();
}

function enableBoards(slugs: string[]) {
  const want = new Set(slugs);
  const all = db.select().from(companies).all();
  for (const row of all) {
    db.update(companies)
      .set({ enabled: want.has(row.slug) })
      .where(eq(companies.id, row.id))
      .run();
  }
}

function clearAppsForSlug(slug: string) {
  const boardJobs = db.select().from(jobs).where(eq(jobs.companySlug, slug)).all();
  for (const job of boardJobs) {
    db.delete(applications).where(eq(applications.jobId, job.id)).run();
  }
}

function parseJson(raw: string | null) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

async function pingVertex() {
  if (!isModelConfigured()) {
    throw new Error("VERTEX_PROJECT is not set after loading .env");
  }
  const ok = await completeJson({
    system: "Reply with JSON only.",
    user: "Return ping=ok",
    schema: z.object({ ping: z.string() }),
  });
  if (!ok.ping) throw new Error("Vertex ping returned empty");
  return ok;
}

function writeReport(processed: unknown, ping: unknown, sinceIso: string) {
  const dir = path.join(config.dataDir, "test-reports");
  fs.mkdirSync(dir, { recursive: true });
  const stamp = nowIso().replace(/[:.]/g, "-");
  const rows = db
    .select()
    .from(applications)
    .all()
    .filter((app) => app.updatedAt >= sinceIso)
    .map((app) => {
      const job = db.select().from(jobs).where(eq(jobs.id, app.jobId)).get();
      return { app, job };
    });

  const drafted = rows.filter((r) => r.app.status === "pending_approval" || r.app.status === "auto_submit");
  const rec = db.select().from(profileTable).where(eq(profileTable.id, 1)).get();
  const payload = {
    ranAt: nowIso(),
    resume: {
      path: rec?.resumePath ?? null,
      name: rec?.resumeOriginalName ?? null,
      textChars: rec?.resumeText?.length ?? 0,
    },
    vertex: { project: config.vertexProject, model: config.vertexModel, location: config.vertexLocation, ping },
    note: "Applications were drafted only. Nothing was submitted to Ashby.",
    processStats: processed,
    draftedCount: drafted.length,
    applications: rows.map(({ app, job }) => ({
      applicationId: app.id,
      status: app.status,
      error: app.error,
      matchScore: app.matchScore,
      match: parseJson(app.matchJson),
      critique: parseJson(app.critiqueJson),
      flags: parseJson(app.flagsJson),
      form: parseJson(app.formJson),
      answers: parseJson(app.answersJson),
      job: job
        ? {
            id: job.id,
            company: job.companyName,
            title: job.title,
            location: job.location,
            workplaceType: job.workplaceType,
            employmentType: job.employmentType,
            applyUrl: job.applyUrl,
            jobUrl: job.jobUrl,
          }
        : null,
      updatedAt: app.updatedAt,
    })),
  };

  const jsonPath = path.join(dir, `two-job-run-${stamp}.json`);
  fs.writeFileSync(jsonPath, JSON.stringify(payload, null, 2));

  const lines: string[] = [];
  lines.push(`# Two-job test report`);
  lines.push("");
  lines.push(`Ran at ${payload.ranAt}`);
  lines.push(`Vertex ${config.vertexModel} on ${config.vertexProject} (${config.vertexLocation})`);
  lines.push(`Resume: ${payload.resume.name ?? "?"} (${payload.resume.path ?? ""})`);
  lines.push(`Nothing was submitted.`);
  lines.push("");
  lines.push(`Process stats: ${JSON.stringify(processed)}`);
  lines.push("");

  for (const row of payload.applications) {
    lines.push(`## ${row.status.toUpperCase()} — ${row.job?.company ?? "?"} / ${row.job?.title ?? "?"}`);
    lines.push("");
    lines.push(`- application id: ${row.applicationId}`);
    lines.push(`- score: ${row.matchScore ?? "—"}`);
    lines.push(`- apply: ${row.job?.applyUrl ?? ""}`);
    if (row.error) lines.push(`- error: ${row.error}`);
    const match = row.match as { summary?: string; skipReason?: string; decision?: string; evidence?: string[]; gaps?: string[] } | null;
    if (match?.decision) lines.push(`- match decision: ${match.decision}`);
    if (match?.skipReason) lines.push(`- skip: ${match.skipReason}`);
    if (match?.summary) lines.push(`- summary: ${match.summary}`);
    if (match?.evidence?.length) {
      lines.push(`- evidence:`);
      for (const e of match.evidence) lines.push(`  - ${e}`);
    }
    if (match?.gaps?.length) {
      lines.push(`- gaps:`);
      for (const e of match.gaps) lines.push(`  - ${e}`);
    }
    const critique = row.critique as { ok?: boolean; violations?: string[] } | null;
    if (critique?.violations?.length) {
      lines.push(`- critique: ${critique.violations.join(" | ")}`);
    }
    const flags = (row.flags ?? []) as Array<{ path: string; reason: string; required: boolean }>;
    if (flags.length) {
      lines.push(`- flags:`);
      for (const f of flags) lines.push(`  - ${f.required ? "required" : "note"} · ${f.path}: ${f.reason}`);
    }
    const answers = (row.answers ?? []) as Array<{
      path: string;
      label?: string;
      type: string;
      value: string | null;
      confidence: string;
      source: string;
    }>;
    if (answers.length) {
      lines.push("");
      lines.push(`### Filled fields`);
      lines.push("");
      for (const a of answers) {
        const prompt = a.label || a.path;
        const val = a.value == null || a.value === "" ? "(empty)" : a.value;
        lines.push(`- **${prompt}**`);
        lines.push(`  - type: ${a.type} · ${a.confidence} · ${a.source}`);
        lines.push(`  - value: ${val}`);
      }
    }
    lines.push("");
  }

  const mdPath = path.join(dir, `two-job-run-${stamp}.md`);
  fs.writeFileSync(mdPath, lines.join("\n"));
  return { jsonPath, mdPath, payload };
}

async function main() {
  console.log("Seeding profile…");
  await seedProfile();
  enableBoards(BOARDS);
  for (const slug of BOARDS) clearAppsForSlug(slug);

  console.log("Pinging Vertex…");
  const ping = await pingVertex();
  console.log("Vertex ping", ping);

  console.log(`Ingesting ${BOARDS.join(", ")}…`);
  const ingest = await ingestBoards();
  console.log("ingest", ingest);

  const sinceIso = nowIso();
  console.log(`Matching and drafting up to ${MAX_DRAFTS} jobs (no submit)…`);
  const processed = await processNewJobs({
    maxDrafts: MAX_DRAFTS,
    retryFailed: false,
    ignorePostedAge: true,
  });
  console.log("processed", processed);

  const { jsonPath, mdPath, payload } = writeReport({ ingest, processed }, ping, sinceIso);
  console.log("report", mdPath);
  console.log("json", jsonPath);
  console.log("drafted", payload.draftedCount);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
