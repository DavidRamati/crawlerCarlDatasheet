import { loadEnv } from "./util.ts";
import { buildJobs, type JobKind } from "./plan.ts";
import { executeJobs } from "./run.ts";

// One icon per distinct item across the book's data.
loadEnv();
const kinds = new Set<JobKind>(["item"]);

executeJobs(buildJobs(kinds)).catch((e) => {
  console.error(e);
  process.exit(1);
});
