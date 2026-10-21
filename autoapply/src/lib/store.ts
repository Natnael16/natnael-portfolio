import fs from "node:fs";
import path from "node:path";
import { eq } from "drizzle-orm";
import { db } from "../db/client.js";
import { profile as profileTable } from "../db/schema.js";
import { defaultProfile, type Profile } from "./profile.js";
import {
  CANDIDATE_PROFILE_MD,
  CANDIDATE_RESUME_PDF,
  loadCandidateResumeMaterials,
} from "./resumeFile.js";
import { nowIso } from "./time.js";

/** PDF attached to applications. Kept as an alias for older imports. */
export const CANDIDATE_RESUME_PATH = CANDIDATE_RESUME_PDF;

export type ProfileRecord = {
  profile: Profile;
  resumePath: string | null;
  resumeOriginalName: string | null;
  resumeText: string;
};

function mergeProfile(json: string): Profile {
  const defaults = defaultProfile();
  const parsed = { ...defaults, ...(JSON.parse(json) as Partial<Profile>) };
  if (!parsed.noticePeriod) parsed.noticePeriod = defaults.noticePeriod;
  if (parsed.maxRoleYears == null) parsed.maxRoleYears = defaults.maxRoleYears;
  if (!Array.isArray(parsed.eligibleRegions)) parsed.eligibleRegions = defaults.eligibleRegions;
  if (parsed.seniorityBand === "junior" || parsed.seniorityBand === "mid") {
    parsed.targetTitles = parsed.targetTitles.filter(
      (t) => !/\b(senior|staff|principal)\b/i.test(t),
    );
  }
  return parsed;
}

function resolveResumeFile(storedPath: string | null, storedName: string | null): {
  resumePath: string | null;
  resumeOriginalName: string | null;
} {
  if (fs.existsSync(CANDIDATE_RESUME_PDF)) {
    return { resumePath: CANDIDATE_RESUME_PDF, resumeOriginalName: "resume.pdf" };
  }
  if (storedPath && fs.existsSync(storedPath)) {
    return { resumePath: storedPath, resumeOriginalName: storedName ?? path.basename(storedPath) };
  }
  if (fs.existsSync(CANDIDATE_PROFILE_MD)) {
    return {
      resumePath: CANDIDATE_PROFILE_MD,
      resumeOriginalName: path.basename(CANDIDATE_PROFILE_MD),
    };
  }
  return { resumePath: null, resumeOriginalName: storedName };
}

export function loadProfileRecord(): ProfileRecord {
  const row = db.select().from(profileTable).where(eq(profileTable.id, 1)).get();
  if (!row) {
    const file = resolveResumeFile(null, null);
    const resumeText = fs.existsSync(CANDIDATE_PROFILE_MD)
      ? fs.readFileSync(CANDIDATE_PROFILE_MD, "utf8")
      : "";
    return {
      profile: defaultProfile(),
      ...file,
      resumeText,
    };
  }
  const file = resolveResumeFile(row.resumePath, row.resumeOriginalName);
  const resumeText =
    (row.resumeText && row.resumeText.trim()) ||
    (fs.existsSync(CANDIDATE_PROFILE_MD) ? fs.readFileSync(CANDIDATE_PROFILE_MD, "utf8") : "");
  return {
    profile: mergeProfile(row.json),
    ...file,
    resumeText,
  };
}

export async function syncCandidateResume(): Promise<ProfileRecord> {
  const materials = await loadCandidateResumeMaterials();
  const rec = loadProfileRecord();
  const row = db.select().from(profileTable).where(eq(profileTable.id, 1)).get();
  if (row && materials.resumePath) {
    db.update(profileTable)
      .set({
        resumePath: materials.resumePath,
        resumeOriginalName: materials.resumeOriginalName,
        resumeText: materials.resumeText,
        updatedAt: nowIso(),
      })
      .where(eq(profileTable.id, 1))
      .run();
  }
  return {
    ...rec,
    resumePath: materials.resumePath ?? rec.resumePath,
    resumeOriginalName: materials.resumeOriginalName ?? rec.resumeOriginalName,
    resumeText: materials.resumeText || rec.resumeText,
  };
}
