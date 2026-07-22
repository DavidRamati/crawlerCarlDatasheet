import { z } from "zod";

/**
 * Single source of truth for the data model. zod schemas here produce both the
 * runtime validators (used by the loader and the validate script) and the
 * TypeScript types (via z.infer) used across the app.
 *
 * Composition rule (see plan): `base.json` is a character's state at the START
 * of their intro chapter B; each `deltas/chNN.json` records events that occur
 * DURING chapter NN. The state shown for a selected chapter N is
 *   base + every delta with chapterIndex < N
 * i.e. the state at the *beginning* of chapter N.
 */

export const SCHEMA_VERSION = 1;

export const RARITIES = [
  "common",
  "uncommon",
  "rare",
  "epic",
  "legendary",
  "unknown",
] as const;
export const Rarity = z.enum(RARITIES);
export type Rarity = z.infer<typeof Rarity>;

/** Flat stat bonuses an item confers while equipped. */
export const StatBonuses = z
  .object({
    strength: z.number(),
    constitution: z.number(),
    dexterity: z.number(),
    intelligence: z.number(),
    charisma: z.number(),
  })
  .partial();
export type StatBonuses = z.infer<typeof StatBonuses>;

/** A skill an item grants (or adds levels to) while equipped. */
export const SkillGrant = z.object({
  skill: z.string(), // skill id
  name: z.string().optional(),
  level: z.number().int(),
});
export type SkillGrant = z.infer<typeof SkillGrant>;

/** An inventory or equipped item. `effects`/`description` power the tooltip.
 *  `statBonuses`/`grants` are applied while the item is equipped and drive the
 *  stat breakdown and derived skills. */
export const Item = z.object({
  id: z.string(),
  name: z.string(),
  rarity: Rarity.default("unknown"),
  qty: z.number().int().positive().optional(),
  effects: z.string().optional(),
  description: z.string().optional(),
  icon: z.string().optional(),
  statBonuses: StatBonuses.optional(),
  grants: z.array(SkillGrant).optional(),
});
export type Item = z.infer<typeof Item>;

export const Skill = z.object({
  id: z.string(),
  name: z.string(),
  level: z.number().int().optional(),
  description: z.string().optional(),
});
export type Skill = z.infer<typeof Skill>;

export const Effect = z.object({
  id: z.string(),
  name: z.string(),
  kind: z.enum(["buff", "debuff", "neutral"]).default("neutral"),
  description: z.string().optional(),
});
export type Effect = z.infer<typeof Effect>;

export const Achievement = z.object({
  id: z.string(),
  name: z.string(),
  reward: z.string().optional(),
  description: z.string().optional(),
});
export type Achievement = z.infer<typeof Achievement>;

export const Contact = z.object({
  id: z.string(),
  name: z.string(),
  relation: z.string(),
  note: z.string().optional(),
});
export type Contact = z.infer<typeof Contact>;

export const Stats = z.object({
  strength: z.number().nullable().default(null),
  constitution: z.number().nullable().default(null),
  dexterity: z.number().nullable().default(null),
  intelligence: z.number().nullable().default(null),
  charisma: z.number().nullable().default(null),
});
export type Stats = z.infer<typeof Stats>;

export const Resource = z.object({
  cur: z.number().nullable().default(null),
  max: z.number().nullable().default(null),
});
export type Resource = z.infer<typeof Resource>;

export const EQUIPMENT_SLOTS = [
  "head",
  "body",
  "underwear",
  "hands",
  "feet",
  "weapon",
  "offhand",
  "accessory",
] as const;
export type EquipmentSlot = (typeof EQUIPMENT_SLOTS)[number];

export const Equipment = z.object({
  head: Item.nullable().default(null),
  body: Item.nullable().default(null),
  underwear: Item.nullable().default(null),
  hands: Item.nullable().default(null),
  feet: Item.nullable().default(null),
  weapon: Item.nullable().default(null),
  offhand: Item.nullable().default(null),
  accessory: Item.nullable().default(null),
});
export type Equipment = z.infer<typeof Equipment>;

export const Identity = z.object({
  name: z.string(),
  race: z.string().nullable().default(null),
  class: z.string().nullable().default(null),
  title: z.string().nullable().default(null),
});
export type Identity = z.infer<typeof Identity>;

export const Appearance = z.object({
  stateId: z.string(),
});

/** Flexible bag for uncategorised values (gold, personal space, crawler id…). */
export const Misc = z.record(
  z.union([z.string(), z.number(), z.boolean(), z.null()]),
);
export type Misc = z.infer<typeof Misc>;

/** A full, composed character snapshot. `base.json` files validate against this. */
export const Snapshot = z.object({
  schemaVersion: z.number(),
  chapterIndex: z.number().int(),
  identity: Identity,
  level: z.number().int().nullable().default(null),
  floor: z.number().int().nullable().default(null),
  location: z.string().nullable().default(null),
  stats: Stats,
  resources: z.object({ hp: Resource, mana: Resource }),
  equipment: Equipment,
  inventory: z.array(Item).default([]),
  skills: z.array(Skill).default([]),
  effects: z.array(Effect).default([]),
  achievements: z.array(Achievement).default([]),
  contacts: z.array(Contact).default([]),
  appearance: Appearance,
  /** background scene id for the current location (art/<book>/scenes/<id>.png) */
  scene: z.string().nullable().default(null),
  misc: Misc.default({}),
});
export type Snapshot = z.infer<typeof Snapshot>;

/* ------------------------------- Deltas ---------------------------------- */

const listOp = <T extends z.ZodTypeAny>(item: T) =>
  z
    .object({
      add: z.array(item).optional(),
      remove: z.array(z.string()).optional(),
      update: z.array(z.object({ id: z.string() }).passthrough()).optional(),
    })
    .strict();

/** Scalar/object fields overwritten via deep-merge. All optional. */
export const DeltaSet = z
  .object({
    identity: Identity.partial().optional(),
    level: z.number().int().nullable().optional(),
    floor: z.number().int().nullable().optional(),
    location: z.string().nullable().optional(),
    stats: Stats.partial().optional(),
    resources: z
      .object({ hp: Resource.partial(), mana: Resource.partial() })
      .partial()
      .optional(),
    equipment: Equipment.partial().optional(),
    appearance: Appearance.partial().optional(),
    scene: z.string().nullable().optional(),
    misc: Misc.optional(),
  })
  .strict();
export type DeltaSet = z.infer<typeof DeltaSet>;

export const Source = z.object({ field: z.string(), quote: z.string() });

export const Delta = z
  .object({
    schemaVersion: z.number(),
    chapterIndex: z.number().int(),
    notes: z.string().optional(),
    set: DeltaSet.optional(),
    inventory: listOp(Item).optional(),
    skills: listOp(Skill).optional(),
    effects: listOp(Effect).optional(),
    achievements: listOp(Achievement).optional(),
    contacts: listOp(Contact).optional(),
    sources: z.array(Source).optional(),
  })
  .strict();
export type Delta = z.infer<typeof Delta>;

/* ------------------------------ Manifest --------------------------------- */

export const ChapterRef = z.object({
  index: z.number().int(),
  label: z.string(),
  source: z.string().optional(),
});
export type ChapterRef = z.infer<typeof ChapterRef>;

export const CharacterRef = z.object({
  id: z.string(),
  name: z.string(),
  joinsPartyAtChapter: z.number().int(),
});
export type CharacterRef = z.infer<typeof CharacterRef>;

export const Manifest = z.object({
  book: z.object({ id: z.string(), title: z.string() }),
  characters: z.array(CharacterRef),
  chapters: z.array(ChapterRef),
  schemaVersion: z.number(),
});
export type Manifest = z.infer<typeof Manifest>;

/** Books index — lists every available book so the UI is purely additive. */
export const BooksIndex = z.object({
  books: z.array(z.object({ id: z.string(), title: z.string() })),
});
export type BooksIndex = z.infer<typeof BooksIndex>;
