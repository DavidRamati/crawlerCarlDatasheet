import type { Snapshot } from "../schema";

/**
 * Compares two composed snapshots (previous chapter view vs current) to drive
 * the "what changed" box and per-field highlighting.
 */

export type Change =
  | { kind: "scalar"; key: string; label: string; from: unknown; to: unknown }
  | { kind: "add"; list: string; id: string; name: string }
  | { kind: "remove"; list: string; id: string; name: string }
  | { kind: "update"; list: string; id: string; name: string };

export interface ChangeSet {
  changes: Change[];
  /** scalar field keys that changed, e.g. "level", "stats.strength" */
  changedKeys: Set<string>;
  /** `${list}:${id}` -> how the list item changed */
  itemStatus: Map<string, "added" | "updated">;
}

const SCALARS: Array<{ key: string; label: string; get: (s: Snapshot) => unknown }> = [
  { key: "identity.class", label: "Class", get: (s) => s.identity.class },
  { key: "identity.race", label: "Race", get: (s) => s.identity.race },
  { key: "identity.title", label: "Title", get: (s) => s.identity.title },
  { key: "level", label: "Level", get: (s) => s.level },
  { key: "floor", label: "Floor", get: (s) => s.floor },
  { key: "location", label: "Location", get: (s) => s.location },
  { key: "stats.strength", label: "Strength", get: (s) => s.stats.strength },
  { key: "stats.constitution", label: "Constitution", get: (s) => s.stats.constitution },
  { key: "stats.dexterity", label: "Dexterity", get: (s) => s.stats.dexterity },
  { key: "stats.intelligence", label: "Intelligence", get: (s) => s.stats.intelligence },
  { key: "stats.charisma", label: "Charisma", get: (s) => s.stats.charisma },
  { key: "resources.hp.max", label: "Max HP", get: (s) => s.resources.hp.max },
  { key: "resources.mana.max", label: "Max Mana", get: (s) => s.resources.mana.max },
];

const LISTS: Array<{ name: string; get: (s: Snapshot) => Array<{ id: string; name: string }> }> = [
  { name: "inventory", get: (s) => s.inventory },
  { name: "skills", get: (s) => s.skills },
  { name: "effects", get: (s) => s.effects },
  { name: "achievements", get: (s) => s.achievements },
  { name: "contacts", get: (s) => s.contacts },
];

const EMPTY: ChangeSet = {
  changes: [],
  changedKeys: new Set(),
  itemStatus: new Map(),
};

export function compareSnapshots(
  prev: Snapshot | null,
  cur: Snapshot,
): ChangeSet {
  if (!prev) return EMPTY;
  const changes: Change[] = [];
  const changedKeys = new Set<string>();
  const itemStatus = new Map<string, "added" | "updated">();

  for (const f of SCALARS) {
    const from = f.get(prev);
    const to = f.get(cur);
    if (JSON.stringify(from) !== JSON.stringify(to)) {
      changedKeys.add(f.key);
      changes.push({ kind: "scalar", key: f.key, label: f.label, from, to });
    }
  }

  for (const l of LISTS) {
    const before = new Map(l.get(prev).map((i) => [i.id, i]));
    const after = new Map(l.get(cur).map((i) => [i.id, i]));
    for (const [id, item] of after) {
      const prior = before.get(id);
      if (!prior) {
        itemStatus.set(`${l.name}:${id}`, "added");
        changes.push({ kind: "add", list: l.name, id, name: item.name });
      } else if (JSON.stringify(prior) !== JSON.stringify(item)) {
        itemStatus.set(`${l.name}:${id}`, "updated");
        changes.push({ kind: "update", list: l.name, id, name: item.name });
      }
    }
    for (const [id, item] of before) {
      if (!after.has(id)) {
        changes.push({ kind: "remove", list: l.name, id, name: item.name });
      }
    }
  }

  return { changes, changedKeys, itemStatus };
}
