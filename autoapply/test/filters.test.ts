import assert from "node:assert/strict";
import { test } from "node:test";
import { hardFilter } from "../src/agent/match.js";
import { remoteEligibility } from "../src/lib/eligibility.js";
import { assessLegitimacy } from "../src/lib/legitimacy.js";
import { candidateProfile } from "../src/lib/profile.js";
import type { NormalizedJob } from "../src/sources/types.js";

const me = candidateProfile();
const LONG = " We build reliable web products with TypeScript, Node.js, React and PostgreSQL on AWS.".repeat(6);

function job(over: Partial<NormalizedJob> = {}): NormalizedJob {
  return {
    source: "remotive",
    sourceJobId: "1",
    companySlug: "acme",
    companyName: "Acme",
    title: "Senior Full Stack Engineer",
    isRemote: true,
    workplaceType: "Remote",
    location: "Worldwide",
    employmentType: "FullTime",
    department: null,
    team: null,
    description: `About the role.${LONG}`,
    applyUrl: "https://remotive.com/remote-jobs/software-dev/acme-1",
    jobUrl: "https://remotive.com/remote-jobs/software-dev/acme-1",
    compensation: null,
    publishedAt: new Date().toISOString(),
    ...over,
  };
}

const eligible = (location: string | null, description = LONG) =>
  remoteEligibility({ location, description }, me).eligible;

test("locations open to Ethiopia pass", () => {
  for (const loc of [
    "Worldwide",
    "Anywhere in the World",
    "🌏 Worldwide",
    "Remote",
    "EMEA",
    "Europe, Middle East and Africa",
    "Americas, EMEA",
    "Africa Only",
    "Ethiopia",
    "Remote (UTC-2 to UTC+4)",
    "CET +/- 3 hours",
    "Remote, US timezones",
    "Multiple Locations",
    null,
  ]) {
    assert.equal(eligible(loc), true, `${loc} should be eligible`);
  }
});

test("locations limited elsewhere are skipped", () => {
  for (const loc of [
    "USA",
    "United States",
    "Remote - US",
    "USA Only",
    "US/Canada",
    "Europe Only",
    "European Union",
    "United Kingdom",
    "LATAM",
    "India",
    "San Francisco, CA",
    "Kenya",
  ]) {
    assert.equal(eligible(loc), false, `${loc} should be skipped`);
  }
});

test("residency and work-authorization sentences in the description are read", () => {
  assert.equal(eligible("Worldwide", "You must be located in the United States to be considered."), false);
  assert.equal(eligible("Remote", "Candidates must be authorized to work in the U.S. without sponsorship."), false);
  assert.equal(eligible("Remote", "This role is open to candidates based in Canada or Mexico."), false);
  assert.equal(eligible("Remote", "We are hiring US-only for this position."), false);
  assert.equal(eligible("Remote", "Applicants must reside in EMEA."), true);
  assert.equal(eligible("Remote", "You must be based in a timezone between UTC-1 and UTC+4."), true);
  assert.equal(eligible("Worldwide", "If you are located in the US, you must be authorized to work in the US."), true);
  assert.equal(eligible("Worldwide", "We are a US-based company hiring contractors worldwide."), true);
  assert.equal(eligible("Remote", "Tell us about yourself. We'd love to hear from you."), true);
});

test("an empty eligibleRegions list turns the check off", () => {
  const open = { ...me, eligibleRegions: [] };
  assert.equal(remoteEligibility({ location: "USA", description: "" }, open).eligible, true);
});

const legit = (over: Partial<NormalizedJob>, trust: "ats" | "curated" | "open" = "open") =>
  assessLegitimacy(job(over), trust);

test("classic job-scam asks are caught", () => {
  const scams = [
    "To proceed with the interview, contact the recruiter on Telegram @hr_desk_jobs.",
    "Message us on WhatsApp: +1 555 019 2834 to schedule.",
    "You will need to pay for the training kit before onboarding.",
    "We will send you a check; deposit the check and purchase equipment from our approved vendor.",
    "Please buy three Google Play gift cards for the onboarding process.",
    "There is a $50 registration fee to join our team.",
  ];
  for (const text of scams) {
    const result = legit({ description: `${text}${LONG}` });
    assert.equal(result.ok, false, text);
    assert.ok(result.flags.some((f) => f.severity === "critical"), text);
  }
});

test("softer red flags add up", () => {
  const result = legit({
    title: "Data Entry Clerk",
    companyName: "Confidential",
    description: "No experience needed! Earn $500 per day. Send your CV to jobs.hr.team@gmail.com",
  });
  assert.equal(result.ok, false);
  assert.ok(result.score < 50);
});

test("real postings that mention WhatsApp, gift cards or fees are not flagged", () => {
  const fine = [
    "You will build our WhatsApp Business API integration and Telegram mini app.",
    "Ship the gift cards feature for Shopify merchants.",
    "There is no application fee. We pay your conference fees.",
    "Strong signal: you have shipped products end to end.",
    "Paid in USD via Deel; contractors worldwide welcome.",
  ];
  for (const text of fine) {
    const result = legit({ description: `${text}${LONG}` });
    assert.equal(result.ok, true, `${text} -> ${JSON.stringify(result.flags)}`);
    assert.ok(!result.flags.some((f) => f.severity !== "minor"), text);
  }
});

test("hardFilter combines scam, eligibility and title rules", () => {
  assert.deepEqual(hardFilter(job(), me), { skip: false, reason: null });
  assert.match(hardFilter(job({ location: "USA Only" }), me).reason ?? "", /limited to USA Only/);
  assert.match(
    hardFilter(job({ source: "linkedin", description: `Contact us on Telegram @recruit_now.${LONG}` }), me).reason ?? "",
    /scam/,
  );
  assert.equal(hardFilter(job({ title: "Internal Tools Engineer" }), me).skip, false);
  assert.match(hardFilter(job({ title: "Software Engineering Intern" }), me).reason ?? "", /Excluded keyword: intern/);
  assert.match(hardFilter(job({ title: "Principal Engineer" }), me).reason ?? "", /principal/);
  assert.match(hardFilter(job({ description: `8+ years of experience required.${LONG}` }), me).reason ?? "", /8\+ years/);
  assert.equal(hardFilter(job({ description: `5+ years of experience.${LONG}` }), me).skip, false);
  assert.match(hardFilter(job({ employmentType: "PartTime" }), me).reason ?? "", /Employment type/);
  assert.equal(hardFilter(job({ employmentType: "Contract" }), me).skip, false);
});
