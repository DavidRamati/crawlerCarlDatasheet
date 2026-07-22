import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { QuotaError, getProvider } from "./provider.ts";
import type { Job } from "./plan.ts";

/**
 * Executes art jobs against the configured provider. Idempotent (skips existing
 * files) and quota-safe: on a QuotaError it stops gracefully, keeping everything
 * generated so far, so re-running resumes where it left off.
 */
export async function executeJobs(jobs: Job[]): Promise<void> {
  const pending = jobs.filter((j) => !existsSync(j.targetAbs));
  if (pending.length === 0) {
    console.log("[artgen] Nothing to do — all target images already exist.");
    return;
  }

  const provider = getProvider();
  if (!provider) {
    console.log(
      `[artgen] No image credentials configured (set ARTGEN_PROVIDER + the ` +
        `matching API key in .env). ${pending.length} image(s) pending; the app ` +
        `will show placeholders.\n[artgen] Tip: run 'npm run artgen:prompts' to ` +
        `export the prompts and make the art by hand in a browser instead.`,
    );
    return;
  }

  console.log(`[artgen] Provider: ${provider.name}. ${pending.length} image(s) to generate.`);
  let done = 0;
  for (const job of pending) {
    try {
      const refs =
        job.referenceAbs && existsSync(job.referenceAbs)
          ? [readFileSync(job.referenceAbs)]
          : undefined;
      const buf = await provider.generate({
        prompt: job.prompt,
        referenceImages: refs,
        size: job.size,
      });
      mkdirSync(dirname(job.targetAbs), { recursive: true });
      writeFileSync(job.targetAbs, buf);
      done++;
      console.log(`[artgen] ✓ ${job.targetRel}  (${done}/${pending.length})`);
    } catch (e) {
      if (e instanceof QuotaError) {
        console.log(
          `\n[artgen] ⏸  Quota exhausted after ${done}/${pending.length} image(s).\n` +
            `[artgen]     Completed images are saved; re-run to resume once quota refreshes.\n` +
            `[artgen]     Note: image generation often has little/no free-tier quota. The\n` +
            `[artgen]     web apps (ChatGPT/Gemini) give far more — run 'npm run artgen:prompts'\n` +
            `[artgen]     and follow docs/manual-art-generation.md to make the art by hand.`,
        );
        return;
      }
      console.error(`[artgen] ✗ ${job.targetRel}: ${(e as Error).message}`);
      throw e;
    }
  }
  console.log(`[artgen] Done — generated ${done} image(s).`);
}
