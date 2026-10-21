import { useEffect, useState, type FormEvent } from "react";
import { api } from "../api";

export function Profile() {
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    api.profile().then((r) => {
      setProfile(r.profile);
      setResumeName(r.resumeOriginalName);
    });
  }, []);

  if (!profile) return <p className="muted">Loading…</p>;
  const current = profile;

  function str(key: string) {
    return String(current[key] ?? "");
  }
  function set(key: string, value: unknown) {
    setProfile({ ...current, [key]: value });
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    await api.saveProfile(current);
    setMsg("Saved");
  }

  async function onFile(file: File | null) {
    if (!file) return;
    const r = await api.uploadResume(file);
    setResumeName((r as { resumeOriginalName?: string }).resumeOriginalName ?? file.name);
    setMsg("Resume uploaded");
  }

  return (
    <form onSubmit={save}>
      <h1>Profile</h1>
      <p className="muted">The agent may only use what you put here plus the resume text.</p>
      <div className="grid-2">
        <label className="field">Name<input value={str("name")} onChange={(e) => set("name", e.target.value)} /></label>
        <label className="field">Email<input value={str("email")} onChange={(e) => set("email", e.target.value)} /></label>
        <label className="field">Phone<input value={str("phone")} onChange={(e) => set("phone", e.target.value)} /></label>
        <label className="field">Location<input value={str("location")} onChange={(e) => set("location", e.target.value)} /></label>
        <label className="field">LinkedIn<input value={str("linkedin")} onChange={(e) => set("linkedin", e.target.value)} /></label>
        <label className="field">GitHub<input value={str("github")} onChange={(e) => set("github", e.target.value)} /></label>
      </div>
      <label className="field">Portfolio<input value={str("portfolio")} onChange={(e) => set("portfolio", e.target.value)} /></label>
      <label className="field">
        Target titles (comma-separated)
        <input
          value={Array.isArray(profile.targetTitles) ? (profile.targetTitles as string[]).join(", ") : str("targetTitles")}
          onChange={(e) => set("targetTitles", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </label>
      <label className="field">
        Exclude keywords
        <input
          value={Array.isArray(profile.excludeKeywords) ? (profile.excludeKeywords as string[]).join(", ") : ""}
          onChange={(e) => set("excludeKeywords", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </label>
      <label className="field">
        Skills
        <input
          value={Array.isArray(profile.skills) ? (profile.skills as string[]).join(", ") : ""}
          onChange={(e) => set("skills", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </label>
      <label className="field">
        Regions you can work from (remote jobs limited to anywhere else are skipped)
        <input
          placeholder="Worldwide, Anywhere, EMEA, Africa, Ethiopia"
          value={Array.isArray(current.eligibleRegions) ? (current.eligibleRegions as string[]).join(", ") : ""}
          onChange={(e) => set("eligibleRegions", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </label>
      <label className="field">
        Employment types
        <input
          value={Array.isArray(profile.employmentTypes) ? (profile.employmentTypes as string[]).join(", ") : ""}
          onChange={(e) => set("employmentTypes", e.target.value.split(",").map((s) => s.trim()).filter(Boolean))}
        />
      </label>
      <div className="grid-2">
        <label className="field">
          Years experience
          <input
            type="number"
            value={profile.yearsExperience == null ? "" : String(profile.yearsExperience)}
            onChange={(e) => set("yearsExperience", e.target.value ? Number(e.target.value) : null)}
          />
        </label>
        <label className="field">
          Max years a job may require
          <input
            type="number"
            value={profile.maxRoleYears == null ? "" : String(profile.maxRoleYears)}
            onChange={(e) => set("maxRoleYears", e.target.value ? Number(e.target.value) : null)}
          />
        </label>
        <label className="field">
          Seniority
          <select value={str("seniorityBand")} onChange={(e) => set("seniorityBand", e.target.value)}>
            <option value="junior">junior</option>
            <option value="mid">mid</option>
            <option value="senior">senior</option>
            <option value="staff">staff</option>
          </select>
        </label>
        <label className="field">
          Work authorization
          <input value={str("workAuthorization")} onChange={(e) => set("workAuthorization", e.target.value)} />
        </label>
        <label className="field">
          Salary band for remote roles (empty = flag salary questions for you)
          <input
            placeholder="e.g. 5000-6500 USD per month"
            value={str("salaryBand")}
            onChange={(e) => set("salaryBand", e.target.value)}
          />
        </label>
        <label className="field">
          Visa type (if any)
          <input value={str("visaType")} onChange={(e) => set("visaType", e.target.value)} />
        </label>
        <label className="field">
          Timezone
          <input value={str("timezone")} onChange={(e) => set("timezone", e.target.value)} />
        </label>
        <label className="field">
          Earliest start (YYYY-MM-DD)
          <input value={str("earliestStart")} onChange={(e) => set("earliestStart", e.target.value)} />
        </label>
      </div>
      <label className="field">Website<input value={str("website")} onChange={(e) => set("website", e.target.value)} /></label>
      <label className="field">Twitter / X<input value={str("twitter")} onChange={(e) => set("twitter", e.target.value)} /></label>
      <label className="field">Pronouns (optional)<input value={str("pronouns")} onChange={(e) => set("pronouns", e.target.value)} /></label>
      <label className="field">
        How you hear about roles (maps to “How did you hear about us?”)
        <input
          placeholder="LinkedIn, company website, …"
          value={str("howHeard")}
          onChange={(e) => set("howHeard", e.target.value)}
        />
      </label>
      <label className="field">Referral name (only if true)<input value={str("referralName")} onChange={(e) => set("referralName", e.target.value)} /></label>
      <label className="field">Languages<input value={str("languages")} onChange={(e) => set("languages", e.target.value)} /></label>
      <label className="field">
        Education (plain language; school, degree, years)
        <textarea
          value={str("educationSummary")}
          onChange={(e) => set("educationSummary", e.target.value)}
        />
      </label>
      <label className="field">
        Willing to relocate
        <select value={str("willingToRelocate")} onChange={(e) => set("willingToRelocate", e.target.value)}>
          <option value="">unset</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </label>
      <label className="field">
        Contact current employer?
        <select value={str("canContactEmployer")} onChange={(e) => set("canContactEmployer", e.target.value)}>
          <option value="">unset</option>
          <option value="yes">yes</option>
          <option value="no">no</option>
        </select>
      </label>
      <label className="field">
        Export control / US person (canned)
        <input value={str("exportControl")} onChange={(e) => set("exportControl", e.target.value)} />
      </label>
      <label className="field">
        Extra canned answers (JSON object for odd questions)
        <textarea
          value={JSON.stringify((profile.cannedAnswers as object) ?? {}, null, 2)}
          onChange={(e) => {
            try {
              set("cannedAnswers", JSON.parse(e.target.value));
            } catch {
              /* keep typing */
            }
          }}
        />
      </label>
      <label className="field">
        Notice period
        <input value={str("noticePeriod")} onChange={(e) => set("noticePeriod", e.target.value)} />
      </label>
      <label className="field">
        <span>
          <input
            type="checkbox"
            checked={Boolean(profile.requiresSponsorship)}
            onChange={(e) => set("requiresSponsorship", e.target.checked)}
          />{" "}
          Requires sponsorship
        </span>
      </label>
      <label className="field">
        <span>
          <input
            type="checkbox"
            checked={Boolean(profile.gdprConsent)}
            onChange={(e) => set("gdprConsent", e.target.checked)}
          />{" "}
          GDPR / privacy consent (only if you want the agent to tick those boxes)
        </span>
      </label>
      <label className="field">
        <span>
          <input
            type="checkbox"
            checked={Boolean(profile.attestTruth)}
            onChange={(e) => set("attestTruth", e.target.checked)}
          />{" "}
          Allow ticking “I certify this is true”
        </span>
      </label>
      <label className="field">
        <span>
          <input
            type="checkbox"
            checked={Boolean(profile.timezoneFlexible)}
            onChange={(e) => set("timezoneFlexible", e.target.checked)}
          />{" "}
          Timezone flexible (can work any hours, including US)
        </span>
      </label>
      <label className="field">
        <span>
          <input
            type="checkbox"
            checked={Boolean(profile.remoteOnly)}
            onChange={(e) => set("remoteOnly", e.target.checked)}
          />{" "}
          Remote only
        </span>
      </label>
      <label className="field">
        Resume PDF
        <input type="file" accept="application/pdf" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
        <span className="small">{resumeName ?? "None uploaded"}</span>
      </label>
      {msg && <p className="muted">{msg}</p>}
      <button className="btn" type="submit">
        Save profile
      </button>
    </form>
  );
}
