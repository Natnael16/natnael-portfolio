import fs from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { eq } from "drizzle-orm";
import { config } from "../config.js";
import * as schema from "./schema.js";
import { companies, profile } from "./schema.js";
import { nowIso } from "../lib/time.js";
import { defaultProfile } from "../lib/profile.js";

const sqlite = new Database(config.dbPath);
sqlite.pragma("journal_mode = WAL");
sqlite.pragma("foreign_keys = ON");

export const db = drizzle(sqlite, { schema });

function tableColumns(table: string): Set<string> {
  const rows = sqlite.prepare(`PRAGMA table_info(${table})`).all() as Array<{ name: string }>;
  return new Set(rows.map((r) => r.name));
}

function migrate() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL,
      name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'ashby',
      enabled INTEGER NOT NULL DEFAULT 1,
      last_fetched_at TEXT,
      last_error TEXT,
      fail_count INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      source TEXT NOT NULL,
      source_job_id TEXT NOT NULL,
      company_slug TEXT NOT NULL,
      company_name TEXT NOT NULL,
      title TEXT NOT NULL,
      is_remote INTEGER NOT NULL DEFAULT 0,
      workplace_type TEXT,
      location TEXT,
      employment_type TEXT,
      department TEXT,
      team TEXT,
      description TEXT NOT NULL DEFAULT '',
      apply_url TEXT NOT NULL,
      job_url TEXT NOT NULL,
      compensation TEXT,
      published_at TEXT,
      fetched_at TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS jobs_source_id_idx ON jobs(source, source_job_id);

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      job_id INTEGER NOT NULL,
      status TEXT NOT NULL,
      match_score INTEGER,
      match_json TEXT,
      form_json TEXT,
      answers_json TEXT,
      flags_json TEXT,
      critique_json TEXT,
      error TEXT,
      submitted_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS applications_job_id_idx ON applications(job_id);

    CREATE TABLE IF NOT EXISTS profile (
      id INTEGER PRIMARY KEY,
      json TEXT NOT NULL,
      resume_path TEXT,
      resume_original_name TEXT,
      resume_text TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS runs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      started_at TEXT NOT NULL,
      finished_at TEXT,
      status TEXT NOT NULL,
      stats_json TEXT,
      error TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      token TEXT PRIMARY KEY,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS application_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      application_id INTEGER,
      job_id INTEGER,
      kind TEXT NOT NULL,
      level TEXT NOT NULL,
      message TEXT NOT NULL,
      detail_json TEXT,
      screenshot_path TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS application_events_app_id_idx ON application_events(application_id);
    CREATE INDEX IF NOT EXISTS application_events_created_idx ON application_events(created_at);
  `);

  const companyCols = tableColumns("companies");
  if (!companyCols.has("source")) {
    sqlite.exec(`ALTER TABLE companies ADD COLUMN source TEXT NOT NULL DEFAULT 'ashby'`);
  }
  sqlite.exec(`DROP INDEX IF EXISTS companies_slug_idx`);
  sqlite.exec(`CREATE UNIQUE INDEX IF NOT EXISTS companies_source_slug_idx ON companies(source, slug)`);
  sqlite.exec(`CREATE INDEX IF NOT EXISTS applications_job_id_idx ON applications(job_id)`);
  const jobCols = tableColumns("jobs");
  if (!jobCols.has("published_at")) {
    sqlite.exec(`ALTER TABLE jobs ADD COLUMN published_at TEXT`);
  }
}

function seed() {
  const existing = db.select().from(companies).all();
  if (existing.length === 0) {
    const candidates = [
      path.resolve("data/ashby-boards.seed.json"),
      path.resolve("seed/ashby-boards.seed.json"),
    ];
    const seedPath = candidates.find((p) => fs.existsSync(p));
    if (seedPath) {
      const rows = JSON.parse(fs.readFileSync(seedPath, "utf8")) as {
        slug: string;
        name: string;
      }[];
      const createdAt = nowIso();
      for (const row of rows) {
        db.insert(companies)
          .values({
            slug: row.slug.toLowerCase(),
            name: row.name,
            source: "ashby",
            enabled: true,
            createdAt,
          })
          .run();
      }
    }
  }

  const p = db.select().from(profile).where(eq(profile.id, 1)).get();
  if (!p) {
    db.insert(profile)
      .values({
        id: 1,
        json: JSON.stringify(defaultProfile()),
        updatedAt: nowIso(),
      })
      .run();
  }
}

migrate();
seed();
