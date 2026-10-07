# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A static, single-page Leaflet.js map of personal restaurant picks (currently Taipei-focused). No build system, no package manager, no tests, no framework — just `index.html`, `data.js`, and an `images/` folder. Deployed by serving the directory (GitHub Pages or any static host).

## Running locally

```bash
python -m http.server 8000    # or: npx serve
```

Then open `http://localhost:8000`. There is nothing to build or install.

## Architecture (both files matter together)

- **`data.js`** — exports a single global `const foodData = [...]` (no modules). This file is the database.
- **`index.html`** — inlines all CSS and JS. Loads Leaflet from a CDN, then `data.js`, then its own script that reads `foodData` and renders markers + filter/legend panels.
- **`images/`** — inspiration screenshots referenced by a source record's `image` field, e.g. `./images/<slug>_screenshot.jpg`.

The map initializes at `[25.05, 121.55]` (Taipei) with CARTO dark tiles. Markers are `L.circleMarker`s colored by `tierColors[rank]`. Popups are built as an HTML template string in `createMarkers()` — when adding a new data field, wire it into that template or it won't surface in the UI.

## The data schema is the product

The schema in `data.js` exists to solve a specific problem called out in the file's trailing comment: *"I saved it on Google Maps but forgot why."* Beyond the obvious fields (name, lat/lng, rank, area), every entry should carry:

- `sources` — an **array** of inspiration records. Each record: `{ type, detail, link?, image? }`. Types are `Instagram`, `YouTube`, or `Friend`. A single place can have multiple sources (e.g., friend told you, then you saw it on IG — add both). `link` is the post/video URL; `image` is a local path in `images/`.
- `whyTry` — the personal hook (vibe, dish, decor)
- `dishRecommendations` — what to order, pulled from the source
- `mood` / `bestFor` — occasion and timing

Multiple restaurants can share one source `link` when they come from the same post (see the `DXMeLh4geME` IG post feeding several current entries). Preserve that linkage when adding entries.

The source filter in the UI matches a place if **any** of its source records has a matching `type` — so adding a `Friend` source alongside an `Instagram` source makes the place visible under either filter.

Ranks are `T0`–`T5`: T0 = Not Tried, T1 = Bad, T2 = Not Worth It, T3 = Okay, T4 = Would Go Back, T5 = Favorite. Higher is better; T0 is the default for anything unvisited. `tierColors`/`tierLabels` in `index.html`, the filter buttons, and the legend markup must stay in sync if the scale changes.

## Conventions when adding restaurants

- Get `lat`/`lng` from Google Maps right-click → "What's here?". Precise coordinates matter — a recent commit (`f461f02`) existed solely to tighten a location. Don't round to 4 decimals if the source gives more.
- Include a Plus Code in `plusCode` when available (most existing entries have one).
- Put hours, phone, website, and any LGBTQ/accessibility notes inside `notes` as free text — there are no dedicated fields for them.
- If you add a screenshot, save it to `images/<name>_screenshot.jpg` and reference it from the relevant source record's `image` field.
- New `area` values automatically appear as filter buttons (built from `foodData` in `initAreaButtons()`), so area naming should stay consistent (e.g. `Zhongshan District`, not `Zhongshan`).

## What the README covers

`README.md` is the public-facing template doc (how to fork, customize colors, swap tile providers, deploy to Pages/Netlify/Vercel). Refer users there for deployment; don't duplicate that material when answering.
