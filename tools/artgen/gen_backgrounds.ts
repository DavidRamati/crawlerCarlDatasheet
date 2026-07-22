import { loadEnv } from "./util.ts";
import { buildJobs, type JobKind } from "./plan.ts";
import { executeJobs } from "./run.ts";

// One background image per distinct chapter scene (location).
loadEnv();
const kinds = new Set<JobKind>(["scene"]);

executeJobs(buildJobs(kinds)).catch((e) => {
  console.error(e);
  process.exit(1);
});
