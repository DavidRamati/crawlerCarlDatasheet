import { existsSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { BooksIndex, Delta, Manifest, Snapshot } from "../src/schema/index.ts";

/**
 * Validates all statsheet data: schema conformance (via zod) plus delta
 * consistency — unique ids within each list, and every remove/update id must
 * exist in the state accumulated so far. Exits non-zero on the first problem.
 */

const REPO = join(new URL("..", import.meta.url).pathname);
const DATA = join(REPO, "public", "data");

const LIST_FIELDS = ["inventory", "skills", "effects", "achievements", "contacts"] as const;

const errors: string[] = [];
const err = (m: string) => errors.push(m);
const readJson = (p: string) => JSON.parse(readFileSync(p, "utf-8"));

function validateCharacter(book: string, charId: string, chapters: number[]) {
  const dir = join(DATA, book, charId);
  const baseParsed = Snapshot.safeParse(readJson(join(dir, "base.json")));
  if (!baseParsed.success) {
    err(`${book}/${charId}/base.json: ${baseParsed.error.issues[0]?.message}`);
    return;
  }
  const base = baseParsed.data;

  // Track the id set per list as we fold deltas in chapter order.
  const ids: Record<string, Set<string>> = {};
  for (const f of LIST_FIELDS) ids[f] = new Set((base as any)[f].map((i: any) => i.id));

  const deltaDir = join(dir, "deltas");
  const files = existsSync(deltaDir)
    ? readdirSync(deltaDir).filter((f) => f.endsWith(".json")).sort()
    : [];

  for (const file of files) {
    const parsed = Delta.safeParse(readJson(join(deltaDir, file)));
    if (!parsed.success) {
      err(`${book}/${charId}/deltas/${file}: ${parsed.error.issues[0]?.path}: ${parsed.error.issues[0]?.message}`);
      continue;
    }
    const d = parsed.data;
    const tag = `${book}/${charId}/deltas/${file}`;
    if (!chapters.includes(d.chapterIndex)) err(`${tag}: chapterIndex ${d.chapterIndex} not in manifest`);
    if (d.chapterIndex < base.chapterIndex) err(`${tag}: chapterIndex before intro chapter ${base.chapterIndex}`);

    for (const f of LIST_FIELDS) {
      const op = (d as any)[f] as { add?: any[]; remove?: string[]; update?: any[] } | undefined;
      if (!op) continue;
      for (const id of op.remove ?? []) {
        if (!ids[f].has(id)) err(`${tag}: ${f}.remove references missing id "${id}"`);
        ids[f].delete(id);
      }
      for (const u of op.update ?? []) {
        if (!ids[f].has(u.id)) err(`${tag}: ${f}.update references missing id "${u.id}"`);
      }
      for (const it of op.add ?? []) {
        // Re-adding an existing id is allowed for stackable (qty) items.
        if (ids[f].has(it.id) && it.qty === undefined) {
          err(`${tag}: ${f}.add duplicate id "${it.id}" (non-stackable)`);
        }
        ids[f].add(it.id);
      }
    }
  }
}

function main() {
  const idxPath = join(DATA, "index.json");
  if (!existsSync(idxPath)) {
    console.error("Missing public/data/index.json");
    process.exit(1);
  }
  const index = BooksIndex.safeParse(readJson(idxPath));
  if (!index.success) {
    console.error("index.json invalid:", index.error.issues);
    process.exit(1);
  }

  for (const { id: book } of index.data.books) {
    const mParsed = Manifest.safeParse(readJson(join(DATA, book, "manifest.json")));
    if (!mParsed.success) {
      err(`${book}/manifest.json: ${mParsed.error.issues[0]?.message}`);
      continue;
    }
    const chapters = mParsed.data.chapters.map((c) => c.index);
    for (const c of mParsed.data.characters) validateCharacter(book, c.id, chapters);
  }

  if (errors.length) {
    console.error(`\n✗ ${errors.length} validation error(s):`);
    for (const e of errors) console.error("  - " + e);
    process.exit(1);
  }
  console.log("✓ All data valid.");
}

main();
