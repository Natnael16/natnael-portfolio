// Loaded before every test file: a throwaway data dir, and no model or Telegram even if .env has them.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

process.env.DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "autoapply-test-"));
process.env.VERTEX_PROJECT = "";
process.env.GOOGLE_CLOUD_PROJECT = "";
process.env.TELEGRAM_BOT_TOKEN = "";
process.env.TELEGRAM_CHAT_ID = "";
