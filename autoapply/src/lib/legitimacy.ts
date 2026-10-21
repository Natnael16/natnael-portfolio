/**
 * Scam screen for postings, before any model time is spent on them. Scores start from how
 * much the listing site vouches for the employer and lose points for the patterns job-scam
 * reports keep showing: moving the chat to Telegram or WhatsApp, asking you to pay for
 * equipment or training, cheque and gift-card schemes, personal-email recruiters, and
 * "earn $500 a day, no experience" pay.
 *
 * Patterns are phrased as asks ("contact us on WhatsApp"), not topics, so a real posting that
 * builds a WhatsApp integration is not flagged.
 */
import type { NormalizedJob, SourceTrust } from "../sources/types.js";

export type LegitFlag = { severity: "critical" | "major" | "minor"; reason: string };

export type Legitimacy = {
  ok: boolean;
  score: number;
  flags: LegitFlag[];
};

const BASE: Record<SourceTrust, number> = { ats: 100, curated: 90, open: 80 };
const PENALTY: Record<LegitFlag["severity"], number> = { critical: 60, major: 30, minor: 10 };

type Rule = { severity: LegitFlag["severity"]; reason: string; re: RegExp; in: "text" | "title" | "url" };

const RULES: Rule[] = [
  {
    severity: "critical",
    reason: "Asks you to move the conversation to Telegram/WhatsApp/Signal",
    in: "text",
    re: /\b(contact|message|text|reach out to|dm|chat with|interview(ed)?|add) (me|us|the (recruiter|hiring manager|hr))\b[^.\n]{0,30}\b(on|via|through|using|at)\s+(telegram|whatsapp|signal|wechat|hangouts|wickr|kik)\b|\b(apply|interview|reach (me|us)|message (me|us))\s+(on|via|through|using)\s+(telegram|whatsapp|signal|wechat|hangouts)\b|\b(telegram|whatsapp|signal)\s*(handle|id|number|username)\b|\b(telegram|whatsapp)\s*[:@]?\s*(@\w{3,}|\+?\d[\d\s-]{7,})/i,
  },
  {
    severity: "critical",
    reason: "Asks you to pay (training, equipment, registration or a background check)",
    in: "text",
    re: /\byou(?:'ll| will)?\s+(?:need to |have to |must |are required to |will be required to )?(?:pay|deposit|cover the cost of)\b[^.\n]{0,40}\b(?:fee|training|equipment|software|starter kit|registration|certification|background check|onboarding)\b|(?<!\bno )\b(?:registration|training|onboarding|starter kit|processing) fee\b|\bpurchase\b[^.\n]{0,40}\bfrom (?:our|the|a) (?:approved |preferred )?(?:vendor|supplier)\b/i,
  },
  {
    severity: "critical",
    reason: "Cheque, gift-card or package-forwarding scheme",
    in: "text",
    re: /\b(buy|purchase)\s+(?:\w+\s+){0,3}gift cards?\b|\b(deposit|cash)\s+(?:the |a |this |our )?(check|cheque)\b|\bcashier'?s (check|cheque)\b|\b(reshipping|package forwarding|forward(ing)? (the )?packages)\b/i,
  },
  {
    severity: "major",
    reason: "Recruiter uses a personal email address",
    in: "text",
    re: /\b(send|email|apply|cv|resume|reach)\b[^\n]{0,60}\b[\w.+-]+@(gmail|yahoo|hotmail|outlook|aol|icloud|protonmail|proton|mail|gmx|yandex)\.(com|me|ru|net)\b/i,
  },
  {
    severity: "major",
    reason: "Too-good-to-be-true pay pitch",
    in: "text",
    re: /\b(no experience (needed|necessary|required)|earn (up to )?\$?\d[\d,]*\s*(\+\s*)?(per|a|\/)\s*(day|week)|daily pay|weekly pay(outs)?|guaranteed income|be your own boss|unlimited (earning|income)|get paid to)\b/i,
  },
  {
    severity: "major",
    reason: "Commission-only or recruit-your-friends scheme",
    in: "text",
    re: /\b(commission[- ]only|mlm|multi[- ]level marketing|network marketing|recruit (your )?(friends|family))\b/i,
  },
  {
    severity: "major",
    reason: "Salary paid only in crypto",
    in: "text",
    re: /\b(salary|pay|paid|compensation)\b[^.\n]{0,20}\b(only )?(in|via|with) (crypto|bitcoin|btc|usdt)\b/i,
  },
  {
    severity: "major",
    reason: "Role type common in job scams",
    in: "title",
    re: /\b(data entry|package handler|reshipp\w*|parcel|mystery shopper|payment processor|money transfer|personal assistant|virtual assistant|envelope stuffing)\b/i,
  },
  {
    severity: "major",
    reason: "Applies through a link shortener, chat app or Google Form",
    in: "url",
    re: /^https?:\/\/(bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|forms\.gle|t\.me|wa\.me|chat\.whatsapp\.com|docs\.google\.com\/forms)\b/i,
  },
  {
    severity: "minor",
    reason: "Urgent / immediate-start pressure",
    in: "text",
    re: /\b(urgent(ly)? (hiring|needed|required)|immediate (start|hire|joining)|start (today|tomorrow)|limited slots|act now)\b/i,
  },
];

export function assessLegitimacy(
  job: Pick<NormalizedJob, "title" | "companyName" | "description" | "applyUrl">,
  trust: SourceTrust,
  minScore = 50,
): Legitimacy {
  const flags: LegitFlag[] = [];
  const haystacks = {
    text: `${job.title}\n${job.description}`,
    title: job.title,
    url: job.applyUrl ?? "",
  };
  for (const rule of RULES) {
    if (rule.re.test(haystacks[rule.in])) flags.push({ severity: rule.severity, reason: rule.reason });
  }

  const company = (job.companyName ?? "").trim();
  if (!company || /^(unknown company|confidential|hiring company|n\/a|private|undisclosed)$/i.test(company)) {
    flags.push({ severity: trust === "ats" ? "minor" : "major", reason: "No company named" });
  }
  if (job.description.replace(/\s+/g, " ").trim().length < 300) {
    flags.push({ severity: "minor", reason: "Very short description" });
  }

  const score = Math.max(0, flags.reduce((n, f) => n - PENALTY[f.severity], BASE[trust]));
  const critical = flags.some((f) => f.severity === "critical");
  return { ok: !critical && score >= minScore, score, flags };
}
