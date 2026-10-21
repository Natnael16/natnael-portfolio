import { ashby } from "../src/sources/ashby.js";

const boards = [
  { slug: "linear", name: "Linear" },
  { slug: "notion", name: "Notion" },
  { slug: "posthog", name: "PostHog" },
  { slug: "ramp", name: "Ramp" },
  { slug: "vanta", name: "Vanta" },
];

async function main() {
  for (const board of boards) {
    try {
      const jobs = await ashby.listJobs(board);
      const remote = jobs.filter((j) => j.isRemote && j.applyUrl);
      const pick = (remote.length ? remote : jobs).slice(0, 2);
      console.error("LIST", board.slug, "jobs", jobs.length, "picked", pick.map((j) => j.title));
      for (const job of pick) {
        try {
          const form = await ashby.extractApplyForm(job);
          console.log("\n===", board.name, "|", job.title);
          console.log("url", job.applyUrl);
          for (const f of form.fields) {
            const opts = f.options.length ? " opts=" + JSON.stringify(f.options.slice(0, 8)) : "";
            console.log(
              " -",
              JSON.stringify(f.label).slice(0, 220),
              "[" + f.inputKind + (f.required ? ", req" : "") + "]" + opts,
            );
          }
        } catch (e) {
          console.error("EXTRACT FAIL", board.slug, job.title, e instanceof Error ? e.message : e);
        }
      }
    } catch (e) {
      console.error("LIST FAIL", board.slug, e instanceof Error ? e.message : e);
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
