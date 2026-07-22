import { loadEnv } from "./util.ts";
import { buildJobs, type JobKind } from "./plan.ts";
import { executeJobs } from "./run.ts";

// Reference portrait(s) first, then one full-body image per outfit state.
// Pass --ref-only to generate just the reference portraits.
loadEnv();
const refOnly = process.argv.includes("--ref-only");
const kinds = new Set<JobKind>(refOnly ? ["reference"] : ["reference", "character"]);

executeJobs(buildJobs(kinds)).catch((e) => {
  console.error(e);
  process.exit(1);
});
