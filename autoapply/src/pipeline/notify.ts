import { inArray } from "drizzle-orm";
import { config } from "../config.js";
import { db } from "../db/client.js";
import { applications } from "../db/schema.js";

export async function notifyPending(count: number): Promise<void> {
  if (count <= 0) return;
  if (!config.telegramBotToken || !config.telegramChatId) {
    console.log(`notify: ${count} pending (Telegram not configured)`);
    return;
  }
  const text = `${count} application${count === 1 ? "" : "s"} in Inbox.\n${config.publicBaseUrl}`;
  const res = await fetch(`https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: config.telegramChatId,
      text,
    }),
  });
  if (!res.ok) {
    console.error(`telegram notify failed: ${res.status} ${await res.text()}`);
  }
}

export function countPending(): number {
  return db
    .select()
    .from(applications)
    .where(inArray(applications.status, ["pending_approval", "auto_submit"]))
    .all().length;
}
