import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { compose } from "../src/data/reducer.ts";
import { Delta, Snapshot } from "../src/schema/index.ts";
import { DATA, REPO, loadEnv, readJson } from "./artgen/util.ts";

/**
 * Low-token, one-command per-chapter delta authoring.
 *
 *   npx tsx tools/extract_deltas.ts <book> <char> <chapter> [--api]
 *   e.g. npx tsx tools/extract_deltas.ts book1 carl 9
 *
 * It composes the character's state at the START of the target chapter (base +
 * deltas < N) and builds a tight prompt containing ONLY that snapshot plus the
 * one chapter's text — never earlier prose — so each call is cheap.
 *
 * Default (print mode): writes the prompt to data-src/<book>/prompts/ for you to
 * paste into Claude (me, or claude.ai) and save the JSON reply yourself.
 * With --api (and an Anthropic key configured): calls the API, validates the
 * returned delta with zod, and writes public/data/<book>/<char>/deltas/chNN.json.
 *
 * Model: EXTRACT_MODEL env (default claude-sonnet-5 — cost-effective and strong
 * at structured extraction; set EXTRACT_MODEL=claude-opus-4-8 for hard chapters).
 */

const SPEC = `You convert one chapter of the novel "Dungeon Crawler Carl" into a single JSON "delta" describing what changed for ONE character during that chapter. Output ONLY the JSON object — no prose, no markdown fences.

Rules:
- Include ONLY fields that changed this chapter. Everything omitted carries over.
- Shape:
  {
    "schemaVersion": 1,
    "chapterIndex": <N>,
    "notes": "<one-line human summary of what changed>",
    "set": { "level": <int|null>, "floor": <int|null>, "location": <string|null>,
             "identity": { "race": <string|null>, "class": <string|null>, "title": <string|null> },
             "stats": { "strength": <int>, "constitution": <int>, "dexterity": <int>, "intelligence": <int>, "charisma": <int> },
             "resources": { "hp": { "cur": <int|null>, "max": <int|null> }, "mana": { "cur": <int|null>, "max": <int|null> } },
             "equipment": { "<slot>": <Item|null> },   // slots: head, body, underwear, hands, feet, weapon, offhand, accessory
             "appearance": { "stateId": "<char>-NN-<slug>" },  // only when the visible look changes
             "scene": "scene-<slug>",                          // only when the location visibly changes
             "misc": { "<key>": <string|number|boolean|null> } },
    "inventory":    { "add": [Item], "remove": ["id"], "update": [{ "id": "...", ... }] },
    "skills":       { "add": [{ "id","name","level"?,"description"? }], "remove": [...], "update": [...] },
    "effects":      { "add": [{ "id","name","kind":"buff|debuff|neutral","description"? }], ... },
    "achievements": { "add": [{ "id","name","reward"?,"description"? }], ... },
    "contacts":     { "add": [{ "id","name","relation","note"? }], ... },
    "sources": [ { "field": "stats", "quote": "<verbatim book quote>" } ]
  }
- Item = { "id","name","rarity":"common|uncommon|rare|epic|legendary|unknown","qty"?,"effects"?,"description"?,
           "statBonuses"?:{stat:number}, "grants"?:[{ "skill","name"?,"level" }] }.
- IMPORTANT: stat/skill bonuses from gear go ON the item ("statBonuses"/"grants"), NOT baked into "set.stats"/"skills". Base stats only change on a permanent, item-independent change (e.g. a level-up spend).
- ids are stable kebab-case slugs. Add a "sources" quote for every non-trivial change. Never invent numbers — use null / omit when the book doesn't state it.
- EXTENSION PROTOCOL: if the chapter introduces a genuinely NEW KIND of state the shape above can't hold (not a small fact for "misc"), still capture what you can and prefix "notes" with "REVIEW NEEDED: <what and why>" so a human can decide how to model it.`;

function loadPrior(book: string, char: string, chapter: number): Snapshot | null {
  const dir = join(DATA, book, char);
  const base = Snapshot.parse(readJson(join(dir, "base.json")));
  const deltaDir = join(dir, "deltas");
  const deltas = existsSync(deltaDir)
    ? readdirSync(deltaDir)
        .filter((f) => f.endsWith(".json"))
        .map((f) => Delta.parse(readJson(join(deltaDir, f))))
    : [];
  return compose(base, deltas, [chapter]).byChapter.get(chapter) ?? null;
}

function stripFences(s: string): string {
  return s.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "").trim();
}

function hasAnthropicCreds(): boolean {
  return !!(process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_AUTH_TOKEN);
}

async function main() {
  loadEnv();
  const [book, char, chapterArg] = process.argv.slice(2);
  const useApi = process.argv.includes("--api");
  if (!book || !char || !chapterArg) {
    console.error("Usage: tsx tools/extract_deltas.ts <book> <char> <chapter> [--api]");
    process.exit(1);
  }
  const chapter = Number(chapterArg);
  const nn = String(chapter).padStart(2, "0");

  const textPath = join(REPO, "data-src", book, "chapters_txt", `ch${nn}.txt`);
  if (!existsSync(textPath)) {
    console.error(`Missing chapter text: ${textPath} (run tools/extract_text.py first)`);
    process.exit(1);
  }
  const chapterText = readFileSync(textPath, "utf-8");

  const prior = loadPrior(book, char, chapter);
  if (!prior) {
    console.error(`${char} is not present at chapter ${chapter} (before their intro chapter).`);
    process.exit(1);
  }

  const userMsg =
    `Character: ${char}. Target chapter: ${chapter} (set chapterIndex to ${chapter}).\n\n` +
    `The character's state at the START of chapter ${chapter} (already composed — do not repeat unchanged fields):\n` +
    "```json\n" + JSON.stringify(prior, null, 2) + "\n```\n\n" +
    `Full text of chapter ${chapter}:\n"""\n${chapterText}\n"""\n\n` +
    `Return the delta JSON for events during chapter ${chapter}.`;

  const outPath = join(DATA, book, char, "deltas", `ch${nn}.json`);

  if (!useApi || !hasAnthropicCreds()) {
    const promptDir = join(REPO, "data-src", book, "prompts");
    mkdirSync(promptDir, { recursive: true });
    const promptPath = join(promptDir, `${char}-ch${nn}.md`);
    writeFileSync(promptPath, `# System\n\n${SPEC}\n\n# User\n\n${userMsg}\n`);
    console.log(`[extract] Wrote prompt → ${promptPath}`);
    console.log(`[extract] Paste it into Claude, then save the JSON reply to:`);
    console.log(`[extract]   ${outPath}`);
    console.log(`[extract] (or re-run with --api once an Anthropic key is configured)`);
    return;
  }

  // Direct Messages API call (no SDK dependency, so `npm run build` never needs
  // an extra install and print-mode users pull in nothing).
  const model = process.env.EXTRACT_MODEL ?? "claude-sonnet-5";
  console.log(`[extract] Calling ${model} for ${char} ch${nn}…`);
  const headers: Record<string, string> = {
    "content-type": "application/json",
    "anthropic-version": "2023-06-01",
  };
  if (process.env.ANTHROPIC_API_KEY) {
    headers["x-api-key"] = process.env.ANTHROPIC_API_KEY;
  } else {
    headers["authorization"] = `Bearer ${process.env.ANTHROPIC_AUTH_TOKEN}`;
    headers["anthropic-beta"] = "oauth-2025-04-20";
  }
  const apiRes = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      max_tokens: 8000,
      output_config: { effort: "medium" },
      system: SPEC,
      messages: [{ role: "user", content: userMsg }],
    }),
  });
  if (!apiRes.ok) {
    console.error(`[extract] Anthropic API ${apiRes.status}: ${await apiRes.text()}`);
    process.exit(1);
  }
  const body = (await apiRes.json()) as { content?: Array<{ type: string; text?: string }> };
  const text = (body.content ?? [])
    .filter((b) => b.type === "text")
    .map((b) => b.text ?? "")
    .join("");

  let parsed: unknown;
  try {
    parsed = JSON.parse(stripFences(text));
  } catch {
    const errPath = outPath.replace(/\.json$/, ".raw.txt");
    mkdirSync(join(DATA, book, char, "deltas"), { recursive: true });
    writeFileSync(errPath, text);
    console.error(`[extract] Model output was not valid JSON — saved raw to ${errPath}`);
    process.exit(1);
  }

  const check = Delta.safeParse(parsed);
  if (!check.success) {
    const errPath = outPath.replace(/\.json$/, ".invalid.json");
    mkdirSync(join(DATA, book, char, "deltas"), { recursive: true });
    writeFileSync(errPath, JSON.stringify(parsed, null, 2));
    console.error(`[extract] Delta failed schema validation — saved to ${errPath}:`);
    console.error("  " + check.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("\n  "));
    process.exit(1);
  }

  mkdirSync(join(DATA, book, char, "deltas"), { recursive: true });
  writeFileSync(outPath, JSON.stringify(check.data, null, 2) + "\n");
  console.log(`[extract] ✓ Wrote ${outPath}`);
  if (check.data.notes?.startsWith("REVIEW NEEDED")) {
    console.log(`[extract] ⚠ ${check.data.notes}`);
  }
  console.log(`[extract] Run 'npm run validate' to confirm consistency.`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
