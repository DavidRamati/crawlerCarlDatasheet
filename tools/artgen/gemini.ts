import { QuotaError, type GenRequest, type Provider } from "./provider.ts";

/**
 * Google Gemini image adapter ("Nano Banana" — strong at character/subject
 * consistency and editing). Uses the Generative Language API generateContent
 * endpoint; reference images are passed as inline_data parts so the same
 * character is re-dressed consistently across outfit states.
 *
 * Env: GEMINI_API_KEY (from https://aistudio.google.com/apikey),
 *      ARTGEN_MODEL (default "gemini-2.5-flash-image").
 * Docs: https://ai.google.dev/gemini-api/docs/image-generation
 */
export class GeminiProvider implements Provider {
  name = "gemini";
  private key = process.env.GEMINI_API_KEY!;
  private model = process.env.ARTGEN_MODEL ?? "gemini-2.5-flash-image";

  async generate(req: GenRequest): Promise<Buffer> {
    const parts: unknown[] = [{ text: req.prompt }];
    for (const ref of req.referenceImages ?? []) {
      parts.push({
        inline_data: { mime_type: "image/png", data: ref.toString("base64") },
      });
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": this.key },
      body: JSON.stringify({ contents: [{ parts }] }),
    });

    if (res.status === 429) {
      throw new QuotaError(`Gemini quota exhausted (429): ${await res.text()}`);
    }
    if (!res.ok) {
      const body = await res.text();
      if (body.includes("RESOURCE_EXHAUSTED")) throw new QuotaError(`Gemini quota: ${body}`);
      throw new Error(`Gemini ${res.status}: ${body}`);
    }

    const json = (await res.json()) as {
      candidates?: Array<{
        content?: {
          parts?: Array<{
            inlineData?: { data?: string };
            inline_data?: { data?: string };
          }>;
        };
      }>;
    };
    for (const part of json.candidates?.[0]?.content?.parts ?? []) {
      const b64 = part.inlineData?.data ?? part.inline_data?.data;
      if (b64) return Buffer.from(b64, "base64");
    }
    throw new Error("Gemini: no image data in response");
  }
}
