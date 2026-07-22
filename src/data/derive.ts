import {
  EQUIPMENT_SLOTS,
  type Item,
  type Skill,
  type Snapshot,
  type StatBonuses,
} from "../schema";

/**
 * Derived views over a snapshot: effective stats (base + equipped item bonuses,
 * with a breakdown for tooltips) and the skill list augmented with skills
 * granted by equipped items. Base stats/skills stay in the data; bonuses live
 * on the items, so equipping/unequipping is the single source of truth.
 */

export const STAT_KEYS = [
  "strength",
  "constitution",
  "dexterity",
  "intelligence",
  "charisma",
] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const STAT_META: Record<StatKey, { abbr: string; label: string; affects: string }> = {
  strength: { abbr: "STR", label: "Strength", affects: "Melee/unarmed damage and carrying capacity." },
  constitution: { abbr: "CON", label: "Constitution", affects: "Health, stamina and physical resilience." },
  dexterity: { abbr: "DEX", label: "Dexterity", affects: "Speed, agility, accuracy and dodging." },
  intelligence: { abbr: "INT", label: "Intelligence", affects: "Mana pool and the power of spells." },
  charisma: { abbr: "CHA", label: "Charisma", affects: "Social influence, viewer appeal and loot luck." },
};

export interface StatBreakdown {
  base: number | null;
  bonuses: Array<{ name: string; amount: number }>;
  total: number | null;
}

function equippedItems(snap: Snapshot): Item[] {
  return EQUIPMENT_SLOTS.map((s) => snap.equipment[s]).filter((i): i is Item => !!i);
}

export function effectiveStats(snap: Snapshot): Record<StatKey, StatBreakdown> {
  const items = equippedItems(snap);
  const out = {} as Record<StatKey, StatBreakdown>;
  for (const key of STAT_KEYS) {
    const base = snap.stats[key];
    const bonuses: Array<{ name: string; amount: number }> = [];
    for (const it of items) {
      const amount = (it.statBonuses as StatBonuses | undefined)?.[key];
      if (amount) bonuses.push({ name: it.name, amount });
    }
    const sum = bonuses.reduce((a, b) => a + b.amount, 0);
    // If the base is unknown, the total is unknown too (stat not yet revealed).
    const total = base === null ? null : base + sum;
    out[key] = { base, bonuses, total };
  }
  return out;
}

export interface DerivedSkill extends Skill {
  grantedBy?: string;
}

export function derivedSkills(snap: Snapshot): DerivedSkill[] {
  const list: DerivedSkill[] = snap.skills.map((s) => ({ ...s }));
  const byId = new Map(list.map((s) => [s.id, s]));
  for (const it of equippedItems(snap)) {
    for (const g of it.grants ?? []) {
      const existing = byId.get(g.skill);
      if (existing) {
        existing.level = (existing.level ?? 0) + g.level;
        existing.grantedBy = it.name;
      } else {
        const skill: DerivedSkill = {
          id: g.skill,
          name: g.name ?? g.skill,
          level: g.level,
          description: `Granted by ${it.name}.`,
          grantedBy: it.name,
        };
        list.push(skill);
        byId.set(g.skill, skill);
      }
    }
  }
  return list;
}

/**
 * A snapshot with stats replaced by effective totals and skills by derived
 * skills. Used for diffing so the changes box / highlights reflect the values
 * actually shown (e.g. equipping a ring bumps STR).
 */
export function deriveViewSnapshot(snap: Snapshot): Snapshot {
  const eff = effectiveStats(snap);
  return {
    ...snap,
    stats: {
      strength: eff.strength.total,
      constitution: eff.constitution.total,
      dexterity: eff.dexterity.total,
      intelligence: eff.intelligence.total,
      charisma: eff.charisma.total,
    },
    skills: derivedSkills(snap),
  };
}
