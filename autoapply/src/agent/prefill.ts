import type { Profile } from "../lib/profile.js";
import { isConsentPrompt, isMarketingOptInPrompt, shouldTickConsent } from "../lib/consent.js";
import type { ApplyField, FieldAnswer, NormalizedJob } from "../sources/types.js";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function heuristicConcept(field: ApplyField): string {
  const blob = `${field.path} ${field.label}`.toLowerCase();
  if (/autofill from resume/.test(blob)) return "unknown";
  if (field.inputKind === "file" && /cover|covering letter/.test(blob)) return "other_file";
  if (field.inputKind === "file" && /resume|curriculum|\bcv\b/.test(blob)) return "resume_file";
  if (/cover letter|covering letter/.test(blob)) return "cover_letter";
  if (/linkedin/.test(blob)) return "social";
  if (/github/.test(blob)) return "social";
  if (/twitter|\bx\b\.com/.test(blob)) return "social";
  if (/portfolio|personal (site|url|website)|website|blog/.test(blob) && !/how did you/.test(blob)) {
    return "social";
  }
  if (/\bemail\b/.test(blob) && !/referred|referral|someone at/i.test(blob)) return "identity";
  if (/\bphone\b|mobile|\btel\b/.test(blob) && !/consent|whatsapp|text message/.test(blob)) {
    return "identity";
  }
  if (
    /\b(full name|legal name|first name|last name|preferred name|your name)\b/.test(blob) ||
    /^name$/.test(field.label.trim().toLowerCase())
  ) {
    return "identity";
  }
  if (/resume|curriculum|\bcv\b/.test(blob) && field.inputKind === "file") return "resume_file";
  if (isMarketingOptInPrompt(field.label, field.path)) return "marketing_opt_in";
  if (isConsentPrompt(field.label, field.path)) return "consent";
  if (/visa sponsorship|require (visa |immigration )?sponsorship|immigration sponsorship|work visa|need a visa|visa to work/i.test(blob)) {
    return "sponsorship";
  }
  if (
    /\b(salary|compensation|expected pay|pay expectation|desired (salary|comp|pay)|annual pay)\b/i.test(blob) &&
    !/\bequity\b/i.test(blob)
  ) {
    return "salary";
  }
  return "";
}

export function identityAnswer(profile: Profile, path: string, label: string): FieldAnswer | null {
  const blob = `${path} ${label}`.toLowerCase();
  const pick = (value: string, type = "identity"): FieldAnswer => ({
    path,
    label,
    type,
    value: value || null,
    confidence: value ? "high" : "low",
    source: value ? "profile" : "empty",
  });
  if (/\b(company name|employer|school name)\b/.test(blob)) return null;
  if (/\bemail\b/.test(blob) && !/referred|referral|someone at/i.test(blob)) return pick(profile.email);
  if (/\bphone\b|mobile|\btel\b/.test(blob) && !/consent|whatsapp|text message/.test(blob)) {
    return pick(profile.phone);
  }
  if (/linkedin/.test(blob)) return pick(profile.linkedin, "social");
  if (/github/.test(blob)) return pick(profile.github, "social");
  if (/twitter|\bx\b\.com/.test(blob)) return pick(profile.twitter, "social");
  if (/portfolio|website|personal site|personal url/.test(blob)) {
    return pick(profile.portfolio || profile.website, "social");
  }
  if (
    /\b(full name|legal name|first name|last name|preferred name|your name)\b/.test(blob) ||
    /^name$/.test(label.trim().toLowerCase()) ||
    (/\bname\b/.test(blob) && !/company|employer|file|user/.test(blob))
  ) {
    const wantsFirst = /\bfirst name\b/.test(blob);
    const wantsLast = /\blast name\b/.test(blob);
    if (wantsFirst && !wantsLast) return pick(profile.name.split(/\s+/)[0] || profile.name);
    if (wantsLast && !wantsFirst) {
      const parts = profile.name.trim().split(/\s+/);
      return pick(parts.slice(1).join(" ") || profile.name);
    }
    return pick(profile.name);
  }
  return null;
}

function matchOption(want: string, options: string[]): string | null {
  const n = want.trim().toLowerCase();
  if (!n) return null;
  const exact = options.find((o) => o.toLowerCase() === n);
  if (exact) return exact;
  const contains = options.find((o) => o.toLowerCase().includes(n) || n.includes(o.toLowerCase()));
  return contains ?? null;
}

function cityFromLocation(location: string): string {
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[0] || location;
}

function countryFromLocation(location: string): string {
  const parts = location.split(",").map((s) => s.trim()).filter(Boolean);
  return parts[parts.length - 1] || location;
}

function isTimezonePrompt(label: string): boolean {
  return /\b(timezone|time zone|working hours|hours overlap|us hours|pt\/mt|pacific|eastern time)\b/i.test(
    label,
  ) || /based in (an? )?(eu|europe|us|uk|american|equivalent).*(timezone|time zone)/i.test(label)
    || /can you (work|align).*(hours|timezone|time zone)/i.test(label);
}

function noticeDays(noticePeriod: string): number | null {
  const raw = noticePeriod.trim().toLowerCase();
  if (!raw) return null;
  if (/^1 week|^one week|^a week/.test(raw)) return 7;
  const weeks = raw.match(/(\d+)\s*weeks?/);
  if (weeks) return Number(weeks[1]) * 7;
  const days = raw.match(/(\d+)\s*days?/);
  if (days) return Number(days[1]);
  return null;
}

function noticeValue(profile: Profile, field: ApplyField): string | null {
  const notice = profile.noticePeriod.trim();
  if (!notice) return null;
  const days = noticeDays(notice);
  if (field.inputKind === "number" && days != null) return String(days);
  if (field.options.length) {
    const exact = matchOption(notice, field.options);
    if (exact) return exact;
    if (days != null) {
      const asDays = matchOption(`${days} days`, field.options);
      if (asDays) return asDays;
      const weekLabel = days % 7 === 0 ? `${days / 7} week${days === 7 ? "" : "s"}` : "";
      if (weekLabel) {
        const asWeeks = matchOption(weekLabel, field.options);
        if (asWeeks) return asWeeks;
      }
    }
    return null;
  }
  return notice;
}

function wantsAnnualPay(label: string): boolean {
  return /\b(year|annual|annum|yearly|\/yr|per year)\b/i.test(label);
}

function salaryAmounts(
  band: string,
  annual: boolean,
): { min: number; max: number; monthly: boolean } | null {
  const nums = [...band.matchAll(/(\d[\d,]*)/g)]
    .map((m) => Number(m[1].replace(/,/g, "")))
    .filter((n) => n > 0);
  if (!nums.length) return null;
  const monthlyBand = /month|\/mo|monthly/i.test(band) || nums[0] <= 10_000;
  const min = nums[0];
  const max = nums[1] ?? nums[0];
  if (monthlyBand && annual) return { min: min * 12, max: max * 12, monthly: false };
  if (!monthlyBand && !annual && min > 10_000) return { min, max, monthly: false };
  return { min, max, monthly: monthlyBand && !annual };
}

function pickSalaryOption(options: string[], min: number, max: number): string | null {
  const hit =
    matchOption(`${min}-${max}`, options) ||
    matchOption(String(min), options) ||
    matchOption(String(max), options) ||
    options.find((o) => o.includes(String(min)) && o.includes(String(max))) ||
    options.find((o) => o.replace(/,/g, "").includes(String(min)));
  return hit ?? null;
}

function salaryText(min: number, max: number, monthly: boolean): string {
  if (monthly) return `${min}-${max} USD per month`;
  return `${min}-${max} USD per year`;
}

function roleIsRemote(job?: Pick<NormalizedJob, "isRemote" | "workplaceType"> | null): boolean {
  if (!job) return true;
  if (job.isRemote) return true;
  if (/remote/i.test(job.workplaceType ?? "")) return true;
  if (/on-?site|hybrid|office/i.test(job.workplaceType ?? "")) return false;
  return true;
}

function salaryAnswer(
  profile: Profile,
  field: ApplyField,
  job?: Pick<NormalizedJob, "isRemote" | "workplaceType"> | null,
): FieldAnswer | null {
  const band = profile.salaryBand.trim();
  if (!band) return null;
  if (!roleIsRemote(job)) return null;
  const annual = wantsAnnualPay(field.label);
  const amt = salaryAmounts(band, annual);
  if (!amt) return null;
  const path = field.path;
  const label = field.label;
  let value: string | null = null;
  if (field.options.length) {
    value = pickSalaryOption(field.options, amt.min, amt.max);
  } else if (field.inputKind === "number") {
    if (/\b(max|high|to|upper)\b/i.test(label)) value = String(amt.max);
    else value = String(amt.min);
  } else {
    value = salaryText(amt.min, amt.max, amt.monthly);
  }
  if (!value) return null;
  return { path, label, type: "salary", value, confidence: "high", source: "profile" };
}

export function prefillAnswer(
  profile: Profile,
  field: ApplyField,
  concept: string,
  job?: Pick<NormalizedJob, "isRemote" | "workplaceType"> | null,
): FieldAnswer | null {
  const label = field.label;
  const path = field.path;
  if (concept === "resume_file" || heuristicConcept(field) === "resume_file") {
    return {
      path,
      label,
      type: "resume_file",
      value: "{{resume}}",
      confidence: "high",
      source: "profile",
    };
  }

  if (concept === "salary" || heuristicConcept(field) === "salary") {
    return salaryAnswer(profile, field, job);
  }

  if (concept === "identity" || concept === "social" || heuristicConcept(field) === "identity" || heuristicConcept(field) === "social") {
    return identityAnswer(profile, path, label);
  }

  if (
    concept === "consent" ||
    concept === "marketing_opt_in" ||
    heuristicConcept(field) === "consent" ||
    heuristicConcept(field) === "marketing_opt_in"
  ) {
    const type = concept === "marketing_opt_in" || heuristicConcept(field) === "marketing_opt_in" ? "marketing_opt_in" : "consent";
    if (!shouldTickConsent(field, profile)) return null;
    return {
      path,
      label,
      type,
      value: "true",
      confidence: "high",
      source: "profile",
    };
  }

  if (
    concept === "availability" ||
    isTimezonePrompt(label) ||
    /\b(notice period|when can you start|earliest start|available from)\b/i.test(label)
  ) {
    if (isTimezonePrompt(label) && profile.timezoneFlexible) {
      if (field.inputKind === "select" || field.inputKind === "radio") {
        const yes = matchOption("Yes", field.options);
        if (yes) {
          return { path, label, type: "availability", value: yes, confidence: "high", source: "profile" };
        }
      }
      if (/\b(timezone|time zone)\b/i.test(label) && !/based in|can you|overlap|hours/i.test(label) && profile.timezone) {
        return {
          path,
          label,
          type: "availability",
          value: profile.timezone,
          confidence: "high",
          source: "profile",
        };
      }
      if (field.inputKind === "text" || field.inputKind === "textarea" || field.inputKind === "other") {
        return {
          path,
          label,
          type: "availability",
          value: "Yes",
          confidence: "high",
          source: "profile",
        };
      }
    }
    if (/\bnotice\b/i.test(label) || (concept === "availability" && /notice|start|available/i.test(label))) {
      const value = noticeValue(profile, field);
      if (value) {
        return { path, label, type: "availability", value, confidence: "high", source: "profile" };
      }
    }
  }

  if (
    concept === "sponsorship" ||
    /visa sponsorship|require (visa |immigration )?sponsorship|immigration sponsorship/i.test(label)
  ) {
    const want = profile.requiresSponsorship ? "Yes" : "No";
    const value = field.options.length ? matchOption(want, field.options) : want;
    if (!value) return null;
    return {
      path,
      label,
      type: "sponsorship",
      value,
      confidence: "high",
      source: "profile",
    };
  }

  if (concept === "location" || /\b(location|city|country|where are you based|reside|based in)\b/i.test(label)) {
    if (isTimezonePrompt(label) && profile.timezoneFlexible) {
      const yes = field.options.length ? matchOption("Yes", field.options) : "Yes";
      if (yes) {
        return { path, label, type: "availability", value: yes, confidence: "high", source: "profile" };
      }
    }
    const wantsCountry = /\bcountry\b/i.test(label) && !/\bcity\b/i.test(label);
    const wantsCity = /\bcity\b/i.test(label) && !/\bcountry\b/i.test(label);
    const raw = wantsCountry
      ? countryFromLocation(profile.location)
      : wantsCity
        ? cityFromLocation(profile.location)
        : profile.location;
    const value =
      field.inputKind === "select" || field.inputKind === "radio"
        ? matchOption(raw, field.options)
        : raw;
    if (!value) return null;
    return {
      path,
      label,
      type: concept || "location",
      value,
      confidence: "high",
      source: "profile",
    };
  }

  if (
    concept === "education" ||
    /\b(school|university|college|degree|gpa|cgpa|field of study|major)\b/i.test(label)
  ) {
    const edu = profile.education[0];
    const summary = profile.educationSummary.trim();
    if (!edu && !summary) return null;
    let value = summary;
    if (/gpa|cgpa/i.test(label)) {
      const gpa = summary.match(/(\d+(?:\.\d+)?)\s*\/\s*\d/)?.[0] ?? edu?.degree;
      value = gpa || summary;
    } else if (/school|university|college/i.test(label) && edu) {
      value = edu.schoolName;
    } else if (/\bdegree\b/i.test(label) && edu) {
      value = edu.degree;
    } else if (/field of study|major/i.test(label) && edu) {
      value = edu.field;
    }
    if (!value) return null;
    if (field.options.length) {
      const hit = matchOption(value, field.options);
      if (!hit) return null;
      value = hit;
    }
    return { path, label, type: "education", value, confidence: "high", source: "profile" };
  }

  if (concept === "referral" || /referred you|someone at .+ referred|referral email/i.test(label)) {
    return {
      path,
      label,
      type: "referral",
      value: profile.referralName || "",
      confidence: "high",
      source: "profile",
    };
  }

  if (concept === "how_heard" || /how did you hear/i.test(label)) {
    const hit = matchOption(profile.howHeard, field.options.length ? field.options : [label]);
    if (!hit) return null;
    if (field.inputKind === "checkbox") {
      const on = label.toLowerCase().includes(profile.howHeard.toLowerCase()) || hit === label;
      return {
        path,
        label,
        type: "how_heard",
        value: on ? "true" : "false",
        confidence: "high",
        source: "canned",
      };
    }
    return {
      path,
      label,
      type: "how_heard",
      value: hit,
      confidence: "high",
      source: "canned",
    };
  }

  if (UUID.test(label) || UUID.test(path)) {
    return null;
  }

  return null;
}
