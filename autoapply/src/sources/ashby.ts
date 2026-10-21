/**
 * Ashby adapter (Layer 3). Maps the public board + apply page into NormalizedJob / ApplyForm.
 * Question concepts and widget value rules live in agent/skills, not here.
 * See docs/prd/sources.md and docs/prd/sources-ashby.md.
 */
import { createHash } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { chromium, type Locator, type Page, type Response } from "playwright";
import { config } from "../config.js";
import {
  browseLikePerson,
  clickLikePerson,
  dwellBeforeSubmit,
  withSubmitPage,
} from "../lib/chromeSubmit.js";
import { sleep } from "../lib/time.js";
import { isConsentPrompt, isMarketingOptInPrompt } from "../lib/consent.js";
import type {
  ApplyField,
  ApplyForm,
  ApplyPayload,
  BoardRef,
  JobSource,
  NormalizedJob,
  SubmitResult,
} from "./types.js";

type AshbyJob = {
  id?: string;
  title?: string;
  location?: string;
  department?: string;
  team?: string;
  isListed?: boolean;
  isRemote?: boolean;
  workplaceType?: string;
  descriptionHtml?: string;
  descriptionPlain?: string;
  employmentType?: string;
  jobUrl?: string;
  applyUrl?: string;
  publishedAt?: string;
  updatedAt?: string;
  compensation?: {
    compensationTierSummary?: string;
    scrapeableCompensationSalarySummary?: string;
  };
};

type AshbyBoard = {
  jobs?: AshbyJob[];
};

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function jobId(slug: string, job: AshbyJob): string {
  const fromUrl = job.jobUrl || job.applyUrl || "";
  const match = fromUrl.match(/\/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i);
  if (job.id) return String(job.id);
  if (match) return match[1];
  const key = `${slug}|${job.title ?? ""}|${job.jobUrl ?? job.applyUrl ?? ""}`;
  return createHash("sha256").update(key).digest("hex").slice(0, 24);
}

function compensationSummary(job: AshbyJob): string | null {
  const c = job.compensation;
  if (!c) return null;
  return c.scrapeableCompensationSalarySummary || c.compensationTierSummary || null;
}

function jitter(ms: number): number {
  return Math.round(ms + Math.random() * ms * 0.35);
}

const UUID_PAIR_RE =
  /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;

/** Ashby radio `name` is `{formInstance}_{questionId}`. The form instance changes every load. */
export function radioQuestionId(path: string): string {
  const m = path.match(UUID_PAIR_RE);
  return m ? m[2] : path;
}

export function ashbyQuestionLooksRequired(className: string, text = ""): boolean {
  if (/required/i.test(className)) return true;
  return /\*\s*$/.test(text.trim());
}

export function fieldForAnswer(fields: ApplyField[], path: string, label?: string): ApplyField | undefined {
  const exact = fields.find((f) => f.path === path);
  if (exact) return exact;
  const norm = (s: string) => s.replace(/\s+/g, " ").trim();
  const needle = norm(label || "");
  if (needle) {
    const byLabel = fields.find((f) => norm(f.label) === needle);
    if (byLabel) return byLabel;
  }
  const byPathLabel = fields.find((f) => norm(f.label) === norm(path));
  if (byPathLabel) return byPathLabel;
  const question = radioQuestionId(path);
  return fields.find((f) => {
    const id = radioQuestionId(f.path);
    return id === question || f.path === question || path.endsWith(`_${id}`) || f.path.endsWith(`_${question}`);
  });
}

async function withExtractPage<T>(fn: (page: Page) => Promise<T>): Promise<T> {
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({
      viewport: { width: 1280, height: 900 },
    });
    page.setDefaultTimeout(45_000);
    return await fn(page);
  } finally {
    await browser.close();
  }
}

async function withPage<T>(fn: (page: Page) => Promise<T>, opts?: { submit?: boolean }): Promise<T> {
  return opts?.submit ? withSubmitPage(fn) : withExtractPage(fn);
}

async function typeLikePerson(page: Page, target: Locator, value: string): Promise<void> {
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click({ timeout: 8_000 });
  await sleep(jitter(120));
  await target.press("ControlOrMeta+A").catch(() => undefined);
  const delay = value.length > 120 ? jitter(10) : jitter(28);
  await target.pressSequentially(value, { delay });
}

export function isAshbySpamFlag(message: string | null | undefined): boolean {
  return /flagged as possible spam|possible spam/i.test(message ?? "");
}

function shotPath(kind: string, id: string): string {
  return path.join(config.dataDir, "screenshots", `${kind}-${id}.png`);
}

export class ApplyPageMissingError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApplyPageMissingError";
  }
}

/** Public careers site when jobs.ashbyhq.com/{slug} is a dead hosted page. */
const DEFAULT_CAREERS: Record<string, string> = {
  cursor: "https://cursor.com/careers",
};

export function titleToCareersSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function applyUrlCandidates(job: NormalizedJob, careersUrl?: string | null): string[] {
  const urls: string[] = [];
  const add = (raw?: string | null) => {
    if (!raw) return;
    const url = raw.trim();
    if (url && !urls.includes(url)) urls.push(url);
  };
  if (job.applyUrl && !/ashbyhq\.com/i.test(job.applyUrl)) add(job.applyUrl);
  if (careersUrl) {
    const base = careersUrl.replace(/\/$/, "");
    const slug = titleToCareersSlug(job.title);
    add(`${base}/${slug}`);
    add(`${base}/${slug}#apply`);
  }
  add(job.applyUrl);
  add(job.jobUrl);
  if (job.jobUrl && !/\/application\/?$/i.test(job.jobUrl)) {
    add(`${job.jobUrl.replace(/\/$/, "")}/application`);
  }
  if (job.applyUrl && /\/application\/?$/i.test(job.applyUrl)) {
    add(job.applyUrl.replace(/\/application\/?$/i, ""));
  }
  return urls;
}

export function keepRecoveredApplyUrl(stored: string | null | undefined, incoming: string): string {
  if (!stored) return incoming;
  try {
    const have = new URL(stored);
    const next = new URL(incoming);
    if (/ashbyhq\.com$/i.test(next.hostname) && !/ashbyhq\.com$/i.test(have.hostname)) {
      return stored;
    }
  } catch {
    return incoming;
  }
  return incoming;
}

function careersUrlFor(slug: string): string | null {
  return DEFAULT_CAREERS[slug] ?? null;
}

function jsonStrings(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") {
    out.push(value);
    return out;
  }
  if (Array.isArray(value)) {
    for (const item of value) jsonStrings(item, out);
    return out;
  }
  if (value && typeof value === "object") {
    for (const item of Object.values(value as Record<string, unknown>)) jsonStrings(item, out);
  }
  return out;
}

export function applyFormStillOpen(text: string): boolean {
  return /submit application/i.test(text) && /autofill from resume|personal info/i.test(text);
}

/** True only for confirmation copy, not the job-post header or a still-open apply form. */
export function applicationLooksSubmitted(text: string): boolean {
  if (isAshbySpamFlag(text) || applyFormStillOpen(text)) return false;
  return /thank you for (applying|your application)|thanks for (applying|your application)|application (has been )?(received|submitted|sent)|we('ve| have) received your application|successfully submitted|your application was (received|submitted)|your application has been submitted/i.test(
    text,
  );
}

export function graphqlLooksSubmitted(payload: unknown): boolean {
  if (!payload || typeof payload !== "object") return false;
  const raw = JSON.stringify(payload);
  if (isAshbySpamFlag(raw) || /"blocked"\s*:\s*true/.test(raw)) return false;
  return /"submittedFormInstance"\s*:\s*\{/.test(raw) || /"applicationId"\s*:\s*"/.test(raw);
}

export function isAshbyGraphqlOp(url: string, postData: string | null | undefined, op: string): boolean {
  if (url.includes(`op=${encodeURIComponent(op)}`) || url.includes(`op=${op}`)) return true;
  return Boolean(postData && postData.includes(`"operationName":"${op}"`));
}

export function graphqlErrorMessage(payload: unknown): string | null {
  if (!payload || typeof payload !== "object") return null;
  const spam = jsonStrings(payload).find((s) => isAshbySpamFlag(s));
  if (spam) return spam;
  const root = payload as Record<string, unknown>;
  if (Array.isArray(root.errors) && root.errors.length) {
    const top = root.errors
      .map((e) =>
        e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : "",
      )
      .filter(Boolean);
    if (top.length) return top.join("; ");
  }
  const data = root.data;
  if (!data || typeof data !== "object") return null;
  for (const value of Object.values(data as Record<string, unknown>)) {
    if (!value || typeof value !== "object") continue;
    const v = value as Record<string, unknown>;
    const nested = Array.isArray(v.errors)
      ? v.errors
          .map((e) =>
            typeof e === "string"
              ? e
              : e && typeof e === "object" && "message" in e
                ? String((e as { message: unknown }).message)
                : "",
          )
          .filter(Boolean)
      : [];
    if (v.blocked === true) return nested.join("; ") || "Ashby blocked the application";
    if (v.success === false || nested.length) {
      return nested.join("; ") || "Ashby rejected the submit";
    }
  }
  return null;
}

function waitForGraphqlOp(page: Page, op: string, timeout: number): Promise<Response> {
  return page.waitForResponse(
    (res) => isAshbyGraphqlOp(res.url(), res.request().postData(), op),
    { timeout },
  );
}

async function readGraphqlPayload(res: Response): Promise<unknown> {
  return res.json().catch(() => null);
}

export function formatUnconfirmedSubmit(url: string, regionText: string): string {
  const snippet = regionText.replace(/\s+/g, " ").trim().slice(0, 280);
  return `Unconfirmed submit. URL ${url}. Form: ${snippet || "(empty)"}`;
}

export function formatSubmitValidation(
  invalid: Array<{ name?: string; label?: string; validation?: string }>,
): string {
  const bits = invalid.map((item) => {
    const name = item.label || item.name || "field";
    return item.validation ? `${name} (${item.validation})` : name;
  });
  return `Submit blocked by validation: ${bits.join("; ")}`;
}

export function parseMissingRequiredLabels(error: string): string[] {
  const out: string[] = [];
  const re = /Missing entry for required field:\s*([^;]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(error))) {
    const label = m[1].replace(/\s+/g, " ").trim();
    if (label && !out.some((x) => x.toLowerCase() === label.toLowerCase())) out.push(label);
  }
  return out;
}

export function fieldForMissingLabel(fields: ApplyField[], label: string): ApplyField | undefined {
  const n = label.replace(/\s+/g, " ").trim().toLowerCase();
  if (!n) return undefined;
  return fields.find((f) => {
    const fl = f.label.replace(/\s+/g, " ").trim().toLowerCase();
    return fl === n || fl.includes(n) || (n.length > 12 && n.includes(fl));
  });
}

export function shouldRetryMissingRequired(error: string): boolean {
  if (!error) return false;
  if (isAshbySpamFlag(error)) return false;
  if (/unconfirmed submit/i.test(error)) return false;
  return /missing entry for required field|your form needs corrections/i.test(error);
}

function formLocator(page: Page) {
  return page.locator(
    "input:not([type=hidden]):not([type=submit]):not([type=button]), textarea, select, [role='combobox']",
  );
}

async function waitForForm(page: Page, timeout: number): Promise<boolean> {
  try {
    await formLocator(page).first().waitFor({ state: "visible", timeout });
    return true;
  } catch {
    return false;
  }
}

async function dismissCookies(page: Page): Promise<void> {
  const cookie = page.getByRole("button", { name: /accept all|accept cookies|i agree|got it/i });
  if ((await cookie.count()) > 0) {
    await cookie.first().click().catch(() => undefined);
  }
}

async function clickApplyControls(page: Page): Promise<boolean> {
  const candidates = [
    page.getByRole("link", { name: /^apply/i }),
    page.getByRole("button", { name: /^(apply|start application|apply now)/i }),
    page.locator("a[href*='#apply'], a[href*='/application']"),
  ];
  for (const loc of candidates) {
    if ((await loc.count()) > 0) {
      await loc.first().click().catch(() => undefined);
      return true;
    }
  }
  return false;
}

async function tryOpenUrl(page: Page, url: string): Promise<boolean> {
  await page.goto(url, { waitUntil: "domcontentloaded" });
  await dismissCookies(page);
  const formVisible = formLocator(page).first();
  const notFound = page.getByText("Page not found", { exact: true });
  const winner = await Promise.race([
    formVisible.waitFor({ state: "visible", timeout: 8_000 }).then(() => "form" as const),
    notFound.waitFor({ state: "visible", timeout: 8_000 }).then(() => "notfound" as const),
  ]).catch(() => "timeout" as const);
  if (winner === "form") return true;
  if (winner === "notfound") return false;
  await clickApplyControls(page);
  return waitForForm(page, 10_000);
}

async function openApplyPage(page: Page, job: NormalizedJob): Promise<void> {
  const careersUrl = careersUrlFor(job.companySlug);
  const urls = applyUrlCandidates(job, careersUrl);
  for (const url of urls) {
    if (await tryOpenUrl(page, url)) {
      await sleep(800);
      return;
    }
  }
  if (careersUrl) {
    await page.goto(careersUrl, { waitUntil: "domcontentloaded" });
    await dismissCookies(page);
    const link = page.getByRole("link", { name: job.title, exact: true });
    if ((await link.count()) > 0) {
      await link.first().click().catch(() => undefined);
      if (await waitForForm(page, 6_000)) {
        await sleep(800);
        return;
      }
      await clickApplyControls(page);
      if (await waitForForm(page, 10_000)) {
        await sleep(800);
        return;
      }
    }
  }
  throw new ApplyPageMissingError(
    `Apply page not found for ${job.title} (${job.applyUrl})`,
  );
}

async function collectFields(page: Page): Promise<ApplyField[]> {
  return page.evaluate(`(() => {
    const clip = (s) => (s || "").replace(/\\s+/g, " ").trim().slice(0, 2000);
    const slugify = (label, index) => {
      const base = (label || "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
        .slice(0, 48);
      return base || ("field-" + index);
    };
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const uuidPair = /^([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})_([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})/i;
    const radioGroupKey = (el, index) => {
      const name = el.name || "";
      const pair = name.match(uuidPair);
      if (pair) return pair[2];
      if (name) return name;
      const idPair = (el.id || "").match(uuidPair);
      if (idPair) return idPair[2];
      return el.id || ("radio-" + index);
    };

    const labelFor = (el) => {
      const id = el.getAttribute("id");
      if (id) {
        const lab = document.querySelector('label[for="' + CSS.escape(id) + '"]');
        if (lab && lab.textContent && clip(lab.textContent)) return clip(lab.textContent);
      }
      const wrap = el.closest("label");
      if (wrap && wrap.textContent && clip(wrap.textContent).length < 400) return clip(wrap.textContent);
      const aria = el.getAttribute("aria-label");
      if (aria) return clip(aria);
      const described = el.getAttribute("aria-describedby");
      if (described) {
        const bits = described.split(/\\s+/).map((did) => {
          const n = document.getElementById(did);
          return clip(n && n.textContent ? n.textContent : "");
        }).filter(Boolean);
        if (bits.length) return bits.join(" ");
      }
      const block = el.closest("fieldset, [role='group'], li, section, [class*='field'], [class*='Field']");
      const heading = block && block.querySelector("legend, h2, h3, h4, p, label, [class*='label'], [class*='Label']");
      let t = heading && heading.textContent ? clip(heading.textContent) : "";
      if (!t || uuid.test(t) || t.length < 2) {
        const prev = el.previousElementSibling;
        t = prev && prev.textContent ? clip(prev.textContent) : t;
      }
      return t;
    };

    const titleLooksRequired = (title) => {
      if (!title) return false;
      if (/required/i.test(title.className || "")) return true;
      if (title.querySelector('[aria-label="required"]')) return true;
      return /\\*\\s*$/.test(clip(title.textContent || ""));
    };

    const questionTitleFor = (el) => {
      const group = el.closest(
        "fieldset, .ashby-application-form-input-checkbox-group, .ashby-application-form-field-entry, [class*='fieldEntry']",
      );
      if (group) {
        const title = group.querySelector(".ashby-application-form-question-title, [class*='question-title']");
        if (title) return title;
      }
      const ids = [el.id, el.name].filter(Boolean);
      const titles = Array.from(document.querySelectorAll(".ashby-application-form-question-title, [class*='question-title']"));
      return titles.find((title) => {
        const forId = title.getAttribute("for") || "";
        return Boolean(forId && ids.some((id) => id === forId || (id && id.indexOf(forId) >= 0)));
      }) || null;
    };

    const requiredOf = (el) => {
      if (
        el.hasAttribute("required") ||
        el.getAttribute("aria-required") === "true" ||
        Boolean(el.closest("[data-required='true']"))
      ) {
        return true;
      }
      return titleLooksRequired(questionTitleFor(el));
    };

    const visibleOption = (r) => {
      if (r.id) {
        const lab = document.querySelector('label[for="' + CSS.escape(r.id) + '"]');
        if (lab && lab.textContent) {
          const t = clip(lab.textContent);
          if (t && t.length < 400) return t;
        }
      }
      const wrap = r.closest("label");
      if (wrap && wrap.querySelectorAll('input[type="radio"]').length <= 1) {
        const t = clip(wrap.textContent);
        if (t) return t;
      }
      const aria = r.getAttribute("aria-label");
      if (aria) return clip(aria);
      if (r.value && r.value !== "on" && !uuid.test(r.value)) return r.value;
      let n = r.nextSibling;
      let bits = "";
      while (n && bits.length < 400) {
        if (n.nodeType === 1 && n.matches && n.matches("input, button")) break;
        bits += n.textContent || "";
        n = n.nextSibling;
      }
      return clip(bits);
    };

    const fields = [];
    const seen = new Set();
    const radioSeen = new Set();

    const push = (field) => {
      if (seen.has(field.path)) return;
      if (/autofill from resume/i.test(field.label)) return;
      seen.add(field.path);
      field.options = Array.from(new Set((field.options || []).filter(Boolean)));
      fields.push(field);
    };

    const root = document.querySelector("form") || document.getElementById("apply") || document;
    const nodes = Array.from(root.querySelectorAll("input, textarea, select, [role='combobox'], [aria-haspopup='listbox']"));
    nodes.forEach((el, index) => {
      const tag = el.tagName.toLowerCase();
      const type = (el.type || tag).toLowerCase();
      const role = el.getAttribute("role") || "";
      const nameHint = (el.name || "") + " " + (el.id || "") + " " + (el.className || "");
      if (/recaptcha|hcaptcha|turnstile|cf-challenge/i.test(nameHint)) return;
      if (
        ["hidden", "submit", "button", "reset", "image"].includes(type) &&
        role !== "combobox" &&
        el.getAttribute("aria-haspopup") !== "listbox"
      ) {
        return;
      }

      if (type === "radio") {
        const group = radioGroupKey(el, index);
        if (radioSeen.has(group)) return;
        radioSeen.add(group);
        const radios = Array.from(root.querySelectorAll('input[type="radio"]')).filter((r) => radioGroupKey(r, 0) === group);
        const options = radios.map(visibleOption).filter(Boolean);
        const block = el.closest("fieldset, [role='radiogroup'], li, section, [class*='question'], [class*='Question'], [class*='field']");
        const legend = el.closest("fieldset") && el.closest("fieldset").querySelector("legend");
        const namedLabel = el.name ? root.querySelector('label[for="' + CSS.escape(el.name) + '"]') : null;
        const heading = block && block.querySelector(".ashby-application-form-question-title, legend, h2, h3, h4, p, [class*='title'], [class*='Title']");
        let groupLabel = clip((legend && legend.textContent) || (namedLabel && namedLabel.textContent) || (heading && heading.textContent) || "");
        groupLabel = groupLabel.replace(/\\s*\\*\\s*$/, "").trim();
        if (!groupLabel || /^(yes|no)$/i.test(groupLabel) || options.includes(groupLabel)) {
          const fallback = clip(labelFor(el));
          if (fallback && !/^(yes|no)$/i.test(fallback) && !options.includes(fallback)) groupLabel = fallback;
        }
        if (!groupLabel || options.includes(groupLabel) || /^(yes|no)$/i.test(groupLabel)) {
          groupLabel = group;
        }
        const groupRequired =
          radios.some(requiredOf) ||
          Boolean(block && block.getAttribute && block.getAttribute("aria-required") === "true") ||
          Boolean(block && block.querySelector("[aria-label='required'], [class*='required']:not(input):not(textarea)")) ||
          Boolean(namedLabel && namedLabel.querySelector('[aria-label="required"]')) ||
          /\\*\\s*$/.test(clip((namedLabel && namedLabel.textContent) || (heading && heading.textContent) || ""));
        push({
          path: group,
          label: groupLabel || group,
          required: groupRequired,
          inputKind: "radio",
          options,
        });
        return;
      }

      const yesnoRoot = el.closest(".ashby-application-form-input-yesno") ||
        (el.parentElement && el.parentElement.querySelector("button[data-option='yes']") && el.parentElement);
      if (type === "checkbox" && yesnoRoot) {
        let lab = (labelFor(el) || "").replace(/\\s*Yes\\s*No\\s*$/i, "").trim();
        if (!lab) {
          const block = el.closest("li, section, [class*='field'], [class*='Field']");
          const heading = block && block.querySelector("p, label, h3, h4, legend, [class*='label']");
          lab = heading && heading.textContent ? clip(heading.textContent).replace(/\\s*Yes\\s*No\\s*$/i, "").trim() : "";
        }
        const path = el.name || el.id || slugify(lab, index);
        if (!el.name && !el.id) el.setAttribute("data-aa-path", path);
        push({
          path,
          label: lab || path,
          required: requiredOf(el),
          inputKind: "radio",
          options: ["Yes", "No"],
        });
        return;
      }

      if (type === "file" && !el.name && !el.id && !labelFor(el)) return;

      let label = (labelFor(el) || "").replace(/\\s*Yes\\s*No\\s*$/i, "").trim();
      let name = el.name || el.id || slugify(label, index);
      if (!el.name && !el.id) el.setAttribute("data-aa-path", name);
      let inputKind = "text";
      let options = [];

      if (tag === "textarea") inputKind = "textarea";
      else if (tag === "select") {
        inputKind = el.multiple ? "multiselect" : "select";
        options = Array.from(el.options)
          .map((o) => clip(o.textContent || o.value || ""))
          .filter((o) => o && o.toLowerCase() !== "select");
      } else if (role === "combobox" || el.getAttribute("aria-haspopup") === "listbox") {
        inputKind = el.getAttribute("aria-autocomplete") === "list" ? "text" : "select";
      } else if (type === "file") inputKind = "file";
      else if (type === "checkbox") {
        inputKind = "checkbox";
        const opt = visibleOption(el);
        options = opt && opt !== label && !/^yesno$/i.test(opt) ? [opt] : [];
      } else if (type === "date") inputKind = "date";
      else if (type === "number") inputKind = "number";

      push({
        path: name,
        label: label || name,
        required: requiredOf(el),
        inputKind,
        options,
      });
    });

    return fields;
  })()`) as Promise<ApplyField[]>;
}

async function harvestComboboxOptions(page: Page, fields: ApplyField[]): Promise<void> {
  for (const field of fields) {
    if (field.inputKind !== "select" || field.options.length > 0) continue;
    const loc = await resolveLocator(page, field);
    if (!loc) continue;
    try {
      await loc.first().click({ timeout: 2_000 });
      await page.waitForSelector("[role='option'], [role='listbox'] li", { timeout: 2_500 });
      const texts = await page.locator("[role='option'], [role='listbox'] li").allTextContents();
      field.options = Array.from(
        new Set(texts.map((t) => t.replace(/\s+/g, " ").trim()).filter((t) => t && t.length < 200)),
      );
      await page.keyboard.press("Escape");
      await sleep(150);
    } catch {
      await page.keyboard.press("Escape").catch(() => undefined);
    }
  }
}

function locatorFor(page: Page, field: Pick<ApplyField, "path" | "label">): Locator {
  const pathName = field.path.replace(/"/g, '\\"');
  return page.locator(
    [
      `input[name="${pathName}"]`,
      `textarea[name="${pathName}"]`,
      `select[name="${pathName}"]`,
      `input[id="${pathName}"]`,
      `textarea[id="${pathName}"]`,
      `select[id="${pathName}"]`,
      `[role="combobox"][name="${pathName}"]`,
      `[role="combobox"][id="${pathName}"]`,
      `[aria-haspopup="listbox"][name="${pathName}"]`,
      `[aria-haspopup="listbox"][id="${pathName}"]`,
      `[data-aa-path="${pathName}"]`,
    ].join(", "),
  );
}

async function resolveLocator(page: Page, field: Pick<ApplyField, "path" | "label">): Promise<Locator | null> {
  const loc = locatorFor(page, field);
  if ((await loc.count()) > 0) return loc;
  const label = field.label.replace(/\s*\*\s*$/, "").trim();
  if (!label) return null;
  const byLabel = page.getByLabel(label, { exact: false });
  if ((await byLabel.count()) > 0) return byLabel;
  const byCombo = page.getByRole("combobox", { name: label, exact: false });
  if ((await byCombo.count()) > 0) return byCombo;
  const near = page
    .locator("li, section, [class*='field'], [class*='Field']")
    .filter({ hasText: label })
    .locator("input:not([type=hidden]), textarea, select, [role='combobox']")
    .first();
  if ((await near.count()) > 0) return near;
  return null;
}

async function fillCombobox(page: Page, target: Locator, value: string, human = false): Promise<void> {
  await target.scrollIntoViewIfNeeded().catch(() => undefined);
  await target.click();
  if (human) {
    await sleep(jitter(160));
    await typeLikePerson(page, target, value);
  } else {
    await target.fill("");
    await target.fill(value);
  }
  await page
    .getByRole("option")
    .first()
    .waitFor({ timeout: 2_500 })
    .catch(() => undefined);
  const option = page.getByRole("option", { name: value, exact: false }).first();
  if ((await option.count()) > 0) {
    await option.click();
    return;
  }
  await page.keyboard.press("Enter");
}

function optionCandidates(value: string): string[] {
  const v = value.trim();
  const out = [v];
  if (/^(yes|true|1)$/i.test(v)) out.push("Yes", "true", "yes");
  if (/^(no|false|0)$/i.test(v)) out.push("No", "false", "no");
  return [...new Set(out)];
}

async function clickYesNoForField(page: Page, field: ApplyField, value: string, force = false): Promise<boolean> {
  const opt = /^(yes|true|1)$/i.test(value) ? "yes" : /^(no|false|0)$/i.test(value) ? "no" : "";
  if (!opt) return false;
  const other = opt === "yes" ? "no" : "yes";
  const label = field.label.replace(/\s*\*\s*$/, "").trim().slice(0, 90);
  const blocks = page.locator(
    ".ashby-application-form-field-entry, [class*='fieldEntry'], fieldset, .ashby-application-form-input-yesno",
  );
  const block = label
    ? blocks.filter({ hasText: label }).first()
    : page.locator(".ashby-application-form-input-yesno").first();
  if ((await block.count()) === 0) return false;
  const btn = block.locator(`button[data-option="${opt}"]`);
  if ((await btn.count()) === 0) return false;
  const pressed = (await btn.first().getAttribute("aria-pressed")) === "true";
  if (!force && pressed) return true;
  if (force) {
    const otherBtn = block.locator(`button[data-option="${other}"]`);
    if ((await otherBtn.count()) > 0) {
      await otherBtn.first().click();
      await sleep(160);
    }
  }
  const box = await btn.first().boundingBox();
  if (box) await clickLikePerson(page, box);
  else await btn.first().click();
  return true;
}

async function clickRadioOption(page: Page, field: ApplyField, value: string, force = false): Promise<boolean> {
  if (await clickYesNoForField(page, field, value, force)) return true;

  const question = radioQuestionId(field.path);
  const pathName = field.path.replace(/"/g, '\\"');
  const q = question.replace(/"/g, '\\"');
  const opt = /^(yes|true|1)$/i.test(value) ? "yes" : /^(no|false|0)$/i.test(value) ? "no" : "";

  const yesnoRoot = page
    .locator(
      `input[name="${pathName}"], input[id="${pathName}"], input[name$="_${q}"], input[name="${q}"], [data-aa-path="${pathName}"]`,
    )
    .first()
    .locator("xpath=ancestor::*[contains(@class,'yesno') or contains(@class,'YesNo') or contains(@class,'field') or self::li or self::section or self::fieldset][1]");
  if (opt && (await yesnoRoot.count()) > 0) {
    const btn = yesnoRoot.locator(`button[data-option="${opt}"]`);
    if ((await btn.count()) > 0) {
      if (force) {
        const other = opt === "yes" ? "no" : "yes";
        const otherBtn = yesnoRoot.locator(`button[data-option="${other}"]`);
        if ((await otherBtn.count()) > 0) {
          await otherBtn.first().click();
          await sleep(160);
        }
      }
      await btn.first().click();
      return true;
    }
  }
  if (opt) {
    const near = page.locator(`button[data-option="${opt}"]`);
    if ((await near.count()) === 1) {
      if (force) {
        const other = opt === "yes" ? "no" : "yes";
        const otherBtn = page.locator(`button[data-option="${other}"]`);
        if ((await otherBtn.count()) === 1) {
          await otherBtn.click();
          await sleep(160);
        }
      }
      await near.click();
      return true;
    }
  }

  for (const candidate of optionCandidates(value)) {
    const optionLabel = page.locator(
      "label.ashby-application-form-input-radio-group-option-label, .ashby-application-form-input-radio-group-option label",
    ).filter({ hasText: candidate });
    if ((await optionLabel.count()) > 0) {
      await optionLabel.first().click();
      return true;
    }
    const row = page.locator(".ashby-application-form-input-radio-group-option").filter({ hasText: candidate });
    if ((await row.count()) > 0) {
      await row.first().click();
      return true;
    }
  }

  const radios = page.locator(
    [
      `input[type="radio"][name="${pathName}"]`,
      `input[type="radio"][name$="_${q}"]`,
      `input[type="radio"][name="${q}"]`,
      `input[type="radio"][id*="${q}"]`,
    ].join(", "),
  );
  for (const candidate of optionCandidates(value)) {
    if ((await radios.count()) > 0) {
      const wrap = radios.locator("xpath=following-sibling::label[1] | ancestor::label[1]").filter({
        hasText: new RegExp(candidate.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i"),
      });
      if ((await wrap.count()) > 0) {
        await wrap.first().click();
        return true;
      }
    }
    if (candidate.length > 12) {
      const byText = page.getByText(candidate, { exact: true });
      if ((await byText.count()) > 0) {
        await byText.first().click();
        return true;
      }
    }
  }

  const byName = page.getByRole("radio", { name: value, exact: false });
  if ((await byName.count()) > 0) {
    const forId = await byName.first().getAttribute("id");
    if (forId) {
      const lab = page.locator(`label[for="${forId.replace(/"/g, '\\"')}"]`);
      if ((await lab.count()) > 0) {
        await lab.first().click();
        return true;
      }
    }
    await byName.first().click({ force: true });
    return true;
  }
  return false;
}

async function ensureCheckbox(
  click: () => Promise<void>,
  checked: boolean,
  on: boolean,
  force: boolean,
): Promise<void> {
  if (checked === on && !(force && on)) return;
  if (checked === on && force && on) {
    await click();
    await sleep(160);
    await click();
    return;
  }
  await click();
}

async function clickCheckbox(page: Page, field: ApplyField, on: boolean, force = false): Promise<void> {
  const snippet = field.label.replace(/\s*\*\s*$/, "").trim();
  const optionLabel = snippet
    ? page.locator("label.ashby-application-form-input-checkbox-group-option-label").filter({
        hasText: snippet.slice(0, 80),
      })
    : null;
  if (optionLabel && (await optionLabel.count()) > 0) {
    const option = optionLabel.first().locator(
      "xpath=ancestor::*[contains(@class,'checkbox-group-option')][1]",
    );
    const box = option.locator("input[type='checkbox']").first();
    const checked = (await box.count()) > 0 ? await box.isChecked().catch(() => false) : false;
    await ensureCheckbox(() => optionLabel.first().click(), checked, on, force);
    return;
  }

  const loc = await resolveLocator(page, field);
  const byRole = snippet ? page.getByRole("checkbox", { name: snippet.slice(0, 80), exact: false }) : null;
  const inBlock = snippet
    ? page
        .locator("li, section, fieldset, [class*='field'], [class*='Field'], [class*='checkbox-group']")
        .filter({ hasText: snippet.slice(0, 80) })
        .locator("input[type='checkbox']")
        .first()
    : null;
  const byPath = locatorFor(page, field).locator(
    "xpath=self::input[@type='checkbox'] | descendant::input[@type='checkbox']",
  );
  const target =
    loc && (await loc.count()) > 0
      ? loc.first()
      : byRole && (await byRole.count()) > 0
        ? byRole.first()
        : inBlock && (await inBlock.count()) > 0
          ? inBlock
          : (await byPath.count()) > 0
            ? byPath.first()
            : null;
  if (!target) {
    if (on && snippet.length > 12) {
      const text = page.getByText(snippet.slice(0, 80), { exact: false }).first();
      if ((await text.count()) > 0) {
        await text.click();
        return;
      }
    }
    if (field.required || on) throw new Error(`Could not find checkbox ${field.label || field.path}`);
    return;
  }
  const checked = await target.isChecked().catch(() => false);
  const forId = await target.getAttribute("id");
  const labeled = forId
    ? page.locator(
        `label.ashby-application-form-input-checkbox-group-option-label[for="${forId.replace(/"/g, '\\"')}"], label[for="${forId.replace(/"/g, '\\"')}"]`,
      )
    : null;
  const wrap = target.locator("xpath=ancestor::label[1]");
  const click = async () => {
    if (labeled && (await labeled.count()) > 0) {
      await labeled.first().click();
      return;
    }
    if ((await wrap.count()) > 0) {
      await wrap.first().click();
      return;
    }
    await target.click({ force: true });
  };
  await ensureCheckbox(click, checked, on, force);
}

async function refillAnswers(
  page: Page,
  answers: Array<{ path: string; label?: string; value: string | null }>,
  live: ApplyField[],
  force: boolean,
): Promise<void> {
  for (const answer of answers) {
    if (answer.value == null || answer.value === "" || answer.value === "{{resume}}") continue;
    const field = fieldForAnswer(live, answer.path, answer.label);
    if (!field || field.inputKind === "file") continue;
    if (field.inputKind !== "radio" && field.inputKind !== "checkbox") continue;
    try {
      await fillField(page, field, answer.value, true, force);
      await sleep(jitter(160));
    } catch {
      /* retry pass is best-effort */
    }
  }
}

async function refillMissingRequired(
  page: Page,
  answers: Array<{ path: string; label?: string; value: string | null }>,
  error: string,
): Promise<boolean> {
  const labels = parseMissingRequiredLabels(error);
  if (!labels.length) return false;
  const live = await collectFields(page);
  let touched = 0;
  for (const label of labels) {
    const field = fieldForMissingLabel(live, label);
    if (!field || field.inputKind === "file") continue;
    const value = answerValueForField(answers, field);
    if (!value) continue;
    try {
      await fillField(page, field, value, true, true);
      touched += 1;
      await sleep(jitter(200));
    } catch {
      /* keep trying other missing fields */
    }
  }
  return touched > 0;
}

async function retickRequiredConsent(page: Page): Promise<void> {
  const live = await collectFields(page);
  for (const field of live) {
    if (field.inputKind !== "checkbox" || !field.required) continue;
    if (!isConsentPrompt(field.label, field.path) && !isMarketingOptInPrompt(field.label, field.path)) continue;
    try {
      await fillField(page, field, "true", true, true);
    } catch {
      /* consent box already handled or not visible */
    }
  }
}

function answerValueForField(
  answers: Array<{ path: string; label?: string; value: string | null }>,
  field: ApplyField,
): string | null {
  const hit = answers.find((a) => {
    if (a.value == null || a.value === "") return false;
    if (fieldForAnswer([field], a.path, a.label)) return true;
    const al = (a.label || "").replace(/\s+/g, " ").trim().toLowerCase();
    const fl = field.label.replace(/\s+/g, " ").trim().toLowerCase();
    return Boolean(al && fl && (fl.includes(al) || al.includes(fl)));
  });
  if (hit?.value) return hit.value;
  if (field.inputKind === "checkbox" && field.required) return "true";
  return null;
}

async function fillField(page: Page, field: ApplyField, value: string, human = false, force = false): Promise<void> {
  const kind = field.inputKind;
  if (kind === "radio") {
    if (human) await sleep(jitter(180));
    if (await clickRadioOption(page, field, value, force)) return;
    throw new Error(`Could not select radio "${value}" for ${field.label || field.path}`);
  }

  if (kind === "checkbox") {
    const on = /^(yes|true|1|on)$/i.test(value) || value.toLowerCase() === field.label.toLowerCase();
    await clickCheckbox(page, field, on, force);
    return;
  }

  const loc = await resolveLocator(page, field);
  if (!loc) {
    if (field.required) throw new Error(`Could not find field ${field.label || field.path}`);
    return;
  }

  const target = loc.first();
  const role = (await target.getAttribute("role").catch(() => "")) || "";

  if (role === "combobox" || (await target.getAttribute("aria-autocomplete")) === "list") {
    await fillCombobox(page, target, value, human);
    return;
  }

  if (kind === "select") {
    const tag = await target.evaluate((el) => el.tagName).catch(() => "");
    if (tag === "SELECT") {
      await target.selectOption({ label: value }).catch(async () => {
        await target.selectOption({ value });
      });
      return;
    }
    await target.click();
    const option = page.getByRole("option", { name: value, exact: false }).first();
    if ((await option.count()) > 0) {
      await option.click();
      return;
    }
    if (human) {
      await typeLikePerson(page, target, value);
      await page.keyboard.press("Enter");
      return;
    }
    await target.fill(value).catch(async () => {
      await page.keyboard.type(value);
      await page.keyboard.press("Enter");
    });
    return;
  }

  if (human) {
    await typeLikePerson(page, target, value);
    return;
  }
  await target.fill(value);
}

function isResumeField(field: ApplyField): boolean {
  const blob = `${field.path} ${field.label}`.toLowerCase();
  if (field.inputKind !== "file") return false;
  if (/autofill/.test(blob)) return false;
  if (/cover/.test(blob)) return false;
  return /resume|curriculum|\bcv\b|_systemfield_resume/.test(blob);
}

export type FileInputMeta = {
  name: string;
  id: string;
  label: string;
};

/** Autofill-from-resume is a parse helper. Never treat it as the required Resume field. */
export function pickResumeFileInput(inputs: FileInputMeta[]): FileInputMeta | null {
  const usable = inputs.filter((i) => !/autofill/i.test(`${i.name} ${i.id} ${i.label}`));
  const system = usable.find((i) => /_systemfield_resume/i.test(`${i.name} ${i.id}`));
  if (system) return system;
  const labeled = usable.find((i) => /resume|curriculum|\bcv\b/i.test(`${i.name} ${i.id} ${i.label}`));
  return labeled ?? null;
}

async function describeFileInput(loc: Locator): Promise<FileInputMeta> {
  return loc.evaluate((el) => {
    const id = el.id || "";
    let label = "";
    if (id) {
      const lab = document.querySelector(`label[for="${CSS.escape(id)}"]`);
      label = (lab?.textContent || "").replace(/\s+/g, " ").trim();
    }
    if (!label) {
      const wrap = el.closest("label");
      label = (wrap?.textContent || "").replace(/\s+/g, " ").trim();
    }
    if (!label) label = (el.getAttribute("aria-label") || "").trim();
    return { name: el.getAttribute("name") || "", id, label };
  });
}

function listenForResumeBind(page: Page): {
  sawAshbyUpload: () => boolean;
  setFile: () => Response | null;
  stop: () => void;
} {
  let sawAshbyUpload = false;
  let setFile: Response | null = null;
  const onResp = (res: Response) => {
    const url = res.url();
    const post = res.request().postData();
    if (isAshbyGraphqlOp(url, post, "ApiCreateFileUploadHandle")) {
      sawAshbyUpload = true;
    }
    if (isAshbyGraphqlOp(url, post, "ApiSetFormValueToFile")) setFile = res;
  };
  page.on("response", onResp);
  return {
    sawAshbyUpload: () => sawAshbyUpload,
    setFile: () => setFile,
    stop: () => page.off("response", onResp),
  };
}

async function waitUntilResumeBound(
  listen: ReturnType<typeof listenForResumeBind>,
): Promise<Response | "ui"> {
  const started = Date.now();
  try {
    while (Date.now() - started < 25_000) {
      const setFile = listen.setFile();
      if (setFile) return setFile;
      if (!listen.sawAshbyUpload() && Date.now() - started > 3_000) return "ui";
      await sleep(200);
    }
    const setFile = listen.setFile();
    if (setFile) return setFile;
    throw new Error("Resume did not finish uploading to Ashby");
  } finally {
    listen.stop();
  }
}

async function attachResumePdf(page: Page, resumePath: string, fields: ApplyField[]): Promise<void> {
  const preferred = fields.find(isResumeField)?.path ?? "_systemfield_resume";
  const named = page.locator(
    `input[type="file"][name="${preferred}"], input[type="file"][id="${preferred}"], input[type="file"][name="_systemfield_resume"], input[type="file"][id="_systemfield_resume"]`,
  );

  const listen = listenForResumeBind(page);

  const chooserWait = page.waitForEvent("filechooser", { timeout: 5_000 }).catch(() => null);
  const resumeLabel = page.locator(
    'label[for="_systemfield_resume"], [class*="FileUpload"]:has(input[name="_systemfield_resume"])',
  );
  if ((await resumeLabel.count()) > 0) {
    await resumeLabel.first().click({ timeout: 4_000 }).catch(() => undefined);
  } else if ((await named.count()) > 0) {
    await named
      .first()
      .evaluate("el => el.click()")
      .catch(() => undefined);
  }
  const chooser = await chooserWait;
  if (chooser) {
    await chooser.setFiles(resumePath);
  } else if ((await named.count()) > 0) {
    await named.first().setInputFiles(resumePath);
  } else {
    const inputs = page.locator('input[type="file"]');
    const n = await inputs.count();
    if (!n) {
      listen.stop();
      throw new Error("No file input on the apply form");
    }
    const metas: FileInputMeta[] = [];
    for (let i = 0; i < n; i++) {
      metas.push(await describeFileInput(inputs.nth(i)));
    }
    const picked = pickResumeFileInput(metas);
    if (!picked) {
      listen.stop();
      throw new Error("Resume file input not found (Autofill helper is not the Resume field)");
    }
    const index = metas.findIndex(
      (m) => m.name === picked.name && m.id === picked.id && m.label === picked.label,
    );
    await inputs.nth(index >= 0 ? index : 0).setInputFiles(resumePath);
  }

  const setRes = await waitUntilResumeBound(listen);
  if (setRes !== "ui") {
    const payload = await readGraphqlPayload(setRes);
    const gqlError = graphqlErrorMessage(payload);
    if (!setRes.ok() || gqlError) {
      throw new Error(gqlError || `Resume upload failed (${setRes.status()})`);
    }
  }

  const attached = await page.evaluate(() => {
    const system = document.querySelector(
      'input[type="file"][name="_systemfield_resume"], input[type="file"][id="_systemfield_resume"]',
    ) as HTMLInputElement | null;
    if (system && system.files && system.files.length > 0) return true;
    return [...document.querySelectorAll('input[type="file"]')].some((node) => {
      const el = node as HTMLInputElement;
      const blob = `${el.name || ""} ${el.id || ""} ${el.getAttribute("aria-label") || ""}`;
      if (/autofill/i.test(blob)) return false;
      return (el.files?.length ?? 0) > 0;
    });
  });
  if (!attached) {
    throw new Error("Resume PDF did not attach to _systemfield_resume");
  }
  await sleep(400);
}

async function findSubmitButton(page: Page): Promise<Locator | null> {
  const candidates = [
    page.locator("button.ashby-application-form-submit-button"),
    page.getByRole("button", { name: /submit application/i }),
    page.getByRole("button", { name: /^submit$/i }),
    page.getByRole("button", { name: /send application/i }),
  ];
  for (const loc of candidates) {
    if ((await loc.count()) > 0) {
      const btn = loc.last();
      if (await btn.isVisible().catch(() => false)) return btn;
    }
  }
  return null;
}

async function visibleFormErrors(page: Page): Promise<string[]> {
  return page.evaluate(`(() => {
    const nodes = [...document.querySelectorAll("[class*='error'], [class*='Error'], [role='alert']")];
    return nodes
      .map((n) => (n.textContent || "").replace(/\\s+/g, " ").trim())
      .filter((t) => t && t.length < 220 && /required|invalid|select a file|please |must |complete|missing/i.test(t));
  })()`) as Promise<string[]>;
}

async function submitSnapshot(page: Page): Promise<{
  url: string;
  regionText: string;
  bodyText: string;
  submitVisible: boolean;
  formPresent: boolean;
  hasIdentityInputs: boolean;
  invalid: Array<{ name: string; validation: string }>;
}> {
  return page.evaluate(`(() => {
    const root =
      document.querySelector("form") ||
      document.getElementById("apply") ||
      document.querySelector("[class*='application-form']") ||
      document.body;
    const submit = [...document.querySelectorAll("button, input[type=submit]")].find((el) =>
      /submit application|^submit$/i.test((el.textContent || el.value || "").replace(/\\s+/g, " ").trim()),
    );
    const invalid = [...document.querySelectorAll("input:invalid, textarea:invalid, select:invalid")]
      .filter((el) => el.tagName !== "FORM")
      .map((el) => ({
        name: el.name || el.id || el.getAttribute("aria-label") || "field",
        validation: el.validationMessage || "",
      }));
    const regionText = ((root && root.innerText) || "").slice(0, 4000);
    return {
      url: location.href,
      regionText,
      bodyText: (document.body.innerText || "").slice(0, 8000),
      submitVisible: Boolean(submit && submit.offsetParent !== null),
      formPresent: Boolean(document.querySelector("form") || document.getElementById("apply")),
      hasIdentityInputs: Boolean(document.querySelector("input[name='_systemfield_name'], input[id='_systemfield_name'], input[name='_systemfield_email'], input[id='_systemfield_email']")),
      invalid,
    };
  })()`) as Promise<{
    url: string;
    regionText: string;
    bodyText: string;
    submitVisible: boolean;
    formPresent: boolean;
    hasIdentityInputs: boolean;
    invalid: Array<{ name: string; validation: string }>;
  }>;
}

async function waitForSubmitOutcome(page: Page, timeoutMs = 20_000): Promise<SubmitResult> {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const snap = await submitSnapshot(page);
    if (isAshbySpamFlag(snap.regionText) || isAshbySpamFlag(snap.bodyText)) {
      return { ok: false, error: "Your application submission was flagged as possible spam." };
    }
    if (
      (applicationLooksSubmitted(snap.regionText) || applicationLooksSubmitted(snap.bodyText)) &&
      !applyFormStillOpen(snap.regionText) &&
      !applyFormStillOpen(snap.bodyText)
    ) {
      return { ok: true, confirmation: snap.url };
    }
    const custom = await visibleFormErrors(page);
    if (custom.length && snap.submitVisible && Date.now() - started > 1500) {
      return { ok: false, error: formatSubmitValidation(custom.map((reason) => ({ label: reason }))) };
    }
    if (snap.invalid.length && snap.submitVisible && Date.now() - started > 1500) {
      return { ok: false, error: formatSubmitValidation(snap.invalid) };
    }
    await sleep(400);
  }
  const snap = await submitSnapshot(page);
  if (isAshbySpamFlag(snap.regionText) || isAshbySpamFlag(snap.bodyText)) {
    return { ok: false, error: "Your application submission was flagged as possible spam." };
  }
  if (
    (applicationLooksSubmitted(snap.regionText) || applicationLooksSubmitted(snap.bodyText)) &&
    !applyFormStillOpen(snap.bodyText)
  ) {
    return { ok: true, confirmation: snap.url };
  }
  const custom = await visibleFormErrors(page);
  if (custom.length) {
    return { ok: false, error: formatSubmitValidation(custom.map((reason) => ({ label: reason }))) };
  }
  if (snap.invalid.length) {
    return { ok: false, error: formatSubmitValidation(snap.invalid) };
  }
  return { ok: false, error: formatUnconfirmedSubmit(snap.url, snap.regionText || snap.bodyText) };
}

async function clickSubmitOnce(page: Page, submit: Locator): Promise<SubmitResult> {
  const gqlWait = waitForGraphqlOp(page, "ApiSubmitSingleApplicationFormAction", 40_000).catch(() => null);
  const box = await submit.boundingBox();
  if (box) {
    await clickLikePerson(page, box);
  } else {
    await submit.hover().catch(() => undefined);
    await sleep(jitter(450));
    await submit.click();
  }
  const gql = await gqlWait;

  if (gql) {
    const payload = await readGraphqlPayload(gql);
    const gqlError = graphqlErrorMessage(payload);
    const snap = await submitSnapshot(page);
    if (isAshbySpamFlag(gqlError) || isAshbySpamFlag(snap.bodyText) || isAshbySpamFlag(snap.regionText)) {
      return { ok: false, error: gqlError || "Your application submission was flagged as possible spam." };
    }
    if (!gql.ok() || gqlError) {
      const custom = await visibleFormErrors(page);
      return {
        ok: false,
        error:
          gqlError ||
          (custom.length ? formatSubmitValidation(custom.map((reason) => ({ label: reason }))) : `Ashby submit failed (${gql.status()})`),
      };
    }
    const ui = await waitForSubmitOutcome(page, 12_000);
    if (ui.ok) return ui;
    if (graphqlLooksSubmitted(payload)) {
      const later = await submitSnapshot(page);
      if (isAshbySpamFlag(later.bodyText) || isAshbySpamFlag(later.regionText)) {
        return { ok: false, error: "Your application submission was flagged as possible spam." };
      }
      return { ok: true, confirmation: later.url };
    }
    return ui;
  }

  return waitForSubmitOutcome(page, 25_000);
}

async function clickSubmitAndConfirm(page: Page): Promise<SubmitResult> {
  const submit = await findSubmitButton(page);
  if (!submit) {
    return { ok: false, error: "Submit button not found" };
  }
  await submit.scrollIntoViewIfNeeded();
  await submit.waitFor({ state: "visible", timeout: 10_000 });
  const enabled = await page
    .waitForFunction(
      () => {
        const buttons = [...document.querySelectorAll("button")];
        const btn = buttons.find((el) =>
          /submit application|^submit$/i.test((el.textContent || "").replace(/\s+/g, " ").trim()),
        ) as HTMLButtonElement | undefined;
        return Boolean(btn && !btn.disabled && btn.offsetParent !== null);
      },
      null,
      { timeout: 15_000 },
    )
    .then(() => true)
    .catch(() => false);
  if (!enabled) {
    return { ok: false, error: "Submit button stayed disabled after resume upload" };
  }

  await sleep(jitter(1_800));
  let outcome = await clickSubmitOnce(page, submit);
  return outcome;
}

export class AshbySource implements JobSource {
  id = "ashby";

  async listJobs(board: BoardRef): Promise<NormalizedJob[]> {
    const url = `https://api.ashbyhq.com/posting-api/job-board/${encodeURIComponent(board.slug)}?includeCompensation=true`;
    const res = await fetch(url, {
      headers: { accept: "application/json" },
    });
    if (res.status === 404) {
      throw new Error(`Ashby board not found: ${board.slug}`);
    }
    if (res.status === 429) {
      await sleep(2000);
      throw new Error(`Ashby rate limited listing ${board.slug}`);
    }
    if (!res.ok) {
      throw new Error(`Ashby listing ${board.slug} failed: ${res.status}`);
    }
    const body = (await res.json()) as AshbyBoard;
    const jobs = (body.jobs ?? []).filter((j) => j.isListed !== false && j.title);
    return jobs.map((job) => {
      const jobUrl = job.jobUrl || `https://jobs.ashbyhq.com/${board.slug}`;
      const applyUrl = job.applyUrl || jobUrl;
      const description =
        job.descriptionPlain?.trim() ||
        (job.descriptionHtml ? stripHtml(job.descriptionHtml) : "");
      const workplace = job.workplaceType ?? null;
      const isRemote = Boolean(job.isRemote) || workplace === "Remote";
      return {
        source: "ashby",
        sourceJobId: jobId(board.slug, job),
        companySlug: board.slug,
        companyName: board.name,
        title: job.title ?? "Untitled",
        isRemote,
        workplaceType: workplace,
        location: job.location ?? null,
        employmentType: job.employmentType ?? null,
        department: job.department ?? null,
        team: job.team ?? null,
        description,
        applyUrl,
        jobUrl,
        compensation: compensationSummary(job),
        publishedAt: job.publishedAt ?? job.updatedAt ?? null,
      };
    });
  }

  async extractApplyForm(job: NormalizedJob): Promise<ApplyForm> {
    return withPage(async (page) => {
      try {
        await openApplyPage(page, job);
      } catch (err) {
        const shot = shotPath("extract", job.sourceJobId);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
        if (err instanceof ApplyPageMissingError) {
          throw new ApplyPageMissingError(`${err.message}; screenshot ${shot}`);
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new Error(`No form fields found on ${job.applyUrl} (${message}; screenshot ${shot})`);
      }
      const fields = await collectFields(page);
      await harvestComboboxOptions(page, fields);
      if (fields.length === 0) {
        const shot = shotPath("extract", job.sourceJobId);
        await page.screenshot({ path: shot, fullPage: true });
        throw new Error(`No form fields found on ${job.applyUrl} (screenshot ${shot})`);
      }
      return { fields, pageUrl: page.url() };
    });
  }

  async submitApplication(job: NormalizedJob, payload: ApplyPayload): Promise<SubmitResult> {
    return withPage(async (page) => {
      try {
        await openApplyPage(page, job);
      } catch {
        const shot = shotPath("submit-missing", job.sourceJobId);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
        return { ok: false, error: "Apply form did not load", screenshotPath: shot };
      }

      const openedAt = Date.now();
      await browseLikePerson(page);

      let fields = await collectFields(page);
      const answers = payload.answers.filter((a) => a.value != null && a.value !== "" && a.value !== "{{resume}}");

      for (const answer of answers) {
        const field = fieldForAnswer(fields, answer.path, answer.label);
        if (!field || field.inputKind === "file") continue;
        try {
          await fillField(page, field, answer.value as string, true);
          await sleep(jitter(220));
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          throw new Error(`Failed filling ${field.label || answer.path}: ${message}`);
        }
      }

      await sleep(jitter(1_200));
      const after = await collectFields(page);
      const known = new Set(
        payload.answers.flatMap((a) => [a.path, radioQuestionId(a.path)].filter(Boolean)),
      );
      const newRequired = after.filter(
        (f) =>
          f.required &&
          f.inputKind !== "file" &&
          !known.has(f.path) &&
          !known.has(radioQuestionId(f.path)),
      );
      if (newRequired.length) {
        const shot = shotPath("submit-conditional", job.sourceJobId);
        await page.screenshot({ path: shot, fullPage: true });
        return {
          ok: false,
          error: `Conditional required fields appeared after fill: ${newRequired.map((f) => f.label).join("; ")}`,
          screenshotPath: shot,
        };
      }
      fields = after;

      if (!payload.resumePath || !fs.existsSync(payload.resumePath)) {
        const shot = shotPath("submit", job.sourceJobId);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
        return { ok: false, error: "Resume PDF missing; cannot submit", screenshotPath: shot };
      }
      try {
        await attachResumePdf(page, payload.resumePath, fields);
      } catch (err) {
        const shot = shotPath("submit", job.sourceJobId);
        await page.screenshot({ path: shot, fullPage: true }).catch(() => undefined);
        const message = err instanceof Error ? err.message : String(err);
        return { ok: false, error: message, screenshotPath: shot };
      }

      await dwellBeforeSubmit(openedAt);
      const live = await collectFields(page);
      await refillAnswers(page, payload.answers, live, true);
      await retickRequiredConsent(page);

      let outcome = await clickSubmitAndConfirm(page);
      for (
        let attempt = 0;
        attempt < 2 && !outcome.ok && shouldRetryMissingRequired(outcome.error || "");
        attempt++
      ) {
        const targeted = await refillMissingRequired(page, payload.answers, outcome.error || "");
        if (!targeted) {
          const again = await collectFields(page);
          await refillAnswers(page, payload.answers, again, true);
        }
        await retickRequiredConsent(page);
        await sleep(jitter(400));
        outcome = await clickSubmitAndConfirm(page);
      }
      if (!outcome.ok) {
        const shot = shotPath("submit", job.sourceJobId);
        await page.screenshot({ path: shot, fullPage: true });
        return { ...outcome, screenshotPath: shot };
      }
      return outcome;
    }, { submit: true });
  }
}

export const ashby = new AshbySource();
