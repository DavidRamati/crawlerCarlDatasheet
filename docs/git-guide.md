# Pushing this project to GitHub (with large image files)

## 1. What must NOT go in the repo

These are already listed in `.gitignore` — double-check none are tracked before
you push:

| Path | Why it's excluded |
| --- | --- |
| `books/*.epub` | **Copyrighted book.** Do not publish it. |
| `data-src/` | The **full extracted book text** (copyright). Regenerate locally with `tools/extract_text.py`. |
| `.env`, `.env.*` | **API keys / secrets.** |
| `node_modules/` | Installed with `npm install`. |
| `dist/` | Build output (`npm run build`). |
| `art-src/**/_reference.png` | Local character reference portraits; regenerate via artgen. |
| `current_look_screenshot.png` | Personal working screenshot. |

Everything else is fine to commit: `src/`, `tools/`, `public/data/**` (JSON —
short sourced quotes only), `public/art/**` (generated art), `art-src/*.json`
and bibles, docs, config.

> Note on `public/data/**`: these JSON files contain **short quotes** from the
> book in `sources`/`notes` for auditing. That's a small amount of text, but if
> you want to be extra-careful about publishing any book text, you can strip the
> `sources`/`notes` fields before committing (they aren't required at runtime).

Sanity check what would be committed:

```bash
git status                       # untracked/modified files
git ls-files books data-src      # should print NOTHING once ignored
```

## 2. Large image files → Git LFS

The generated art in `public/art/**/*.png` (full-body portraits and background
scenes especially) are binary blobs. GitHub warns at 50 MB and hard-rejects
files over 100 MB, and normal git stores every version of a binary forever,
bloating the repo. **Git LFS** stores big files outside the normal history and
keeps only a small pointer in the repo — this is the right tool for the art.

### One-time setup

```bash
# install the git-lfs binary (once per machine)
sudo apt-get install git-lfs      # Debian/Ubuntu
# or: brew install git-lfs        # macOS

git lfs install                   # once per machine
```

### In this repo (do this BEFORE committing the PNGs)

```bash
git init                          # if not already a repo
git lfs track "public/art/**/*.png"
git add .gitattributes            # LFS writes its config here — commit it
```

`git lfs track` creates/updates `.gitattributes` with a line like
`public/art/**/*.png filter=lfs diff=lfs merge=lfs -text`. **Commit
`.gitattributes` first** so every matching PNG is stored via LFS from the start.

### Commit & push

```bash
git add .
git commit -m "Statsheet app + generated art (art via LFS)"
git branch -M main
git remote add origin https://github.com/<you>/<repo>.git
git push -u origin main
```

### If you already committed PNGs the normal way (before LFS)

Migrate them into LFS and rewrite history:

```bash
git lfs migrate import --include="public/art/**/*.png"
git push --force-with-lease origin main
```

## 3. Watch the LFS free quota

GitHub's free tier gives **1 GB of LFS storage and 1 GB/month of bandwidth**.
The Book-1 demo art is nowhere near that, but if you add every book's art it can
add up. Options if you approach the limit:

- Keep art **out of the repo** entirely (add `public/art/` to `.gitignore`) and
  regenerate it from `art-src/PROMPTS.md` on each machine — the app already
  falls back to placeholders when art is missing.
- Or buy an LFS data pack, or host art on a CDN/bucket and load by URL.

For a public showcase repo, committing the demo art via LFS is fine.
