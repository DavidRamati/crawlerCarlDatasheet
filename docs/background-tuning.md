# Tuning the chapter background

The background scene sits behind everything and is controlled by **two CSS
variables** at the top of `src/styles/theme.css` (in the `:root { … }` block):

```css
--scene-opacity: 0.72;      /* how visible the background image is */
--scene-veil-alpha: 0.32;   /* how dark the overlay on top of it is */
```

## What each does

- **`--scene-opacity`** — the image's own opacity. `1` = full colour, `0` =
  invisible. Higher = more visible background.
- **`--scene-veil-alpha`** — a warm dark overlay drawn *on top* of the image to
  keep the parchment panels readable. Lower = brighter/less masked background;
  higher = darker.

## How to experiment

1. Run `npm run dev` and open the app.
2. Edit the two values in `src/styles/theme.css` and save — Vite hot-reloads, so
   the change appears instantly without a refresh.
3. Try combinations:

| Look | `--scene-opacity` | `--scene-veil-alpha` |
| --- | --- | --- |
| Subtle backdrop (default) | `0.72` | `0.32` |
| Very visible / vivid | `0.9` | `0.15` |
| Bold, full-bleed | `1` | `0.05` |
| Faint / muted | `0.5` | `0.45` |

Fastest way to poke at it live without editing files: open DevTools and change
them on the `:root` element, e.g.

```js
document.documentElement.style.setProperty('--scene-opacity', '0.9');
document.documentElement.style.setProperty('--scene-veil-alpha', '0.12');
```

When you like a combination, copy those numbers back into the `:root` block in
`src/styles/theme.css` to make it permanent.

> Tip: if panels start looking hard to read over a busy scene, raise
> `--scene-veil-alpha` a little rather than lowering `--scene-opacity` — the
> panels themselves stay opaque, so it's the gaps between them that get busy.
