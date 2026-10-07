# Sprint plan

Last updated: 2026-10-07

About 4 weeks to "use it daily". Each sprint ships something usable on the phone.
Concept and decisions: `product-concept.md`.

| Sprint | Length | Ships |
|---|---|---|
| 0 | 3 days | Skeleton: container, tunnel, Access, the 7 places on a map |
| 1 | 1 week | **Capture**: share from Android, then the raw share lands in an inbox; fill it in by hand and save |
| 2 | 1 week | **Extraction**: Claude and Places pre-fill the draft |
| 3 | 1 week | **Merge and daily use**: de-duplication, filters, visited and rank, backups |
| 4 | 3 days | **Bulk import** from Google Takeout saved lists |
| — | 2–4 weeks | **Use it.** Build nothing. Decide the next thing from real use |

Sprint 1 ships manual capture *before* extraction on purpose. If sharing a
screenshot and typing one line takes under 30 seconds, that alone beats v1.
Extraction then makes it faster; it isn't what makes it work.

## Definition of done (every sprint)

1. `npm run check` passes (typecheck and Vitest) and CI is green
2. Deployed: `docker compose up -d --build` on the homelab, reachable at the tunnel hostname
3. Verified at **375px (phone)** and **1440px (desktop)** by the `devkit:ui-verifier` agent, following `.claude/skills/verify/SKILL.md`; verdict lines pasted into the PR
4. Anything not verifiable in a browser is listed in the PR. Example: the Android share sheet itself, which only you can test on the phone

## Sprint 0: skeleton (3 days)

- [ ] `package.json`, TypeScript, Vite, Vitest, `npm run check` (no ESLint: strict tsc covers it for now)
- [ ] GitHub Actions running `npm run check` on PRs
- [ ] `Dockerfile` (multi-stage; the build runs the checks) and `docker-compose.yml` on `127.0.0.1:8088`, with `./data` mounted
- [ ] Hono server: static files, plus `GET /api/places`. Access JWT check; refuses to start without `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD`. A `DEV_ACCOUNT` escape hatch for local development only
- [ ] Migration script: `data.js` → `data/places.json` (7 places), with a test. Then delete `data.js`
- [ ] Map page: Leaflet with OpenStreetMap tiles (darkened; CARTO now needs an API key), pins from `/api/places`, popup showing `why`, `dishes` and sources (all text escaped)
- [ ] `CLAUDE.md` for the new architecture; `.claude/skills/verify/SKILL.md`
- [ ] **You:** add the public hostname in the tunnel (e.g. `food.ottormates.com` → `localhost:8088`) and create the Access application

**Done when:** the 7 places show on your phone, behind your Access login.

## Sprint 1: capture (1 week)

- [ ] `manifest.webmanifest` with `share_target` (POST, `multipart/form-data`, `image/*`), icons, and a minimal service worker. The app can be installed on Android
- [ ] `POST /share`: stores the raw capture (title, text, url, image) as a draft in `data/drafts/`, then redirects (303) to `/inbox#<id>`
- [ ] Inbox page: draft cards, inline fields, a mini-map with a draggable pin, **Save** and **Skip**
- [ ] Save: writes to `places.json` atomically and moves the image to `data/images/<id>.jpg`. Skip deletes the draft
- [ ] Tests: draft write/read, atomic save, required fields (`name`, `lat`, `lng`, `why`)

**Done when:** you share an Instagram screenshot from your phone, type a name and a why, drag the pin, save, and it appears on the map.

## Sprint 2: extraction (1 week)

- [ ] Google Maps share link: resolve the short link, then Places details (name, lat/lng, `placeId`, address). High confidence
- [ ] Image, caption or page text: one Claude vision call returns `{ name, area, why, dishes, category }`. Then a Places text search on "name + area, Taipei" adds lat/lng and `placeId`
- [ ] Extraction runs during `/share`. If it fails or times out, the raw draft is still saved
- [ ] A draft with no Places match is marked ⚠️ and gets no automatic pin
- [ ] Tests against recorded fixtures: one Maps link, one IG screenshot, one Chinese-name shop. No live API calls in CI
- [ ] Measure share-to-draft time; target under 10 seconds

**Done when:** sharing a Google Maps place needs zero typing, and sharing an IG screenshot needs at most a correction.

## Sprint 3: merge and daily use (1 week)

- [ ] Saving a draft whose `placeId` matches an existing place appends a source instead of duplicating it
- [ ] Map filters: status (want/visited), area, category
- [ ] Visit flow: mark visited, set rank T1–T5, add a note
- [ ] Backup: a nightly copy of `./data`. Where it goes (Nextcloud? another disk?) is your call
- [ ] "Near me, want to go" view using browser geolocation

**Done when:** you have used it for a real dinner decision.

## Sprint 4: bulk import (3 days)

- [ ] Google Takeout saved lists (CSV/GeoJSON) become inbox drafts marked "needs why"
- [ ] Inbox can work through a batch quickly (keyboard on desktop, swipe-friendly on phone)

**Done when:** your existing Google Maps saved lists are in the inbox, ready for a why.

## Open questions

| Question | Default if you don't decide |
|---|---|
| Hostname | `food.ottormates.com` |
| Claude model for extraction | `claude-opus-5-5` at low effort (about 2–3¢ a share). To cut cost, switch to `claude-haiku-4-5` in `src/server/extract.ts`, which also means removing `effort` and `fallbacks` (Haiku accepts neither) |
| Where nightly backups go | Decided in Sprint 3 |
| Public read-only map | No (see concept, "Three worth your disagreement") |
