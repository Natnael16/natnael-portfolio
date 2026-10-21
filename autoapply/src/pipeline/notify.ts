import { and, desc, eq, gte, inArray } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { applications, jobs } from "../db/schema.js";
import { sourceLabel } from "../sources/registry.js";

const TELEGRAM_LIMIT = 3_900;
const MAX_ITEMS = 30;

type DigestRow = { application: typeof applications.$inferSelect; job: typeof jobs.$inferSelect };

function line(row: DigestRow, link: string): string {
  const where = row.job.location ? ` (${row.job.location})` : "";
  return `• ${row.application.matchScore ?? "?"} · ${row.job.title} · ${row.job.companyName}${where} · ${sourceLabel(row.job.source)}\n  ${link}`;
}

/** The message for matches created since `sinceIso`, or null when there are none. */
export function buildDigest(rows: DigestRow[]): string | null {
  if (!rows.length) return null;
  const base = config.publicBaseUrl;
  const manual = rows.filter((r) => r.application.status === "apply_manual");
  const review = rows.filter((r) => r.application.status === "pending_approval");
  const auto = rows.filter((r) => r.application.status === "auto_submit");
  const parts = [`${rows.length} new job match${rows.length === 1 ? "" : "es"}`];
  let shown = 0;
  const section = (title: string, list: DigestRow[], link: (r: DigestRow) => string) => {
    if (!list.length) return;
    const room = Math.max(0, MAX_ITEMS - shown);
    const lines = list.slice(0, room).map((r) => line(r, link(r)));
    shown += lines.length;
    const more = list.length > lines.length ? `\n  …and ${list.length - lines.length} more in the dashboard` : "";
    parts.push(`${title} (${list.length})\n${lines.join("\n")}${more}`);
  };
  section("Apply yourself", manual, (r) => r.job.applyUrl);
  section("Drafted, waiting for your approval", review, (r) => `${base}/#/inbox/${r.application.id}`);
  section("Drafted, in the auto-apply queue", auto, (r) => `${base}/#/inbox/${r.application.id}`);
  parts.push(`Dashboard: ${base}`);
  return parts.join("\n\n");
}

function chunks(text: string): string[] {
  const out: string[] = [];
  let current = "";
  for (const piece of text.split("\n")) {
    if (current && current.length + piece.length + 1 > TELEGRAM_LIMIT) {
      out.push(current);
      current = "";
    }
    current = current ? `${current}\n${piece}` : piece.slice(0, TELEGRAM_LIMIT);
  }
  if (current) out.push(current);
  return out;
}

async function sendTelegram(text: string): Promise<void> {
  for (const chunk of chunks(text)) {
    const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: config.telegramChatId,
        text: chunk,
        disable_web_page_preview: true,
      }),
    });
    if (!res.ok) {
      console.error(`telegram notify failed: ${res.status} ${await res.text()}`);
      return;
    }
  }
}

/** Send one message listing every match this run created, with the link to act on each. */
export async function notifyRunDigest(sinceIso: string): Promise<void> {
  const rows = db
    .select({ application: applications, job: jobs })
    .from(applications)
    .innerJoin(jobs, eq(applications.jobId, jobs.id))
    .where(
      and(
        inArray(applications.status, ["apply_manual", "pending_approval", "auto_submit"]),
        gte(applications.createdAt, sinceIso),
      ),
    )
    .orderBy(desc(applications.matchScore))
    .all();
  const text = buildDigest(rows);
  if (!text) return;
  if (!config.telegramBotToken || !config.telegramChatId) {
    console.log(`notify (Telegram not configured):\n${text}`);
    return;
  }
  await sendTelegram(text);
}

export function countPending(): number {
  return db
    .select()
    .from(applications)
    .where(inArray(applications.status, ["pending_approval", "auto_submit", "apply_manual"]))
    .all().length;
}
