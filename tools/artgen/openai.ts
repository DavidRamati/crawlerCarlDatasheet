import { QuotaError, type GenRequest, type Provider } from "./provider.ts";

/**
 * OpenAI image adapter (default). Uses the Images API. Model id defaults to
 * `gpt-image-1` (marketed as GPT Image); override with ARTGEN_MODEL.
 * With referenceImages it uses the edits endpoint (re-dress a consistent
 * character); otherwise the generations endpoint.
 */
export class OpenAIProvider implements Provider {
  name = "openai";
  private key = process.env.OPENAI_API_KEY!;
  private model = process.env.ARTGEN_MODEL ?? "gpt-image-1";

  async generate(req: GenRequest): Promise<Buffer> {
    const size = req.size ?? "1024x1024";
    return req.referenceImages?.length
      ? this.edit(req.prompt, size, req.referenceImages)
      : this.create(req.prompt, size);
  }

  private async create(prompt: string, size: string): Promise<Buffer> {
    const res = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.key}`,
      },
      body: JSON.stringify({ model: this.model, prompt, size, n: 1 }),
    });
    return this.readB64(res);
  }

  private async edit(prompt: string, size: string, refs: Buffer[]): Promise<Buffer> {
    const form = new FormData();
    form.set("model", this.model);
    form.set("prompt", prompt);
    form.set("size", size);
    refs.forEach((buf, i) =>
      form.append(
        "image[]",
        new Blob([new Uint8Array(buf)], { type: "image/png" }),
        `ref${i}.png`,
      ),
    );
    const res = await fetch("https://api.openai.com/v1/images/edits", {
      method: "POST",
      headers: { Authorization: `Bearer ${this.key}` },
      body: form,
    });
    return this.readB64(res);
  }

  private async readB64(res: Response): Promise<Buffer> {
    if (res.status === 429) {
      throw new QuotaError(`OpenAI quota/rate limit hit: ${await res.text()}`);
    }
    if (!res.ok) {
      throw new Error(`OpenAI images ${res.status}: ${await res.text()}`);
    }
    const json = (await res.json()) as { data?: Array<{ b64_json?: string }> };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI images: no b64_json in response");
    return Buffer.from(b64, "base64");
  }
}
