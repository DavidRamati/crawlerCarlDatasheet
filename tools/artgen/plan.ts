import { join, relative } from "node:path";
import {
  ART,
  ART_SRC,
  DATA,
  REPO,
  deltaFiles,
  listBooks,
  readJson,
  readJsonIf,
  readManifest,
} from "./util.ts";
import { STYLE_TOKEN, characterPrompt, itemPrompt, scenePrompt } from "./style.ts";

export type JobKind = "reference" | "character" | "item" | "scene";

export interface Job {
  kind: JobKind;
  book: string;
  id: string;
  label: string;
  prompt: string;
  size: string;
  targetAbs: string;
  targetRel: string;
  /** reference image to pass for consistency (character states) */
  referenceAbs?: string;
  /** human note about the reference, for the manual-prompt export */
  referenceNote?: string;
}

const rel = (abs: string) => relative(REPO, abs);

function humanize(id: string): string {
  return id.replace(/^[a-z]+-\d+-/i, "").replace(/-/g, " ") || id;
}

/** distinct appearance.stateId -> earliest chapter */
function discoverStates(book: string, char: string): string[] {
  const ids = new Set<string>();
  const base = readJson<any>(join(DATA, book, char, "base.json"));
  if (base?.appearance?.stateId) ids.add(base.appearance.stateId);
  for (const df of deltaFiles(book, char)) {
    const sid = readJson<any>(df)?.set?.appearance?.stateId;
    if (sid) ids.add(sid);
  }
  return [...ids];
}

/** distinct scene ids referenced by any character */
function discoverScenes(book: string): string[] {
  const ids = new Set<string>();
  for (const c of readManifest(book).characters) {
    const base = readJson<any>(join(DATA, book, c.id, "base.json"));
    if (base?.scene) ids.add(base.scene);
    for (const df of deltaFiles(book, c.id)) {
      const s = readJson<any>(df)?.set?.scene;
      if (s) ids.add(s);
    }
  }
  return [...ids];
}

function collectItems(book: string): Map<string, any> {
  const items = new Map<string, any>();
  const add = (it: any) => {
    if (it?.id && it?.name && !items.has(it.id)) items.set(it.id, it);
  };
  for (const c of readManifest(book).characters) {
    const base = readJson<any>(join(DATA, book, c.id, "base.json"));
    (base?.inventory ?? []).forEach(add);
    Object.values(base?.equipment ?? {}).forEach((v) => v && add(v));
    for (const df of deltaFiles(book, c.id)) {
      const d = readJson<any>(df);
      (d?.inventory?.add ?? []).forEach(add);
      Object.values(d?.set?.equipment ?? {}).forEach((v) => v && add(v));
    }
  }
  return items;
}

/** Build the full art job list. Order matters: references first so character
 *  jobs can use them. Filter with `kinds` to run a subset. */
export function buildJobs(kinds?: Set<JobKind>): Job[] {
  const want = (k: JobKind) => !kinds || kinds.has(k);
  const jobs: Job[] = [];

  for (const book of listBooks()) {
    const manifest = readManifest(book);

    for (const c of manifest.characters) {
      const bible = readJsonIf<any>(join(ART_SRC, book, c.id, "bible.json"));
      const statesMeta = readJsonIf<any[]>(join(ART_SRC, book, c.id, "states.json")) ?? [];
      const desc = bible?.description ?? c.name;
      const refAbs = join(ART_SRC, book, c.id, "_reference.png");

      if (want("reference") && bible?.referencePrompt) {
        jobs.push({
          kind: "reference",
          book,
          id: `${c.id}-reference`,
          label: `${c.name} — reference portrait`,
          prompt: `${STYLE_TOKEN}. ${bible.referencePrompt}`,
          size: "1024x1536",
          targetAbs: refAbs,
          targetRel: rel(refAbs),
        });
      }

      if (want("character")) {
        for (const sid of discoverStates(book, c.id)) {
          const meta = statesMeta.find((s) => s.id === sid);
          const outfit = meta?.outfit ?? humanize(sid);
          const targetAbs = join(ART, book, c.id, `${sid}.png`);
          jobs.push({
            kind: "character",
            book,
            id: sid,
            label: `${c.name} — ${meta?.label ?? humanize(sid)}`,
            prompt: characterPrompt(desc, outfit),
            size: "1024x1536",
            targetAbs,
            targetRel: rel(targetAbs),
            referenceAbs: refAbs,
            referenceNote: `Use your generated reference portrait of ${c.name} (${rel(refAbs)}) so it stays the same character.`,
          });
        }
      }
    }

    if (want("item")) {
      const overrides = readJsonIf<any[]>(join(ART_SRC, book, "items.json")) ?? [];
      for (const item of collectItems(book).values()) {
        const ov = overrides.find((o) => o.id === item.id);
        // Appearance basis: an override wins, else the item's own description
        // (kept for its visual detail; the prompt strips story context).
        const details = ov?.hint ?? ov?.description ?? item.description ?? item.effects;
        const targetAbs = join(ART, book, "items", `${item.id}.png`);
        jobs.push({
          kind: "item",
          book,
          id: item.id,
          label: `Item — ${item.name}`,
          prompt: itemPrompt(item.name, details),
          size: "1024x1024",
          targetAbs,
          targetRel: rel(targetAbs),
        });
      }
    }

    if (want("scene")) {
      const meta = readJsonIf<any[]>(join(ART_SRC, book, "scenes.json")) ?? [];
      for (const sid of discoverScenes(book)) {
        const m = meta.find((s) => s.id === sid);
        const targetAbs = join(ART, book, "scenes", `${sid}.png`);
        jobs.push({
          kind: "scene",
          book,
          id: sid,
          label: `Scene — ${m?.label ?? humanize(sid)}`,
          prompt: scenePrompt(m?.description ?? humanize(sid)),
          size: "1536x1024",
          targetAbs,
          targetRel: rel(targetAbs),
        });
      }
    }
  }

  return jobs;
}
