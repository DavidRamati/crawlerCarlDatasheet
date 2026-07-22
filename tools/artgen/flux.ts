import type { GenRequest, Provider } from "./provider.ts";

/**
 * Black Forest Labs FLUX adapter (stub). FLUX Kontext / FLUX.2 are strong at
 * re-dressing a consistent character via reference images. Fill in the request
 * against the current BFL API and set BFL_API_KEY to enable.
 * Docs: https://docs.bfl.ai/
 */
export class FluxProvider implements Provider {
  name = "flux";

  async generate(_req: GenRequest): Promise<Buffer> {
    throw new Error(
      "FluxProvider is a stub. Implement the BFL API call (flux-kontext), " +
        "then set ARTGEN_PROVIDER=flux and BFL_API_KEY.",
    );
  }
}
