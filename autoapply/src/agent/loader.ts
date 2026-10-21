import fs from "node:fs";
import path from "node:path";

const skillsRoot = path.resolve("agent/skills");

export function loadSkill(name: string): string {
  const dir = path.join(skillsRoot, name);
  const file = path.join(dir, "SKILL.md");
  if (!fs.existsSync(file)) {
    throw new Error(`Missing skill: ${name} (${file})`);
  }
  const parts = [fs.readFileSync(file, "utf8")];
  if (fs.existsSync(dir)) {
    const extras = fs
      .readdirSync(dir)
      .filter((f) => f.endsWith(".md") && f !== "SKILL.md")
      .sort();
    for (const extra of extras) {
      parts.push(fs.readFileSync(path.join(dir, extra), "utf8"));
    }
  }
  return parts.join("\n\n");
}

export function loadSkills(names: string[]): string {
  return names.map((n) => `---\nSKILL: ${n}\n---\n${loadSkill(n)}`).join("\n\n");
}
