import {
  BooksIndex,
  Delta,
  Manifest,
  Snapshot,
  type CharacterRef,
} from "../schema";
import { compose, type ComposedCharacter } from "./reducer";

/**
 * Fetches + validates all data for a book and composes per-chapter snapshots.
 * Everything lives under public/ and is fetched at runtime so adding data never
 * requires a rebuild.
 */

const DATA_ROOT = "data";

async function getJson(path: string): Promise<unknown> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  return res.json();
}

/**
 * Optional fetch — returns null when a file is absent. Handles both a real 404
 * (static hosts, vite preview) and the vite dev server's SPA fallback, which
 * serves index.html (HTML, status 200) for a missing path.
 */
async function getJsonOptional(path: string): Promise<unknown | null> {
  const res = await fetch(`${import.meta.env.BASE_URL}${path}`);
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to load ${path}: ${res.status}`);
  const contentType = res.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) return null; // SPA fallback → treat as absent
  return res.json();
}

export interface CharacterData {
  ref: CharacterRef;
  composed: ComposedCharacter;
}

export interface BookData {
  manifest: Manifest;
  characters: Map<string, CharacterData>;
}

export async function loadBooksIndex(): Promise<BooksIndex> {
  return BooksIndex.parse(await getJson(`${DATA_ROOT}/index.json`));
}

export async function loadBook(bookId: string): Promise<BookData> {
  const base = `${DATA_ROOT}/${bookId}`;
  const manifest = Manifest.parse(await getJson(`${base}/manifest.json`));
  const chapterIndices = manifest.chapters.map((c) => c.index);

  const characters = new Map<string, CharacterData>();
  for (const ref of manifest.characters) {
    const baseSnap = Snapshot.parse(await getJson(`${base}/${ref.id}/base.json`));

    // Deltas are named ch<NN>.json for every chapter after the intro chapter.
    const deltas: Delta[] = [];
    for (const idx of chapterIndices) {
      if (idx < baseSnap.chapterIndex) continue;
      const raw = await getJsonOptional(
        `${base}/${ref.id}/deltas/ch${String(idx).padStart(2, "0")}.json`,
      );
      if (raw) deltas.push(Delta.parse(raw));
    }

    characters.set(ref.id, {
      ref,
      composed: compose(baseSnap, deltas, chapterIndices),
    });
  }

  return { manifest, characters };
}
