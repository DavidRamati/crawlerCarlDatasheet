# Dungeon Crawler Carl — Interactive Statsheet

An interactive, **spoiler-safe** visual statsheet for the *Dungeon Crawler Carl*
series. Pick a chapter and see each party member's status **as it was at the
beginning of that chapter**: level, stats, gear, inventory, skills, effects,
contacts, dungeon floor, location — plus a full-body illustration of the
character dressed as they are at that point, and item icons with hover tooltips.

Currently ships **Book 1, chapters 1–8** (Carl + Princess Donut) as a working
demo. Everything is built to be additive: new chapters, characters, and books
are data/art drops that need no code changes.

Ⓒ All rights of Dungeon Crawler Carl's books and world are reserved to the Author : Matt Dinniman
This Repo does not provide the books or audio books.
Please buy the books / audio books legally while using this datasheet.
All graphics in the datasheet are AI generated and are free to use according to copyright laws.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
```

Other scripts:

```bash
npm run build        # type-check + production build to dist/
npm run preview      # serve the production build
npm run validate     # validate all data (schema + delta consistency)
```

## How it works

- **Stack:** Vite + React + TypeScript. Static SPA, no backend. Data and art
  live under `public/` and are fetched at runtime, so adding content never
  requires a rebuild.
- **Data model:** base snapshot + per-chapter deltas, composed at load
  (`src/data/reducer.ts`). `base.json` is a character's state at the START of
  their intro chapter; `deltas/chNN.json` records events DURING chapter NN. The
  view for chapter N = `base + every delta with chapterIndex < N`. Schema and
  validators live in `src/schema/` (zod → TypeScript types).
- **Spoiler safety:** the chapter dropdown lists only chapters that have data,
  and a character's tab appears only once they've joined the party by the
  selected chapter (`joinsPartyAtChapter`).
- **Changes box:** highlights what changed heading into the selected chapter
  (`src/data/diff.ts`).

## Adding chapters / characters / books

1. Extract chapter text (once per book):
   ```bash
   python3 tools/extract_text.py books/<book>.epub <bookId>
   ```
2. Add the chapter(s) to `public/data/<book>/manifest.json` (and the book to
   `public/data/index.json` if new).
3. Author each character's delta. The **low-token helper** builds a tight,
   one-chapter prompt (prior composed snapshot + just that chapter's text):
   ```bash
   npm run extract:delta -- book1 carl 9         # writes a prompt to paste into Claude
   npm run extract:delta -- book1 carl 9 --api   # or call the API directly (needs an Anthropic key)
   ```
   The API path uses `EXTRACT_MODEL` (default `claude-sonnet-5` — cheap and
   strong at extraction; set `EXTRACT_MODEL=claude-opus-4-8` for hard chapters),
   validates the reply with zod, and writes `deltas/chNN.json`. Conventions and
   the field reference live in `tools/extraction_prompt.md`.
4. `npm run validate`.

Other docs: [`docs/background-tuning.md`](docs/background-tuning.md) (scene
opacity/veil), [`docs/git-guide.md`](docs/git-guide.md) (what to exclude + Git
LFS for the art), [`docs/manual-art-generation.md`](docs/manual-art-generation.md).

> **Extension protocol:** if a chapter introduces a genuinely new *kind* of data
> the schema doesn't model (e.g. a later book's multi-room base with crafting
> tables), stop and decide how to model/display it — don't force-fit it. See
> `tools/extraction_prompt.md`.

## Art generation

The harness in `tools/artgen/` generates three kinds of art: full-body
character images (one per outfit-state), item icons, and per-chapter background
scenes. **Without credentials the app shows styled placeholders** — no setup
required to run the demo.

To generate real art, set a provider + key (in a `.env` file at the repo root or
as env vars) and run the scripts:

```bash
# .env  (git-ignored)
ARTGEN_PROVIDER=gemini          # gemini (recommended) | openai | flux
GEMINI_API_KEY=...              # from https://aistudio.google.com/apikey
# or: OPENAI_API_KEY=sk-...     # from https://platform.openai.com/api-keys
```

```bash
npm run artgen:ref              # canonical reference portrait per character
npm run artgen:characters       # one full-body image per outfit-state
npm run artgen:items            # one icon per item
npm run artgen:backgrounds      # one background per chapter scene
npm run artgen:prompts          # NO API: export all prompts + save-paths to a file
```

- **API keys are separate from your ChatGPT Plus / Gemini Advanced
  subscription** — get a developer key from the platform links above.
- Character bibles + style token: `art-src/<book>/<char>/bible.json`,
  `art-src/<book>/<char>/states.json`, `art-src/<book>/scenes.json`, and
  `tools/artgen/style.md` (Fabled-Lands painterly look). The reference portrait
  anchors character consistency when re-dressing across outfits.
- Outputs go to `public/art/<book>/...`; the harness is **idempotent** (only
  fills missing images) and **stops gracefully when a free-tier quota is
  exhausted** — just re-run after it refreshes to resume where it left off.
- After generating, refresh the app — images load automatically (no rebuild in
  dev; run `npm run build` for a production bundle).
- Prefer generating art by hand in the web UI (more free quota)? See
  [`docs/manual-art-generation.md`](docs/manual-art-generation.md).
