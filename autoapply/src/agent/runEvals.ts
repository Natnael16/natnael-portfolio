import fs from "node:fs";
import { identityAnswer } from "./draft.js";
import { prefillAnswer } from "./prefill.js";
import { applyCritique, critiqueAfterFixes, localCritique, proseIssues, rewriteProse } from "./critique.js";
import { hardFilter, matchJob } from "./match.js";
import { isRetryableFailure } from "../pipeline/retry.js";
import { isAlreadySentSubmitError, nextStatusAfterSubmitFail } from "../pipeline/submitGuard.js";
import { extractAshbySlugs, humanizeSlug, normalizeAshbySlug, slugGuessesFromName, slugGuessesFromWebsite } from "../lib/ashbySlug.js";
import { applyUrlCandidates, applicationLooksSubmitted, applyFormStillOpen, ashbyQuestionLooksRequired, fieldForAnswer, fieldForMissingLabel, formatUnconfirmedSubmit, graphqlErrorMessage, graphqlLooksSubmitted, isAshbyGraphqlOp, isAshbySpamFlag, keepRecoveredApplyUrl, parseMissingRequiredLabels, pickResumeFileInput, radioQuestionId, shouldRetryMissingRequired, titleToCareersSlug } from "../sources/ashby.js";
import { draftApplication } from "./draft.js";
import { isModelConfigured, parseJsonObject } from "./model.js";
import { loadSkill } from "./loader.js";
import { CANDIDATE_PROFILE_MD, candidateAgentSources } from "../lib/resumeFile.js";
import type { ApplyField, DraftResult, FieldAnswer, MatchResult } from "../sources/types.js";
import {
  evalProfile,
  evalResume,
  harborForm,
  harborJob,
  hardFilterCases,
  matchCases,
  midProfile,
} from "./evals/corpus.js";

function fail(id: string, msg: string) {
  console.error(`FAIL ${id}: ${msg}`);
  return 1;
}

function ok(id: string, detail = "") {
  console.log(`OK   ${id}${detail ? ` (${detail})` : ""}`);
  return 0;
}

function runHardFilters(): number {
  let failed = 0;
  for (const c of hardFilterCases) {
    const result = hardFilter(c.job, c.profile ?? evalProfile);
    if (!result.skip) failed += fail(c.id, "expected hard skip");
    else ok(c.id, result.reason ?? "skip");
  }
  const seniorOk = hardFilter(harborJob, evalProfile);
  if (seniorOk.skip) {
    failed += fail("HF-allow-eval-senior", seniorOk.reason ?? "senior eval must still match Harbor");
  } else {
    ok("HF-allow-eval-senior");
  }
  const midSkip = hardFilter(harborJob, midProfile);
  if (!midSkip.skip) {
    failed += fail("HF-mid-blocks-senior", "mid profile must skip Senior titles");
  } else {
    ok("HF-mid-blocks-senior", midSkip.reason ?? "skip");
  }
  return failed;
}

function runCandidateSources(): number {
  if (!fs.existsSync(CANDIDATE_PROFILE_MD)) {
    return fail("SRC-md", `no master profile at ${CANDIDATE_PROFILE_MD}`);
  }
  const onDisk = fs.readFileSync(CANDIDATE_PROFILE_MD, "utf8");
  const { resumePdf, masterProfile } = candidateAgentSources(`PDF EXTRACT\n\n${onDisk}`);
  if (masterProfile !== onDisk) {
    return fail("SRC-md", `master profile was cut: ${masterProfile.length} of ${onDisk.length} chars`);
  }
  if (resumePdf !== "PDF EXTRACT") {
    return fail("SRC-split", "pdf extract should not include the markdown");
  }
  return ok("SRC-md", `${masterProfile.length} chars, full markdown`);
}

function runIdentity(): number {
  const cases = [
    ["_systemfield_name", "Full name", evalProfile.name],
    ["_systemfield_email", "Email", evalProfile.email],
    ["phone", "Phone", evalProfile.phone],
    ["linkedin", "LinkedIn URL", evalProfile.linkedin],
  ] as const;
  let failed = 0;
  for (const [path, label, expected] of cases) {
    const ans = identityAnswer(evalProfile, path, label);
    if (!ans || ans.value !== expected || ans.source !== "profile") {
      failed += fail("D1", `${path} got ${JSON.stringify(ans)}`);
    }
  }
  if (!failed) ok("D1", "identity exact");
  return failed;
}

function runRetryable(): number {
  const yes = [
    "No form fields found on https://jobs.ashbyhq.com/x",
    "extract timed out",
    "Timeout 20000ms exceeded",
    "net::ERR_CONNECTION_RESET",
    "Apply form did not load",
    "Expected ',' or ']' after array element in JSON at position 668",
  ];
  const no = [
    "Conditional required fields appeared",
    "Unconfirmed submit",
    "Apply page not found for Software Engineer, User Operations",
    "Page not found The page you requested was not found",
    null,
    "",
  ];
  for (const msg of yes) {
    if (!isRetryableFailure(msg)) return fail("RETRY", `expected retryable: ${msg}`);
  }
  for (const msg of no) {
    if (isRetryableFailure(msg)) return fail("RETRY", `expected not retryable: ${msg}`);
  }
  return ok("RETRY", "failed extracts retry; submit errors do not");
}

function runSubmitGuard(): number {
  const cases: Array<{
    id: string;
    wasQueued: boolean;
    error: string;
    spam: boolean;
    expect: "queued_submit" | "pending_approval" | "failed";
  }> = [
    { id: "unconfirmed", wasQueued: true, error: "Unconfirmed submit. URL https://x. Form: Name", spam: false, expect: "failed" },
    { id: "timeout", wasQueued: true, error: "Timeout 20000ms exceeded", spam: false, expect: "queued_submit" },
    { id: "empty", wasQueued: true, error: "Required fields are still empty: Salary", spam: false, expect: "pending_approval" },
    { id: "spam", wasQueued: true, error: "Flagged as possible spam.", spam: true, expect: "pending_approval" },
    { id: "manual-timeout", wasQueued: false, error: "Timeout 20000ms exceeded", spam: false, expect: "pending_approval" },
  ];
  for (const c of cases) {
    const got = nextStatusAfterSubmitFail({ wasQueued: c.wasQueued, error: c.error, spam: c.spam });
    if (got !== c.expect) return fail("SUBMIT-guard", `${c.id}: expected ${c.expect}, got ${got}`);
  }
  if (!isAlreadySentSubmitError("Unconfirmed submit. URL https://x")) {
    return fail("SUBMIT-guard", "unconfirmed should count as already-sent");
  }
  return ok("SUBMIT-guard", "no auto-retry after Ashby accept / unconfirmed");
}

function runJsonAndRadios(): number {
  let failed = 0;
  const broken = `{
  "answers": [
    {"path": "a", "value": "1"}
    {"path": "b", "value": "2"}
  ]
}`;
  try {
    const parsed = parseJsonObject(broken) as { answers: Array<{ path: string }> };
    if (parsed.answers?.length !== 2) failed += fail("JSON-repair", JSON.stringify(parsed));
    else ok("JSON-repair", "missing commas between objects");
  } catch (err) {
    failed += fail("JSON-repair", err instanceof Error ? err.message : String(err));
  }

  const q = "d782d0c5-7f09-4c91-a830-98e97dd315e3";
  const stored = `95c6051e-9f2a-4fb2-9137-48a463e21ed0_${q}`;
  if (radioQuestionId(stored) !== q) failed += fail("RADIO-id", radioQuestionId(stored));
  else ok("RADIO-id", "stable question id");

  const fields: ApplyField[] = [
    { path: q, label: "Backend", required: true, inputKind: "radio", options: ["A", "B"] },
  ];
  if (fieldForAnswer(fields, stored)?.path !== q) failed += fail("RADIO-map", "stored form-instance path should map");
  else ok("RADIO-map", "answer path maps across reloads");
  const consentLive: ApplyField[] = [
    {
      path: "uuid-consent",
      label:
        "By checking this box, you consent to the collection, use, processing, and disclosure of your personal data.",
      required: true,
      inputKind: "checkbox",
      options: [],
    },
  ];
  const mapped = fieldForAnswer(
    consentLive,
    "By checking this box, you consent to the collection, use, processing, and disclosure of your personal data.",
    "By checking this box, you consent to the collection, use, processing, and disclosure of your personal data.",
  );
  if (mapped?.path !== "uuid-consent") failed += fail("CONSENT-map", "consent path should map by label");
  else ok("CONSENT-map", "consent checkbox maps by label");
  if (
    !ashbyQuestionLooksRequired("_heading_f7cvd_52 _required_f7cvd_91 _label_1e3gg_42 ashby-application-form-question-title", "Consent")
  ) {
    failed += fail("CONSENT-req", "Ashby _required_ class should count");
  } else if (ashbyQuestionLooksRequired("_heading_f7cvd_52  _label_1e3gg_42 ashby-application-form-question-title", "Linkedin URL")) {
    failed += fail("CONSENT-req", "optional title must not count");
  } else {
    ok("CONSENT-req", "Ashby required class on the question title");
  }

  const visaError =
    "Submit blocked by validation: Your form needs correctionsMissing entry for required field: Do you need a Work VISA to work in the country where this job is located?; Missing entry for required field: Do you need a Work VISA to work in the country where this job is located?; Missing entry for required field: Do you need a Work VISA to work in the country where this job is located?";
  const missing = parseMissingRequiredLabels(visaError);
  if (missing.length !== 1 || !/work visa/i.test(missing[0] || "")) {
    failed += fail("VISA-parse", JSON.stringify(missing));
  } else {
    ok("VISA-parse", "dedupes glued Ashby missing-required errors");
  }
  const visaFields: ApplyField[] = [
    {
      path: "4794b3e9-07ec-4220-9468-623662bca8de",
      label: "Do you need a Work VISA to work in the country where this job is located?",
      required: true,
      inputKind: "radio",
      options: ["Yes", "No"],
    },
  ];
  if (fieldForMissingLabel(visaFields, missing[0] || "")?.path !== visaFields[0].path) {
    failed += fail("VISA-map", "missing-required label should map to live radio");
  } else {
    ok("VISA-map", "visa yes/no maps from Ashby error");
  }
  if (!shouldRetryMissingRequired(visaError)) {
    failed += fail("VISA-retry", "missing required should retry");
  } else if (shouldRetryMissingRequired("Unconfirmed submit. URL https://jobs.ashbyhq.com/x. Form: still here")) {
    failed += fail("VISA-retry", "unconfirmed must not retry");
  } else if (shouldRetryMissingRequired("Your application submission was flagged as possible spam.")) {
    failed += fail("VISA-retry", "spam must not retry");
  } else {
    ok("VISA-retry", "retry missing required, not spam/unconfirmed");
  }
  if (normalizeAshbySlug("Dominion%20Dynamics") !== "dominion dynamics") {
    failed += fail("SLUG-space", String(normalizeAshbySlug("Dominion%20Dynamics")));
  } else if (!extractAshbySlugs("https://jobs.ashbyhq.com/Dominion%20Dynamics/abc").includes("dominion dynamics")) {
    failed += fail("SLUG-space", "URL extractor dropped spaced board");
  } else {
    ok("SLUG-space", "percent-encoded board names survive");
  }
  const guesses = slugGuessesFromName("Flock Safety");
  if (!guesses.includes("flocksafety") || !guesses.includes("flock-safety") || !guesses.includes("flock safety")) {
    failed += fail("SLUG-guess", guesses.join(","));
  } else if (!slugGuessesFromWebsite("https://www.linear.app/careers").includes("linear")) {
    failed += fail("SLUG-guess", "website host should guess linear");
  } else {
    ok("SLUG-guess", "name and website expand to posting-api candidates");
  }
  if (normalizeAshbySlug("https://fordefijobs.ashbyhq.com/abc") !== "fordefijobs") {
    failed += fail("SLUG-host", String(normalizeAshbySlug("https://fordefijobs.ashbyhq.com/abc")));
  } else if (normalizeAshbySlug("jobs.ashbyhq.com/linear") !== "linear") {
    failed += fail("SLUG-host", "jobs host path should still be linear");
  } else if (!extractAshbySlugs("see https://acme.ashbyhq.com/role").includes("acme")) {
    failed += fail("SLUG-host", "subdomain boards should extract");
  } else if (extractAshbySlugs("https://academy.ashbyhq.com https://jobs.ashbyhq.com/linear").includes("academy")) {
    failed += fail("SLUG-host", "Ashby product hosts are not boards");
  } else if (humanizeSlug("checkout.com") !== "Checkout.com") {
    failed += fail("SLUG-host", humanizeSlug("checkout.com"));
  } else {
    ok("SLUG-host", "company.ashbyhq.com is a host, checkout.com stays a board name");
  }
  return failed;
}

function runApplyUrls(): number {
  let failed = 0;
  const slug = titleToCareersSlug("Software Engineer, User Operations");
  if (slug !== "software-engineer-user-operations") {
    failed += fail("APPLY-slug", slug);
  } else {
    ok("APPLY-slug", slug);
  }
  const urls = applyUrlCandidates(
    {
      ...harborJob,
      companySlug: "cursor",
      title: "Software Engineer, User Operations",
      applyUrl: "https://jobs.ashbyhq.com/cursor/abc/application",
      jobUrl: "https://jobs.ashbyhq.com/cursor/abc",
    },
    "https://cursor.com/careers",
  );
  if (!urls[0]?.includes("cursor.com/careers/software-engineer-user-operations")) {
    failed += fail("APPLY-order", urls.join(" | "));
  } else {
    ok("APPLY-order", urls[0]);
  }
  const kept = keepRecoveredApplyUrl(
    "https://cursor.com/careers/software-engineer-user-operations#apply",
    "https://jobs.ashbyhq.com/cursor/abc/application",
  );
  if (!kept.includes("cursor.com/careers")) failed += fail("APPLY-keep", kept);
  else ok("APPLY-keep", "recovered URL wins ingest");

  const picked = pickResumeFileInput([
    { name: "", id: "autofill", label: "Autofill from resume" },
    { name: "_systemfield_resume", id: "", label: "Resume" },
  ]);
  if (picked?.name !== "_systemfield_resume") {
    failed += fail("APPLY-resume-file", JSON.stringify(picked));
  } else {
    ok("APPLY-resume-file", "skip Autofill helper");
  }
  return failed;
}

function runResumePrefill(): number {
  const field: ApplyField = {
    path: "resume",
    label: "Resume",
    required: true,
    inputKind: "file",
    options: [],
  };
  const ans = prefillAnswer(evalProfile, field, "resume_file");
  if (ans?.value !== "{{resume}}" || ans.source !== "profile") {
    return fail("D2", `expected {{resume}}, got ${JSON.stringify(ans)}`);
  }
  return ok("D2", "resume sentinel");
}

function runPrefillLogistics(): number {
  let failed = 0;
  const zeri = {
    ...midProfile,
    location: "Addis Ababa, Ethiopia",
    timezone: "Africa/Addis_Ababa",
  };
  const tz: ApplyField = {
    path: "tz",
    label: "Are you based in a EU or equivalent timezone?",
    required: true,
    inputKind: "radio",
    options: ["Yes", "No"],
  };
  const tzAns = prefillAnswer(zeri, tz, "availability");
  if (tzAns?.value !== "Yes") failed += fail("PF-tz", JSON.stringify(tzAns));
  else ok("PF-tz", "timezone overlap Yes");

  const country: ApplyField = {
    path: "country",
    label: "Country",
    required: true,
    inputKind: "text",
    options: [],
  };
  const countryAns = prefillAnswer(zeri, country, "location");
  if (countryAns?.value !== "Ethiopia") failed += fail("PF-country", JSON.stringify(countryAns));
  else ok("PF-country", "Ethiopia");

  const notice: ApplyField = {
    path: "notice",
    label: "Notice period",
    required: false,
    inputKind: "text",
    options: [],
  };
  const noticeAns = prefillAnswer(zeri, notice, "availability");
  if (noticeAns?.value !== "1 week") failed += fail("PF-notice", JSON.stringify(noticeAns));
  else ok("PF-notice", "1 week");

  const visa: ApplyField = {
    path: "sponsorship",
    label:
      "Will you now or in the future require visa sponsorship to work in the country where this position is located?",
    required: true,
    inputKind: "radio",
    options: ["Yes", "No"],
  };
  const visaAns = prefillAnswer({ ...zeri, requiresSponsorship: false }, visa, "unknown");
  if (visaAns?.value !== "No" || visaAns.type !== "sponsorship") {
    failed += fail("PF-visa", JSON.stringify(visaAns));
  } else {
    ok("PF-visa", "No sponsorship");
  }

  const salary: ApplyField = {
    path: "expectedCompensation",
    label: "Expected compensation (USD)",
    required: true,
    inputKind: "text",
    options: [],
  };
  const remoteJob = { isRemote: true, workplaceType: "Remote" as const };
  const officeJob = { isRemote: false, workplaceType: "On-site" as const };
  const withBand = { ...zeri, salaryBand: "2000-2500 USD per month", remoteOnly: true };
  const salaryAns = prefillAnswer(withBand, salary, "salary", remoteJob);
  if (salaryAns?.value !== "2000-2500 USD per month") {
    failed += fail("PF-salary", JSON.stringify(salaryAns));
  } else {
    ok("PF-salary", "2000-2500 USD per month");
  }
  const annual: ApplyField = {
    path: "annualPay",
    label: "Expected annual salary",
    required: true,
    inputKind: "number",
    options: [],
  };
  const annualAns = prefillAnswer(withBand, annual, "salary", remoteJob);
  if (annualAns?.value !== "24000") failed += fail("PF-salary-year", JSON.stringify(annualAns));
  else ok("PF-salary-year", "24000 annual");
  const officeAns = prefillAnswer(withBand, salary, "salary", officeJob);
  if (officeAns?.value) failed += fail("PF-salary-onsite", JSON.stringify(officeAns));
  else ok("PF-salary-onsite", "do not use remote band on-site");

  const referral: ApplyField = {
    path: "referral_email",
    label: "Has someone referred you for this role? If so, please include their email here",
    required: false,
    inputKind: "text",
    options: [],
  };
  const referralAns = prefillAnswer(zeri, referral, "referral");
  if (referralAns?.value) {
    failed += fail("PF-referral", JSON.stringify(referralAns));
  } else {
    ok("PF-referral", "do not use candidate email");
  }

  const requiredConsent: ApplyField = {
    path: "consent-box",
    label:
      "By checking this box, you consent to the collection, use, processing, and disclosure of your personal data for recruitment marketing purposes. Your personal data will be processed in accordance with Bjak's Recruitment Policy.",
    required: true,
    inputKind: "checkbox",
    options: [],
  };
  const consentAns = prefillAnswer({ ...zeri, gdprConsent: false, attestTruth: false }, requiredConsent, "consent");
  if (consentAns?.value !== "true") {
    failed += fail("PF-consent", JSON.stringify(consentAns));
  } else {
    ok("PF-consent", "form-required consent is ticked");
  }
  const optionalConsent = { ...requiredConsent, required: false };
  const optionalAns = prefillAnswer({ ...zeri, gdprConsent: false, attestTruth: false }, optionalConsent, "consent");
  if (optionalAns?.value) failed += fail("PF-consent-opt", JSON.stringify(optionalAns));
  else ok("PF-consent-opt", "optional consent stays empty");
  const sms: ApplyField = {
    path: "sms",
    label: "Yes - I consent to receiving text messages from recruiting",
    required: false,
    inputKind: "checkbox",
    options: [],
  };
  const smsOff = prefillAnswer({ ...zeri, gdprConsent: false }, sms, "marketing_opt_in");
  if (smsOff?.value) failed += fail("PF-sms-off", JSON.stringify(smsOff));
  else ok("PF-sms-off", "optional SMS stays empty");
  const smsOn = prefillAnswer({ ...zeri, gdprConsent: true }, sms, "marketing_opt_in");
  if (smsOn?.value !== "true") failed += fail("PF-sms-on", JSON.stringify(smsOn));
  else ok("PF-sms-on", "GDPR flag ticks optional SMS");

  return failed;
}

function runSubmitDetect(): number {
  let failed = 0;
  const jdHeader =
    "Skip to content Product Pricing Careers Software Engineer Apply Our mission is to ship reliable billing APIs";
  if (applicationLooksSubmitted(jdHeader)) {
    failed += fail("SUBMIT-jd", "job post header must not count as confirmation");
  } else {
    ok("SUBMIT-jd", "header is not success");
  }
  if (!applicationLooksSubmitted("Thank you for applying. We have received your application.")) {
    failed += fail("SUBMIT-thanks", "confirmation copy should match");
  } else {
    ok("SUBMIT-thanks", "confirmation copy");
  }
  if (!applicationLooksSubmitted("Thanks for your application. Your application has been submitted.")) {
    failed += fail("SUBMIT-thanks-variant", "thanks-for-your-application should match");
  } else {
    ok("SUBMIT-thanks-variant", "thanks for your application");
  }
  if (!isAshbyGraphqlOp("https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiSetFormValueToFile", "", "ApiSetFormValueToFile")) {
    failed += fail("GQL-op-url", "op query should match");
  } else if (
    !isAshbyGraphqlOp(
      "https://jobs.ashbyhq.com/api/non-user-graphql",
      '{"operationName":"ApiSubmitSingleApplicationFormAction"}',
      "ApiSubmitSingleApplicationFormAction",
    )
  ) {
    failed += fail("GQL-op-body", "operationName body should match");
  } else if (
    isAshbyGraphqlOp(
      "https://jobs.ashbyhq.com/api/non-user-graphql?op=ApiJobPosting",
      "",
      "ApiSubmitSingleApplicationFormAction",
    )
  ) {
    failed += fail("GQL-op-other", "other ops must not match submit");
  } else {
    ok("GQL-op", "hosted Ashby graphql ops");
  }
  if (
    graphqlErrorMessage({ errors: [{ message: "Resume is required" }] }) !== "Resume is required" ||
    graphqlErrorMessage({ data: { submit: { success: false, errors: ["Pick a country"] } } }) !== "Pick a country"
  ) {
    failed += fail("GQL-err", String(graphqlErrorMessage({ errors: [{ message: "Resume is required" }] })));
  } else {
    ok("GQL-err", "graphql error extraction");
  }
  if (!isAshbySpamFlag("Your application submission was flagged as possible spam. If you believe this was a mistake, please submit your application again.")) {
    failed += fail("GQL-spam", "spam copy should match");
  } else if (isAshbySpamFlag("Resume is required")) {
    failed += fail("GQL-spam", "non-spam must not match");
  } else {
    ok("GQL-spam", "spam flag retry cue");
  }
  const spamBody =
    "Your application submission was flagged as possible spam. If you believe this was a mistake, please submit your application again. Submit Application Autofill from resume";
  if (applicationLooksSubmitted(spamBody) || !applyFormStillOpen(spamBody)) {
    failed += fail("SUBMIT-spam-ui", "spam page must not count as confirmation");
  } else {
    ok("SUBMIT-spam-ui", "open form / spam is not success");
  }
  if (
    graphqlErrorMessage({ data: { action: { message: "Your application submission was flagged as possible spam." } } })?.includes("possible spam") !==
    true
  ) {
    failed += fail("GQL-spam-nested", "nested spam copy");
  } else if (graphqlLooksSubmitted({ data: { action: { submittedFormInstance: { id: "abc" } } } }) !== true) {
    failed += fail("GQL-submitted", "submittedFormInstance should count");
  } else if (
    graphqlLooksSubmitted({
      data: { action: { submittedFormInstance: { id: "abc" }, message: "flagged as possible spam" } },
    })
  ) {
    failed += fail("GQL-submitted-spam", "spam payload must not count as submitted");
  } else {
    ok("GQL-submitted", "confirm only real Ashby accepts");
  }
  const msg = formatUnconfirmedSubmit(
    "https://example.com/careers/software-engineer",
    "Name* Email* Resume Submit application",
  );
  if (!/Unconfirmed submit/.test(msg) || /Skip to content/.test(msg)) {
    failed += fail("SUBMIT-err", msg);
  } else {
    ok("SUBMIT-err", "form snippet, not page header");
  }
  return failed;
}

function runPlantedLie(): number {
  const draft: DraftResult = {
    coverLetter: null,
    flags: [],
    answers: [
      {
        path: "experience",
        type: "experience",
        value: "Principal Engineer at Stripe, grew revenue 40%.",
        confidence: "high",
        source: "resume",
      },
    ],
  };
  const critique = localCritique({
    profile: evalProfile,
    resumeText: evalResume,
    draft,
  });
  const joined = critique.violations.join(" ").toLowerCase();
  if (!/stripe|revenue|title not on resume/i.test(joined)) {
    return fail("D10", `expected fabrication violation, got ${JSON.stringify(critique.violations)}`);
  }
  return ok("D10", critique.violations.join("; "));
}

function runWordingScan(): number {
  const bad =
    "I genuinely enjoy building backends; this automated application was drafted for the posting.";
  const issues = proseIssues(bad);
  if (!issues.includes("semicolon") || !issues.includes("filler or jargon") || !issues.includes("AI or automation trace")) {
    return fail("WORDING", `expected semicolon/filler/automation, got ${JSON.stringify(issues)}`);
  }
  const clean = "At Northline I own the TypeScript billing API. We use Fastify and PostgreSQL.";
  const extra = proseIssues(clean);
  if (extra.length) return fail("WORDING", `false positive ${JSON.stringify(extra)}`);
  return ok("WORDING", "generated traces flagged, plain sentences pass");
}

function runCritiqueFix(): number {
  let failed = 0;
  const messy =
    "At QuickSync, I built an AI pipeline, replaced the vendor, cut costs, and kept accuracy.";
  const rewritten = rewriteProse(messy);
  if (rewritten === messy || proseIssues(rewritten).includes("too many commas")) {
    failed += fail("FIX-prose", rewritten);
  } else {
    ok("FIX-prose", "comma splice split");
  }

  const cleaned = applyCritique(
    {
      coverLetter: null,
      flags: [{ path: "highlight", reason: "too many commas", required: false }],
      answers: [
        {
          path: "highlight",
          type: "highlight",
          value: messy,
          confidence: "high",
          source: "resume",
        },
      ],
    },
    {
      ok: false,
      violations: ["Wording too many commas (highlight)"],
      flags: [{ path: "highlight", reason: "too many commas", required: false }],
    },
  );
  if (!cleaned.answers[0]?.value) {
    failed += fail("FIX-keep", "wording must be rewritten, not stripped");
  } else if (cleaned.flags.some((f) => f.path === "highlight")) {
    failed += fail("FIX-flag", JSON.stringify(cleaned.flags));
  } else {
    ok("FIX-keep", "wording fixed in place");
  }

  const stripped = applyCritique(
    {
      coverLetter: null,
      flags: [],
      answers: [
        {
          path: "experience",
          type: "experience",
          value: "Principal Engineer at Stripe, grew revenue 40%.",
          confidence: "high",
          source: "resume",
        },
      ],
    },
    {
      ok: false,
      violations: ["Employer Stripe not on resume (experience)"],
      flags: [],
      strippedPaths: ["experience"],
    },
  );
  if (stripped.answers[0]?.value) {
    failed += fail("FIX-strip", `expected empty, got ${stripped.answers[0].value}`);
  } else {
    ok("FIX-strip", "fabrication cleared");
  }

  const afterHeal = critiqueAfterFixes(
    stripped,
    {
      ok: false,
      violations: ["Employer Stripe not on resume (experience)"],
      flags: [],
    },
    evalProfile,
  );
  if (!afterHeal.ok || afterHeal.violations.length) {
    failed += fail("FIX-heal", `stripped lie should not stay a hold: ${JSON.stringify(afterHeal.violations)}`);
  } else {
    ok("FIX-heal", "cleared fabrication is not leftover critique");
  }
  return failed;
}

function assertMatch(id: string, result: MatchResult, c: (typeof matchCases)[number]): string | null {
  if (result.decision !== c.expect) {
    return `decision=${result.decision} expected=${c.expect} score=${result.score}`;
  }
  if (c.expect === "inbox" && result.evidence.length === 0) {
    return "inbox with empty evidence";
  }
  if (c.minScore != null && result.decision === "inbox" && result.score < c.minScore) {
    return `score ${result.score} < ${c.minScore}`;
  }
  if (c.maxScore != null && result.score > c.maxScore) {
    return `score ${result.score} > max ${c.maxScore}`;
  }
  const blob = result.evidence.join(" ").toLowerCase();
  for (const needle of c.evidenceMustInclude ?? []) {
    if (!blob.includes(needle.toLowerCase())) {
      return `evidence missing "${needle}": ${result.evidence.join(" | ")}`;
    }
  }
  return null;
}

function answerByPath(answers: FieldAnswer[], path: string) {
  return answers.find((a) => a.path === path);
}

async function runModelSuite(): Promise<number> {
  if (!isModelConfigured()) {
    console.log("SKIP model cases (VERTEX_PROJECT unset) — hard filters and D1 still ran");
    return 0;
  }

  let failed = 0;
  for (const c of matchCases) {
    const profile = c.profile ?? evalProfile;
    const filtered = hardFilter(c.job, profile);
    if (filtered.skip) {
      if (c.expect === "skip") {
        ok(c.id, `hard skip ${filtered.reason}`);
        continue;
      }
      failed += fail(c.id, `hard-filtered: ${filtered.reason}`);
      continue;
    }
    const result = await matchJob({ profile, resumeText: evalResume, job: c.job });
    const err = assertMatch(c.id, result, c);
    if (err) failed += fail(c.id, err);
    else ok(c.id, `${result.decision} ${result.score}`);
  }

  const match: MatchResult = {
    score: 78,
    decision: "inbox",
    confidence: "high",
    summary: "Eval match stub for drafting Harbor",
    evidence: ["Northline billing API → Harbor TypeScript/Node services"],
    gaps: [],
    skipReason: null,
  };

  const draft = await draftApplication({
    profile: evalProfile,
    resumeText: evalResume,
    job: harborJob,
    match,
    form: harborForm,
  });

  const cover =
    draft.coverLetter ??
    answerByPath(draft.answers, "coverLetter")?.value ??
    "";
  if (!/harbor/i.test(cover) || !/senior software engineer/i.test(cover)) {
    failed += fail("D3", "cover letter missing Harbor or role title");
  } else if (!/northline/i.test(cover)) {
    failed += fail("D3", "cover letter missing Northline proof");
  } else if (cover.split(/\s+/).length > 280) {
    failed += fail("D3", `cover letter ${cover.split(/\s+/).length} words`);
  } else if (/passionate about your mission/i.test(cover)) {
    failed += fail("D3", "generic filler");
  } else if (/revenue 40%|10m arr/i.test(cover)) {
    failed += fail("D3", "metric not on resume");
  } else {
    ok("D3", "cover letter grounded");
  }

  const salary = answerByPath(draft.answers, "expectedCompensation");
  const salaryFlag = draft.flags.find((f) => f.path === "expectedCompensation" && f.required);
  if (salary?.value && /\$|\d{3}/.test(salary.value)) {
    failed += fail("D4", `invented salary ${salary.value}`);
  } else if (salary?.value) {
    failed += fail("D4", `expected null, got ${salary.value}`);
  } else if (!salaryFlag && salary?.value == null) {
    // empty without flag still fails the PRD
    failed += fail("D4", "empty salary without required flag");
  } else {
    ok("D4", "no invented salary");
  }

  const auth = answerByPath(draft.answers, "us_auth");
  if (auth?.value !== "Yes") failed += fail("D5", `got ${auth?.value}`);
  else ok("D5", "exact Yes");

  const years = answerByPath(draft.answers, "ts_years")?.value ?? "";
  const n = parseFloat(years);
  if (years && !Number.isNaN(n) && (n < 5 || n > 10)) {
    failed += fail("D6", `years ${years} implausible`);
  } else if (/15/.test(years)) {
    failed += fail("D6", years);
  } else {
    ok("D6", years || "narrative years");
  }

  const eeoc = answerByPath(draft.answers, "eeoc_race");
  const eeocReq = draft.flags.some((f) => f.path === "eeoc_race" && f.required);
  if (eeoc?.value || eeocReq) failed += fail("D7", JSON.stringify({ eeoc, eeocReq }));
  else ok("D7", "optional EEO empty");

  const widget = answerByPath(draft.answers, "widget_sdk");
  const widgetFlag = draft.flags.find((f) => f.path === "widget_sdk" && f.required);
  if (widget?.value && /widget sdk/i.test(widget.value) && /i (used|built|shipped)/i.test(widget.value)) {
    failed += fail("D8", "invented SDK story");
  } else if (widget?.value) {
    failed += fail("D8", `expected empty, got ${widget.value.slice(0, 80)}`);
  } else if (!widgetFlag) {
    failed += fail("D8", "missing required flag");
  } else {
    ok("D8", "unknown required flagged");
  }

  const notice = answerByPath(draft.answers, "notice");
  const noticeOpts = new Set(["2 weeks", "1 month", "I can start immediately"]);
  if (notice?.value && !noticeOpts.has(notice.value)) {
    failed += fail("D9", `value not in options: ${notice.value}`);
  } else if (notice?.value && !evalProfile.noticePeriod) {
    failed += fail("D9", "invented notice period");
  } else {
    ok("D9", "no fake select");
  }

  const employers = `${cover} ${draft.answers.map((a) => a.value).join(" ")}`;
  if (/google|meta|stripe(?! webhook)/i.test(employers) && /principal engineer at stripe/i.test(employers)) {
    failed += fail("draft-employers", "forbidden employer");
  }

  return failed;
}

function runSkillLayers(): number {
  let failed = 0;
  const match = loadSkill("match-job");
  if (!/timezoneFlexible/.test(match) || !/maxRoleYears/.test(match)) {
    failed += fail("SK-match", "match skill missing seniority / years / timezone rules");
  } else {
    ok("SK-match", "seniority cap, years cap, timezone flexible");
  }
  const classify = loadSkill("classify-questions");
  if (!/why_company/.test(classify) || !/\bbehavioral\b/.test(classify) || !/relevant_experience/.test(classify)) {
    failed += fail("SK-concepts", "classify skill missing narrative concepts");
  } else if (/Ashby native field types|API `field\.type`/.test(classify)) {
    failed += fail("SK-concepts", "classify skill still catalogs ATS field types");
  } else {
    ok("SK-concepts", "why_company / behavioral / relevant_experience");
  }
  const draft = loadSkill("draft-answers");
  if (!/prompt/.test(draft) || !/playbook/.test(draft)) {
    failed += fail("SK-prompt", "draft skill must answer the form prompt; concept is playbook only");
  } else {
    ok("SK-prompt", "prompt vs playbook");
  }
  if (!/master profile/i.test(draft) || !/candidate\/\*\.md/.test(draft)) {
    failed += fail("SK-sources", "draft skill must use the candidate markdown, not only the PDF");
  } else {
    ok("SK-sources", "PDF + master profile markdown");
  }
  try {
    const widgets = loadSkill("fill-widgets");
    if (!/inputKind/.test(widgets)) failed += fail("SK-widgets", "fill-widgets missing inputKind");
    else ok("SK-widgets", "widget layer");
  } catch (err) {
    failed += fail("SK-widgets", err instanceof Error ? err.message : String(err));
  }
  const wording = loadSkill("wording");
  if (
    !/\bC1\b/.test(wording) ||
    !/semicolon/.test(wording) ||
    !/genuinely/.test(wording) ||
    !/automated application/.test(wording)
  ) {
    failed += fail("SK-wording", "wording skill missing natural-tone / anti-automation rules");
  } else {
    ok("SK-wording", "natural tone, C1, no AI trace");
  }
  return failed;
}

async function main() {
  let failed = 0;
  failed += runSkillLayers();
  failed += runHardFilters();
  failed += runIdentity();
  failed += runCandidateSources();
  failed += runResumePrefill();
  failed += runPrefillLogistics();
  failed += runSubmitDetect();
  failed += runRetryable();
  failed += runSubmitGuard();
  failed += runJsonAndRadios();
  failed += runApplyUrls();
  failed += runPlantedLie();
  failed += runWordingScan();
  failed += runCritiqueFix();
  failed += await runModelSuite();
  if (failed) {
    console.error(`${failed} failure(s)`);
    process.exitCode = 1;
  } else {
    console.log("eval suite passed");
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
