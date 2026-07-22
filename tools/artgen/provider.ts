/**
 * Pluggable image-generation provider. Selected via env:
 *   ARTGEN_PROVIDER = openai (default) | flux | gemini
 * Each adapter reads its own API key from env and returns PNG bytes.
 * getProvider() returns null when no credentials are configured, so the
 * harness can no-op and let the app fall back to placeholders.
 */
import { OpenAIProvider } from "./openai.ts";
import { FluxProvider } from "./flux.ts";
import { GeminiProvider } from "./gemini.ts";

export interface GenRequest {
  prompt: string;
  /** reference PNGs for character-consistency (used by edit-capable providers) */
  referenceImages?: Buffer[];
  /** e.g. "1024x1024" or "1024x1536" */
  size?: string;
}

export interface Provider {
  name: string;
  generate(req: GenRequest): Promise<Buffer>;
}

/** Thrown by adapters when the API quota/rate limit is exhausted (HTTP 429 /
 *  RESOURCE_EXHAUSTED). The runner catches this to stop gracefully so a re-run
 *  after the quota refreshes resumes where it left off. */
export class QuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "QuotaError";
  }
}

export function getProvider(): Provider | null {
  const which = (process.env.ARTGEN_PROVIDER ?? "openai").toLowerCase();
  switch (which) {
    case "openai":
      return process.env.OPENAI_API_KEY ? new OpenAIProvider() : null;
    case "flux":
      return process.env.BFL_API_KEY ? new FluxProvider() : null;
    case "gemini":
      return process.env.GEMINI_API_KEY ? new GeminiProvider() : null;
    default:
      return null;
  }
}
