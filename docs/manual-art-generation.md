# Generating art by hand (browser UI)

You get far more image quota through the ChatGPT / Gemini **web apps** than
through the developer API. This guide shows how to generate the art manually and
drop it into the app. (For the automated API path, see the README.)

## 1. Export the prompts

```bash
npm run artgen:prompts
```

This writes **`art-src/PROMPTS.md`** — one entry per image, each with:

- the exact **file path to save the PNG to**,
- the **aspect ratio** to use,
- the full **prompt** to paste, and
- a ✅/⬜ marker so you can see what's already done.

Re-run it any time (after adding chapters/items) to refresh the list; it never
overwrites your saved images.

## 2. Generate each image

Open `art-src/PROMPTS.md` and work top-to-bottom. **Do the reference portraits
first** — they're the consistency anchor for each character.

1. **Reference portrait** (per character): paste the prompt into ChatGPT or
   Gemini, generate, and **download the PNG** to the path shown, e.g.
   `art-src/book1/carl/_reference.png`.
2. **Character outfit states**: start a message with the character's reference
   image attached, then paste the outfit prompt (each entry names the reference
   to use). This keeps it recognisably the same Carl/Donut across outfits.
   - Gemini: upload the reference, then "keep this exact character but change the
     outfit to…" works well (this is Nano Banana's strength).
   - ChatGPT: attach the reference image and paste the prompt.
3. **Item icons** and **background scenes**: no reference needed — just paste the
   prompt. Use the noted aspect ratio (items square, scenes landscape).

## 3. Save to the exact path

Save/rename each downloaded PNG to the **Save PNG to** path from the prompt file.
Create folders as needed. Filenames must match exactly (the app looks them up by
id):

```
public/art/book1/carl/carl-01-boxers.png      # character outfit states
public/art/book1/donut/donut-03-tiara.png
public/art/book1/items/torch.png              # item icons
public/art/book1/scenes/scene-guild-hall.png  # chapter backgrounds
art-src/book1/carl/_reference.png             # reference (not shown in app)
```

## 4. See it in the app

Just **refresh** the browser (`npm run dev`) — images load automatically and the
placeholder disappears. For a production build run `npm run build`.

## Tips

- **Aspect ratios:** characters portrait (2:3), items square (1:1), scenes
  landscape (3:2). Matching these avoids letterboxing.
- **Consistency:** always feed the reference portrait when making outfit states.
  Two or three reference angles improve results further.
- **Style drift:** every prompt already starts with the shared Fabled-Lands
  style token (see `tools/artgen/style.md`); keep it in when editing.
- **Transparent item icons:** if your tool supports it, ask for a transparent or
  plain parchment background so icons sit cleanly in the list.
- You can mix approaches: generate some via API (`npm run artgen:*`) and the rest
  by hand — both write to the same folders and the harness skips files that
  already exist.
