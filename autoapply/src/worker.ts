import { schedule } from "node-cron";
import { startAutoSubmitLoop } from "./pipeline/apply.js";
import { config } from "./config.js";
import { runOnce } from "./pipeline/run.js";
import "./db/client.js";

const once = process.argv.includes("--once");

async function main() {
  if (once) {
    await runOnce();
    return;
  }
  startAutoSubmitLoop();
  console.log(`worker cron ${config.cronSchedule}`);
  schedule(config.cronSchedule, () => {
    runOnce().catch((err) => console.error("scheduled run failed", err));
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
