import type { Delta, Item, Snapshot } from "../schema";

/**
 * Folds a base snapshot + ordered deltas into per-chapter snapshots.
 *
 * Composition rule: the snapshot shown for chapter N is
 *   base + every delta with chapterIndex < N
 * (state at the *start* of chapter N). base itself is the state at the start of
 * the character's intro chapter B, so startOf(B) === base.
 */

type ListName = "inventory" | "skills" | "effects" | "achievements" | "contacts";
const LIST_NAMES: ListName[] = [
  "inventory",
  "skills",
  "effects",
  "achievements",
  "contacts",
];

const clone = <T>(v: T): T => structuredClone(v);

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null && !Array.isArray(v);
}

/** Deep-merge `src` into `dst`. `null` overwrites; nested objects merge key-by-key. */
function deepMerge(dst: Record<string, unknown>, src: Record<string, unknown>) {
  for (const [k, v] of Object.entries(src)) {
    if (isPlainObject(v) && isPlainObject(dst[k])) {
      deepMerge(dst[k] as Record<string, unknown>, v);
    } else {
      dst[k] = v as unknown;
    }
  }
}

function applyListOp<T extends { id: string }>(
  list: T[],
  op: { add?: T[]; remove?: string[]; update?: Array<{ id: string }> } | undefined,
): T[] {
  if (!op) return list;
  let next = list.slice();
  if (op.remove) next = next.filter((it) => !op.remove!.includes(it.id));
  if (op.update) {
    for (const patch of op.update) {
      const i = next.findIndex((it) => it.id === patch.id);
      if (i !== -1) next[i] = { ...next[i], ...(patch as Partial<T>) };
    }
  }
  if (op.add) {
    for (const item of op.add) {
      const i = next.findIndex((it) => it.id === item.id);
      // For stackable items, adding an existing id bumps quantity.
      if (i !== -1 && "qty" in item) {
        const cur = next[i] as unknown as Item;
        const add = item as unknown as Item;
        next[i] = { ...next[i], qty: (cur.qty ?? 1) + (add.qty ?? 1) } as T;
      } else if (i === -1) {
        next.push(item);
      } else {
        next[i] = item;
      }
    }
  }
  return next;
}

/** Apply a single delta to a snapshot clone (mutates and returns it). */
export function applyDelta(state: Snapshot, delta: Delta): Snapshot {
  if (delta.set) deepMerge(state as unknown as Record<string, unknown>, delta.set);
  for (const name of LIST_NAMES) {
    const op = delta[name];
    if (op) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (state as any)[name] = applyListOp((state as any)[name], op as any);
    }
  }
  return state;
}

export interface ComposedCharacter {
  /** intro chapter (base.chapterIndex) */
  introChapter: number;
  /** snapshot at the start of chapter N, for every N the character exists in */
  byChapter: Map<number, Snapshot>;
  /** delta.notes keyed by the delta's own chapterIndex (the chapter of events) */
  notesByChapter: Map<number, string>;
}

/**
 * Compose start-of-chapter snapshots for every chapter in `chapterIndices`
 * that is >= the character's intro chapter.
 */
export function compose(
  base: Snapshot,
  deltas: Delta[],
  chapterIndices: number[],
): ComposedCharacter {
  const ordered = deltas.slice().sort((a, b) => a.chapterIndex - b.chapterIndex);
  const introChapter = base.chapterIndex;
  const byChapter = new Map<number, Snapshot>();
  const notesByChapter = new Map<number, string>();

  for (const d of ordered) {
    if (d.notes) notesByChapter.set(d.chapterIndex, d.notes);
  }

  for (const n of chapterIndices) {
    if (n < introChapter) continue;
    const state = clone(base);
    for (const d of ordered) {
      if (d.chapterIndex < n) applyDelta(state, d);
    }
    state.chapterIndex = n;
    byChapter.set(n, state);
  }
  return { introChapter, byChapter, notesByChapter };
}
