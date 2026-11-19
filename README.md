# Sunset Cover — GTA-style cover maker

A free, offline browser web app that turns your photo and a caption into
GTA-style cover art: the iconic multi-panel poster look, a Vice City
neon-sunset grade, and bold condensed title lettering. Your photos never
leave your machine — everything runs in the browser, no upload, no watermark.

## Make a cover in 3 steps

1. Open the app (serve `app/` with any static server, e.g.
   `python3 -m http.server --directory app`, then open the page it prints).
2. Pick a size (Portrait 1080 × 1350, Square 1080 × 1080, Landscape
   1920 × 1080), type your title and subtitle, and place your photos:
   click a panel on the cover, then click a photo to put it there, or drag
   the photo on the cover to move it. Zoom and pan per panel, shuffle the
   crops, or fill every panel with one photo.
3. Hit **Export PNG** — the cover downloads at the size you picked.

Two sample photos are bundled so the app makes a cover before you upload
anything. They were made with an image model and are free to use.

## What is in this repo

- `app/` — the whole app, static files, no build step: `index.html`,
  `style.css`, `src/cover.js` (the renderer), `src/main.js` (the editor),
  `src/shots.js` (fixed scenes for screenshots), `fonts/` (Anton and Bebas
  Neue, SIL Open Font License — see `fonts/OFL.txt`), `samples/`.
- `main.ts` — the entry program: copies `app/` and `screenshots/` to
  `/output` and writes `/output/dossier.json` with the vendored make.fun
  library (`vendor/makefun-app.ts`, the kit's copy, unchanged).
- `screenshots/` — 4 screenshots taken from the app itself.
- `.makefun/owner.json` — the payout wallet for this entry.

## Notes

- No Rockstar Games logo, wordmark, artwork, character or font is used.
  The title lettering is Anton and the subtitle is Bebas Neue, both under
  the SIL Open Font License and shipped as files under `app/fonts/`.
- The app makes no network request: every script, font and sample image is
  a file under `app/`, and photos are read on your machine with
  `FileReader` / object URLs, never uploaded.

## Entry

Built for make.fun's **gta6-cover-art-01** ("Make GTA 6 Cover Art") bounty.
Run `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts` to build the
submission output locally, then `node <kit>/cli/makefun.mjs check --kit <kit> --repo .`.
