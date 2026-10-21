import fs from "node:fs";
import path from "node:path";

function loadEnvFile() {
  const file = path.resolve(".env");
  if (!fs.existsSync(file)) return;
  for (const raw of fs.readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (process.env[key] === undefined) process.env[key] = val;
  }
}

loadEnvFile();

function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

const dataDir = path.resolve(env("DATA_DIR", "./data"));

fs.mkdirSync(path.join(dataDir, "uploads"), { recursive: true });
fs.mkdirSync(path.join(dataDir, "screenshots"), { recursive: true });
fs.mkdirSync(path.join(dataDir, "logs"), { recursive: true });

export const config = {
  port: Number(env("PORT", "3000")),
  dataDir,
  dbPath: path.join(dataDir, "app.db"),
  dashboardPassword: env("DASHBOARD_PASSWORD", "change-me"),
  vertexProject: env("VERTEX_PROJECT") || env("GOOGLE_CLOUD_PROJECT"),
  vertexLocation: env("VERTEX_LOCATION", "global"),
  vertexModel: env("VERTEX_MODEL", "gemini-3.8-flash"),
  vertexThinkingLevel: (() => {
    const level = env("VERTEX_THINKING_LEVEL", "MEDIUM").toUpperCase();
    return ["LOW", "MEDIUM", "HIGH"].includes(level) ? level : "MEDIUM";
  })(),
  telegramBotToken: env("TELEGRAM_BOT_TOKEN"),
  telegramChatId: env("TELEGRAM_CHAT_ID"),
  cronSchedule: env("CRON_SCHEDULE", "0 8 * * *"),
  matchThreshold: Number(env("MATCH_THRESHOLD", "50")),
  jobMaxAgeDays: Number(env("JOB_MAX_AGE_DAYS", "7")),
  ingestConcurrency: Math.max(1, Number(env("INGEST_CONCURRENCY", "6"))),
  publicBaseUrl: env("PUBLIC_BASE_URL", "http://localhost:3000").replace(/\/$/, ""),
  nodeEnv: env("NODE_ENV", "development"),
  /** Headless submit is easier for Ashby to flag. Default is a real Chrome window. */
  submitHeadless: env("SUBMIT_HEADLESS", "false").toLowerCase() === "true",
  /** Keep the submit Chrome off your screen so auto-apply does not steal focus. */
  submitChromeBackground: env("SUBMIT_CHROME_BACKGROUND", "true").toLowerCase() !== "false",
  /** Attach to an already-open Chrome (`chrome://inspect`) instead of launching one. */
  submitCdpUrl: env("SUBMIT_CDP_URL"),
  submitChromePath: env("SUBMIT_CHROME_PATH"),
  /** Time on the apply page before clicking Submit. Short sessions look automated. */
  submitMinDwellMs: Math.max(8_000, Number(env("SUBMIT_MIN_DWELL_MS", "55000"))),
  /** Minimum gap between submit attempts. */
  submitCooldownMs: Math.max(60_000, Number(env("SUBMIT_COOLDOWN_MS", "300000"))),
  /** Extra wait after Ashby flags spam. Immediate retries from the same session fail. */
  submitSpamCooldownMs: Math.max(120_000, Number(env("SUBMIT_SPAM_COOLDOWN_MS", "1200000"))),
  /** Matches at or above this score wait in Inbox. Below it (and ≥ MATCH_THRESHOLD) auto-apply. */
  reviewMinScore: Number(env("REVIEW_MIN_SCORE", "90")),
};
