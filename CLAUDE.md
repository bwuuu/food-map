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
- `src/server/`: Hono. `auth.ts` verifies the Cloudflare Access JWT on **every** route (pages included); `app.ts` serves `/api/places`, `/images/*` from the data dir, and `dist/`
- `src/web/`: the map page (Leaflet, vanilla TS). All place text is escaped: it will come from extracted captures
- `scripts/migrate-v1.ts`: one-off v1 `data.js` → `data/places.json`. Refuses to overwrite
- `data/` (gitignored, mounted at `/data`): `places.json` + `images/`. **This is the only copy of the data**; v1's original is on branch `legacy/v1`

## Rules

- Imports name the `.ts` file, and only erasable TypeScript is allowed (no enums, no namespaces), because Node runs the source.
- The server must refuse to start without `ACCESS_TEAM_DOMAIN` + `ACCESS_AUD`. `DEV_ACCOUNT` is for local development only.
- Coordinates keep full precision.
- Workflow is the devkit contract: an issue first, then a branch and a PR. UI checks go through `devkit:ui-verifier` using `.claude/skills/verify/SKILL.md`.
