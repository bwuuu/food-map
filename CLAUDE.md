# CLAUDE.md

Food Map: a private map of places to eat, and **why** each was saved. One user, Android first, self-hosted with Docker on the homelab behind cloudflared and Cloudflare Access.

Read `docs/product-concept.md` (what and why) and `docs/sprints.md` (what's next) before changing behaviour.

## Commands

Node 24 (`.nvmrc`; `nvm use`). Node 24 strips TypeScript types itself, so the server runs `.ts` directly with no build.

```bash
npm run check        # tsc + vitest — what CI and the Docker build run
npm run build        # map page → dist/
npm run dev:server   # API + data on :8080, DEV_ACCOUNT=dev (no auth), DATA_DIR=./data
npm run dev          # Vite on :5178, proxies /api and /images to :8080
docker compose up -d --build   # production, 127.0.0.1:8088 (needs .env, see .env.example)
```

## Layout

- `src/place.ts`: the `Place` / `Source` model, shared by server, page and scripts
- `src/server/`: Hono. `auth.ts` verifies the Cloudflare Access JWT on **every** route (pages included). `app.ts` has the routes and the input checks (`parseSaveInput`): `POST /share` (the Android share target), `/api/places`, `/api/drafts`, save and skip, `/images/*` from the data dir, and `dist/`. `store.ts` owns every file read and write (atomic, serialized). `extract.ts` runs after each share, in the background: Maps link → coordinates (only goo.gl is ever fetched), screenshot → Claude (`claude-opus-5-5`, structured output, refusal fallback), name → Google Places. Each step may fail alone
- `src/web/`: two pages (Leaflet, vanilla TS). `index.html`/`main.ts` is the map (filters, Near me, visit form in the popup); `inbox.html`/`inbox.ts` turns shares into places. `public/manifest.webmanifest` holds the `share_target`. Shared text is untrusted: build DOM with `textContent`, or `esc()` in HTML strings
- `src/coords.ts`: parses pasted coordinates and Google Maps URLs. Shared by the server (Maps links) and the inbox
- `scripts/backup.sh <dir>`: dated archive of `data/`, keeps 30; run from host cron
- `scripts/migrate-v1.ts`: one-off v1 `data.js` → `data/places.json`. Refuses to overwrite
- `data/` (gitignored, mounted at `/data`): `places.json`, `drafts/` (inbox), `images/`. **This is the only copy of the data**; v1's original is on branch `legacy/v1`

## Rules

- Imports name the `.ts` file, and only erasable TypeScript is allowed (no enums, no namespaces), because Node runs the source.
- The server must refuse to start without `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD`. `DEV_ACCOUNT` is for local development only.
- Coordinates keep full precision.
- A share whose `googlePlaceId` is already on the map merges into that place as another source; it never overwrites reviewed fields.
- Extraction never blocks or loses a share, and the inbox never overwrites a field already typed.
- API keys are optional, come from Bitwarden at deploy time, and are never committed or written to `.env`. Tests use fixtures, never live APIs.
- Workflow is the devkit contract: an issue first, then a branch and a PR. UI checks go through `devkit:ui-verifier` using `.claude/skills/verify/SKILL.md`.
