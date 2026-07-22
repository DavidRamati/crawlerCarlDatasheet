# Chapter Extraction Prompt & Data-Authoring Spec

This is the repeatable procedure for turning a chapter of *Dungeon Crawler Carl*
into structured statsheet data. Follow it exactly for every character × chapter.

## Source of truth

- Plain chapter text: `data-src/<book>/chapters_txt/chNN.txt` (TOC chapter numbering).
- Schema (the contract): `src/schema/index.ts` — read it before authoring.
- Output data: `public/data/<book>/<char>/base.json` and `.../deltas/chNN.json`.

## Composition convention (critical — do not deviate)

- `base.json` = the character's state at the **START of their intro chapter B**
  (Carl B=1; Donut B=3). Its `chapterIndex` = B. Fill every field; use `null`
  for anything not yet known on the page (e.g. stats before they're revealed).
- `deltas/chNN.json` = the events that occur **DURING chapter NN**, expressed as
  changes to the previous state. Author the delta where the event happens.
- The app shows, for a selected chapter N, `base + every delta with chapterIndex < N`
  — i.e. the state at the **beginning of chapter N**. So something revealed during
  chapter 4 lives in `deltas/ch04.json` and first appears when the user selects
  chapter 5. This is intended.

## Delta format

Only include fields that changed. Shape (see `Delta` in the schema):

```json
{
  "schemaVersion": 1,
  "chapterIndex": 4,
  "notes": "Short human summary of what changed this chapter.",
  "set": { "level": 2, "floor": 1, "location": "…", "stats": { "strength": 6 } },
  "inventory": { "add": [ { "id": "…", "name": "…", "rarity": "…", "qty": 1,
                            "effects": "…", "description": "…" } ],
                 "remove": ["item-id"], "update": [ { "id": "…", "qty": 2 } ] },
  "skills":       { "add": [ { "id": "…", "name": "…", "level": 1, "description": "…" } ] },
  "effects":      { "add": [ { "id": "…", "name": "…", "kind": "buff|debuff|neutral", "description": "…" } ] },
  "achievements": { "add": [ { "id": "…", "name": "…", "reward": "…", "description": "…" } ] },
  "contacts":     { "add": [ { "id": "…", "name": "…", "relation": "…", "note": "…" } ] },
  "sources": [ { "field": "stats", "quote": "Strength: 6 / Intelligence: 3 / …" } ]
}
```

Rules:
- `set` deep-merges: `"stats": { "strength": 6 }` changes only strength.
- List ops: `add` new entries, `remove` by id, `update` by id (partial). Stackable
  items (with `qty`) added by an existing id bump the quantity.
- Equipment lives under `set.equipment.<slot>` where slot ∈ head, body,
  **underwear**, hands, feet, weapon, offhand, accessory; the value is an Item
  object or `null`. (Underwear/undergarments — e.g. Carl's boxers — go in the
  `underwear` slot so worn basics show up.)
- **Add a `sources` quote for every non-trivial change** so data is auditable.
- Never invent numbers. If the book doesn't state it, leave it `null`/omit it.
- `rarity` ∈ common, uncommon, rare, epic, legendary, unknown.

### Item stat/skill bonuses (IMPORTANT — model on the item, don't bake in)

If an item grants stat points or skill levels **while equipped**, put them ON the
item, don't fold them into the character's `stats`/`skills`. The app derives the
effective total and the tooltip breakdown from the equipped item:

- `statBonuses`: `{ "strength": 3 }` — flat stat bonuses while equipped.
- `grants`: `[ { "skill": "powerful-strike", "name": "Powerful Strike", "level": 3 } ]`
  — skills the item grants/adds levels to while equipped. These appear in the
  Skills panel automatically, tagged with their source.

So Carl's base `stats.strength` stays 6; the Toe Ring carries
`"statBonuses": { "strength": 3 }`, and the app shows STR 9 with "base 6, +3 Toe
Ring" on hover. Only put a value directly in `stats` when the book states a
permanent, item-independent change (e.g. a level-up point spend).

### Appearance & scene

- `appearance.stateId`: set in a delta only when the character's visible look
  changes (new outfit/major gear). Add a matching entry to
  `art-src/<book>/<char>/states.json` with a one-line `outfit` description.
- `scene`: set in a delta when the party's location changes to a new place worth
  depicting (drives the chapter background image). Add a matching entry to
  `art-src/<book>/scenes.json` with a one-line `description`. Keep the number of
  scenes reasonable (one per distinct location, not per chapter).

## Appearance / outfit states

Set `appearance.stateId` in `base.json`, and in a delta **only when the
character's visible look meaningfully changes** (new outfit, major gear). Use ids
like `carl-01-boxers`, `carl-02-coat`. In that delta's `notes`, describe the new
outfit in one sentence (used later to generate the art). Report the full list of
states you defined (id, label, firstChapter, one-line outfit description).

## EXTENSION PROTOCOL (read carefully)

Routine changes — new item, stat change, new skill/effect/achievement, party
join, outfit change — just author them per above.

**But if a chapter introduces a genuinely NEW KIND of state that the schema does
not model** (a structure with no home in identity/level/floor/location/stats/
resources/equipment/inventory/skills/effects/achievements/contacts/appearance/
misc — e.g. Book 3's multi-room personal-space "house" with crafting tables and
leveled upgrades), **STOP and ask the user** how to model and display it. Do not
force it into `misc`, and do not silently drop it. Small one-off facts (gold
count, a personal-space availability note) are fine in `misc`.
