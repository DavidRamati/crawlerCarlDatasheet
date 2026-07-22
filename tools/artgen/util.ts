import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

export const REPO = join(new URL("../..", import.meta.url).pathname);

/**
 * Minimal .env loader (no dependency). Reads KEY=VALUE lines from the repo-root
 * .env and populates process.env without overwriting existing vars. Call once at
 * the top of each artgen script so keys can live in a git-ignored .env file.
 */
export function loadEnv(): void {
  const envPath = join(REPO, ".env");
  if (!existsSync(envPath)) return;
  for (const raw of readFileSync(envPath, "utf-8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let val = line.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) process.env[key] = val;
  }
}
export const DATA = join(REPO, "public", "data");
export const ART = join(REPO, "public", "art");
export const ART_SRC = join(REPO, "art-src");

export function readJson<T = any>(path: string): T {
  return JSON.parse(readFileSync(path, "utf-8")) as T;
}

export function readJsonIf<T = any>(path: string): T | null {
  return existsSync(path) ? readJson<T>(path) : null;
}

/** Lists book ids present under public/data (each with a manifest.json). */
export function listBooks(): string[] {
  if (!existsSync(DATA)) return [];
  return readdirSync(DATA, { withFileTypes: true })
    .filter((d) => d.isDirectory() && existsSync(join(DATA, d.name, "manifest.json")))
    .map((d) => d.name);
}

export interface Manifest {
  book: { id: string; title: string };
  characters: Array<{ id: string; name: string; joinsPartyAtChapter: number }>;
  chapters: Array<{ index: number; label: string }>;
}

export function readManifest(book: string): Manifest {
  return readJson<Manifest>(join(DATA, book, "manifest.json"));
}

/** Absolute paths to a character's delta files, sorted by chapter. */
export function deltaFiles(book: string, char: string): string[] {
  const dir = join(DATA, book, char, "deltas");
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((f) => f.endsWith(".json"))
    .sort()
    .map((f) => join(dir, f));
}
