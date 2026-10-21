import fs from "node:fs";
import path from "node:path";
import { extractText, getDocumentProxy } from "unpdf";
import "../config.js";

export const CANDIDATE_RESUME_PDF = path.resolve("candidate/resume.pdf");

/** `CANDIDATE_PROFILE_MD` if set, else the first markdown file in candidate/ (README.md aside). */
function findProfileMarkdown(): string {
  const explicit = process.env.CANDIDATE_PROFILE_MD;
  if (explicit) return path.resolve(explicit);
  const dir = path.resolve("candidate");
  const found = fs.existsSync(dir)
    ? fs
        .readdirSync(dir)
        .filter((f) => f.endsWith(".md") && f.toLowerCase() !== "readme.md")
        .sort()[0]
    : undefined;
  return path.join(dir, found ?? "profile.md");
}

export const CANDIDATE_PROFILE_MD = findProfileMarkdown();

export async function extractPdfText(filePath: string): Promise<string> {
  const buf = fs.readFileSync(filePath);
  const pdf = await getDocumentProxy(new Uint8Array(buf));
  const extracted = await extractText(pdf, { mergePages: true });
  const text = Array.isArray(extracted.text) ? extracted.text.join("\n") : extracted.text;
  return (text ?? "").trim();
}

export async function loadCandidateResumeMaterials(): Promise<{
  resumePath: string | null;
  resumeOriginalName: string | null;
  resumeText: string;
}> {
  const hasPdf = fs.existsSync(CANDIDATE_RESUME_PDF);
  const hasMd = fs.existsSync(CANDIDATE_PROFILE_MD);
  const parts: string[] = [];
  if (hasPdf) {
    parts.push(await extractPdfText(CANDIDATE_RESUME_PDF));
  }
  if (hasMd) {
    parts.push(fs.readFileSync(CANDIDATE_PROFILE_MD, "utf8"));
  }
  return {
    resumePath: hasPdf ? CANDIDATE_RESUME_PDF : hasMd ? CANDIDATE_PROFILE_MD : null,
    resumeOriginalName: hasPdf
      ? "resume.pdf"
      : hasMd
        ? path.basename(CANDIDATE_PROFILE_MD)
        : null,
    resumeText: parts.filter(Boolean).join("\n\n"),
  };
}

/** PDF extract + full master profile as two labeled sources (never a 24k slice). */
export function candidateAgentSources(combinedResumeText: string): {
  resumePdf: string;
  masterProfile: string;
} {
  const masterProfile = fs.existsSync(CANDIDATE_PROFILE_MD)
    ? fs.readFileSync(CANDIDATE_PROFILE_MD, "utf8")
    : "";
  let resumePdf = (combinedResumeText || "").trim();
  if (masterProfile) {
    const needle = masterProfile.slice(0, 120);
    const idx = combinedResumeText.indexOf(needle);
    if (idx >= 0) resumePdf = combinedResumeText.slice(0, idx).trim();
    else resumePdf = combinedResumeText.replace(masterProfile, "").trim();
  }
  return { resumePdf, masterProfile };
}

export function candidateSourcePayload(combinedResumeText: string) {
  const { resumePdf, masterProfile } = candidateAgentSources(combinedResumeText);
  return {
    sourceNote:
      `Two candidate files, both required. resumePdf is candidate/resume.pdf (short). masterProfile is candidate/${path.basename(CANDIDATE_PROFILE_MD)} (full extended profile: experience detail, logistics, answering rules). Treat masterProfile as equal to the PDF, not optional. If a yes/no is in neither file, answer No and fill the field. Do not invent employers, titles, tools, or metrics.`,
    resumePdf,
    masterProfile,
  };
}
