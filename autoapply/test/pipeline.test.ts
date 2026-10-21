import assert from "node:assert/strict";
import { test } from "node:test";
import { and, eq } from "drizzle-orm";
import { db } from "../src/db/client.js";
import { applications, companies, jobs } from "../src/db/schema.js";
import { heuristicMatch } from "../src/agent/match.js";
import { dedupeKeys } from "../src/lib/dedupe.js";
import { candidateProfile } from "../src/lib/profile.js";
import { registerBoard } from "../src/pipeline/feeds.js";
import { upsertJob } from "../src/pipeline/ingest.js";
import { buildDigest } from "../src/pipeline/notify.js";
import { processNewJobs } from "../src/pipeline/process.js";
import type { NormalizedJob } from "../src/sources/types.js";

const DAY = 86_400_000;
const STACK =
  " You will own TypeScript and Node.js services, React front ends, PostgreSQL data models and Docker deploys on AWS. We hire contractors worldwide.";

function posting(over: Partial<NormalizedJob> & Pick<NormalizedJob, "source" | "sourceJobId" | "title">): NormalizedJob {
  return {
    companySlug: "acme",
    companyName: "Acme",
    isRemote: true,
    workplaceType: "Remote",
    location: "Worldwide",
    employmentType: "FullTime",
    department: null,
    team: null,
    description: `About the role.${STACK.repeat(3)}`,
    applyUrl: `https://example.com/${over.sourceJobId}`,
    jobUrl: `https://example.com/${over.sourceJobId}`,
    compensation: null,
    publishedAt: new Date(Date.now() - DAY).toISOString(),
    ...over,
  };
}

function statusOf(source: string, sourceJobId: string) {
  const job = db
    .select()
    .from(jobs)
    .where(and(eq(jobs.source, source), eq(jobs.sourceJobId, sourceJobId)))
    .get();
  assert.ok(job, `${source}/${sourceJobId} stored`);
  const app = db.select().from(applications).where(eq(applications.jobId, job.id)).get();
  return { status: app?.status ?? null, match: app?.matchJson ? JSON.parse(app.matchJson) : null };
}

test("dedupeKeys matches the same opening across sites", () => {
  const ashby = posting({
    source: "ashby",
    sourceJobId: "a1",
    title: "Senior Full Stack Engineer",
    applyUrl: "https://jobs.ashbyhq.com/acme/0b1c/application",
    jobUrl: "https://jobs.ashbyhq.com/acme/0b1c",
  });
  const linkedin = posting({
    source: "linkedin",
    sourceJobId: "l1",
    companyName: "Acme, Inc.",
    title: "Senior Full-Stack Engineer",
    applyUrl: "https://jobs.ashbyhq.com/acme/0b1c?src=LinkedIn",
    jobUrl: "https://www.linkedin.com/jobs/view/l1/",
  });
  const shared = dedupeKeys(ashby).filter((k) => dedupeKeys(linkedin).includes(k));
  assert.ok(shared.length >= 1);
});

test("heuristicMatch scores skills and title without a model", () => {
  const me = candidateProfile();
  const strong = heuristicMatch(posting({ source: "remotive", sourceJobId: "h1", title: "Senior Full Stack Engineer" }), me);
  assert.equal(strong.decision, "inbox");
  assert.ok(strong.score >= 80);
  assert.ok(strong.evidence.length >= 2);
  const weak = heuristicMatch(
    posting({ source: "remotive", sourceJobId: "h2", title: "Solutions Architect", description: "Salesforce CPQ." }),
    me,
  );
  assert.equal(weak.decision, "skip");
});

test("registerBoard adds the careers board behind an apply link once", () => {
  assert.equal(registerBoard("https://jobs.lever.co/zeta/123", "Zeta"), true);
  assert.equal(registerBoard("https://jobs.lever.co/zeta/456", "Zeta"), false);
  assert.equal(registerBoard("https://zeta.com/careers", "Zeta"), false);
  const row = db.select().from(companies).where(and(eq(companies.source, "lever"), eq(companies.slug, "zeta"))).get();
  assert.equal(row?.name, "Zeta");
});

test("a scan without a model lists real matches to apply to and drops the rest", async () => {
  const seeded = [
    posting({
      source: "ashby",
      sourceJobId: "acme-1",
      title: "Senior Full Stack Engineer",
      location: "Remote (Worldwide)",
      applyUrl: "https://jobs.ashbyhq.com/acme/0b1c/application",
      jobUrl: "https://jobs.ashbyhq.com/acme/0b1c",
    }),
    posting({
      source: "linkedin",
      sourceJobId: "4010000001",
      companyName: "Acme Inc.",
      title: "Senior Full Stack Engineer",
      applyUrl: "https://jobs.ashbyhq.com/acme/0b1c?src=LinkedIn",
      jobUrl: "https://www.linkedin.com/jobs/view/4010000001/",
    }),
    posting({ source: "remotive", sourceJobId: "r-us", companyName: "Beta", title: "Backend Engineer", location: "USA Only" }),
    posting({
      source: "linkedin",
      sourceJobId: "4010000002",
      companyName: "Gamma",
      title: "Full Stack Developer",
      description: `Message us on WhatsApp: +1 555 019 2834 to schedule your interview.${STACK}`,
    }),
    posting({
      source: "weworkremotely",
      sourceJobId: "/remote-jobs/delta-ai-engineer",
      companyName: "Delta",
      title: "AI Engineer",
      location: "Anywhere in the World",
      description: `Build RAG pipelines and LLM agents in Python with OpenAI and Claude.${STACK}`,
    }),
    posting({
      source: "remotive",
      sourceJobId: "r-old",
      companyName: "Epsilon",
      title: "Full Stack Engineer",
      publishedAt: new Date(Date.now() - 30 * DAY).toISOString(),
    }),
    posting({ source: "remotive", sourceJobId: "r-design", companyName: "Zeta", title: "Senior Product Designer" }),
    // A second, separate opening with the same title on the same board is not a duplicate.
    posting({
      source: "ashby",
      sourceJobId: "acme-2",
      title: "Senior Full Stack Engineer",
      applyUrl: "https://jobs.ashbyhq.com/acme/9f8e/application",
      jobUrl: "https://jobs.ashbyhq.com/acme/9f8e",
    }),
  ];
  for (const p of seeded) upsertJob(p);
  const since = new Date(Date.now() - 1_000).toISOString();

  const stats = await processNewJobs();

  assert.equal(statusOf("ashby", "acme-1").status, "apply_manual");
  assert.equal(statusOf("ashby", "acme-2").status, "apply_manual");
  const dup = statusOf("linkedin", "4010000001");
  assert.equal(dup.status, "skipped");
  assert.match(dup.match.skipReason, /Same opening as job #\d+ from Ashby/);
  assert.match(statusOf("remotive", "r-us").match.skipReason, /limited to USA Only/);
  assert.match(statusOf("linkedin", "4010000002").match.skipReason, /scam/);
  assert.equal(statusOf("weworkremotely", "/remote-jobs/delta-ai-engineer").status, "apply_manual");
  assert.equal(statusOf("remotive", "r-old").status, null);
  assert.match(statusOf("remotive", "r-design").match.skipReason, /designer/i);
  assert.equal(stats.manual, 3);
  assert.equal(stats.duplicates, 1);
  assert.equal(stats.tooOld, 1);

  // A second pass leaves everything as it was.
  const again = await processNewJobs();
  assert.equal(again.manual, 0);
  assert.equal(again.duplicates, 0);

  const rows = db
    .select({ application: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(eq(applications.status, "apply_manual"))
    .all()
    .filter((r) => r.application.createdAt >= since);
  const digest = buildDigest(rows) ?? "";
  assert.match(digest, /^3 new job matches/);
  assert.match(digest, /Apply yourself \(3\)/);
  assert.match(digest, /AI Engineer · Delta \(Anywhere in the World\) · We Work Remotely\n {2}https:\/\/example\.com/);
  assert.match(digest, /https:\/\/jobs\.ashbyhq\.com\/acme\/0b1c\/application/);
});
