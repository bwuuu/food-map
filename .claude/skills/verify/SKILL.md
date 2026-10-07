---
name: verify
description: How to run and check food-map in a real browser. Read by devkit:ui-verifier before any runtime or visual check of this repo.
---

# Verify food-map

## Static checks
What CI runs, from the repo root (Node 24: `source ~/.nvm/nvm.sh && nvm use 24`):

```bash
npm ci && npm run check && npm run build
```

The verifier skips these unless its brief asks; the main session runs them.

## Runtime target and launch
A browser, driven by the Playwright MCP tools (`mcp__plugin_playwright_playwright__*`). Chromium only.

Run the **built** app through the real server, not the Vite dev server: it's one process, and it's what production serves.

1. Make a throwaway copy of the data, so a check can never touch the real `data/`:
   `cp -r data <scratch>/data`. If the repo has no `data/`, the brief must say where test data is; without data the map shows "No places yet."
2. `npm run build`
3. In the background:
   `DEV_ACCOUNT=dev DATA_DIR=<scratch>/data WEB_DIR=dist PORT=8095 node src/server/index.ts`
   then wait: `until curl -sf http://localhost:8095/ >/dev/null; do sleep 1; done`.
   If the brief says a server is already running, use it and don't stop it.
4. **Sizes:** phone is 390×844 with touch; desktop is 1440×900 without. Every UI check runs at both.

Put scripts and screenshots in the directory the brief names, never in the repo. Don't edit repo files. Stop the server you started.

## App knowledge and known quirks
- **One page: the map** (`#map`, Leaflet). On load it fetches `/api/places` and fits the view to every place (Taipei).
- **Pins** are SVG circles: `path.leaflet-interactive`. Orange (`--want`) means "want to go"; green (`--visited`) means visited. Click a pin to open its popup.
- **Popup:** `.leaflet-popup-content .place`. It contains `h2` (the name), a status badge, the meta line, `.why`, then "Order", "Saved because of" (sources, which can include a screenshot `img` from `/images/…`), "Notes" and an "Open in Google Maps" link.
- **Status banner:** `#status` shows "No places yet." or "Could not load places…".
- With the real data there are 7 places, all "want to go". 芮秋 Rachel and landed have screenshots.
- **External requests are expected** only to `*.basemaps.cartocdn.com` (map tiles). Any other host is a finding.
- Tiles load asynchronously. Wait for `img.leaflet-tile-loaded` before taking screenshots. If the sandbox has no internet, tiles stay grey: report that, it isn't an app failure.
- Leaflet pans the map to fit an opened popup (`autoPanPadding` 16 px). Take the screenshot after the pan settles (~300 ms).

## What "verified" means
- Every numbered check in the brief gets PASS, FAIL or NOT VERIFIABLE, each with a screenshot path that shows it, at both sizes.
- No console errors and no horizontal scroll at either size.
- A popup must fit inside the viewport at phone width, with no clipped text.
- Visual judgement ("readable", "cramped") is reported with a severity (high/med/low) and the screenshot it comes from.

## Limits
- **Cloudflare Access can't be checked here.** Locally `DEV_ACCOUNT` bypasses it. The JWT check is covered by `src/server/auth.test.ts` and `app.test.ts`. Mark sign-in behaviour NOT VERIFIABLE.
- **Docker isn't available** to this user (not in the `docker` group). The container is checked by bwu on the homelab.
- No real Android: the phone size is emulated in Chromium. The share sheet (Sprint 1+) is NOT VERIFIABLE; only bwu can test it on a phone.
