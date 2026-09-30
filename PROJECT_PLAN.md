# 🗺️ Food Map — Project Plan (v2)

> **Goal:** Saving a place I just saw should take under 10 seconds, and the map should remember *why* I saved it.
>
> v1 of this plan (Telegram inbox, 5 phases) is in git history. It was replaced because it put too much infrastructure in front of the real problem: **capture friction**. Seven places were saved in four months.

---

## Decisions

| Question | Decision | Why |
|---|---|---|
| Capture channel | **Installable web app (PWA) with Android Web Share Target** | Appears in the Android share sheet from Instagram, Google Maps, Chrome and the screenshot toolbar. No chat app in between. |
| Review | **Inbox page on the map itself** | Correcting a location is dragging a pin on a real map, which a chat can't do well. One review UI for every capture source. |
| Extraction | **One Claude vision call** per capture | Replaces the separate OCR, parser and classifier steps from v1. |
| Geocoding | **Google Places API** | Handles Chinese names and small Taipei shops far better than OpenStreetMap. Gives a `placeId` for de-duplication. |
| Hosting | **Cloudflare Pages + Pages Functions** (moving off GitHub Pages) | The share target must POST to the site's own origin. Pages Functions give us that endpoint with no server and no CORS. Still deploys from this repo. |
| Storage | **Drafts in Cloudflare KV; saved places committed to `places.json` in this repo** | Git stays the source of truth with full history. KV holds the short-lived inbox. |
| Airtable / Supabase / Telegram | **Dropped** | Not needed for one person. |

Not supported: **iPhone.** Safari does not let websites register as share targets. If that ever matters, an Apple Shortcut can POST to the same `/api/capture` endpoint.

---

## How it works

```
Android share sheet ("Food Map")
        │  POST multipart: title, text, url, image
        ▼
/share  (Pages Function)
        ├─ Google Maps link? → resolve short link → Places API details   (high confidence)
        ├─ Image / caption?  → Claude vision → name, area, why, dishes, category
        │                    → Places API text search "name + area, Taipei" → lat/lng, placeId
        ├─ Store draft in KV (image included)
        └─ 303 redirect → /inbox#<draftId>
                 │
                 ▼
/inbox  (static page on the map site)
        ├─ Draft card + mini-map with draggable pin
        ├─ Edit any field inline
        └─ [Save] → POST /api/drafts/:id/approve
                 │
                 ▼
Pages Function commits via GitHub API
        ├─ places.json (append or merge by placeId)
        └─ images/<id>.jpg
                 │
                 ▼
Cloudflare Pages redeploys (~1 min) → pin on the map
```

**What each share source gives us on Android:**
- **Google Maps → Share:** place name + `maps.app.goo.gl` link. Resolves straight to a `placeId`. Best case.
- **Instagram → Share:** only the post URL. Instagram blocks fetching post content, so the URL is kept as the source and **the screenshot is what gets read**.
- **Screenshot toolbar → Share:** image only. Claude reads it.
- **Chrome → Share:** page title + URL (blogs, articles). The Function fetches the page text for Claude.

**Security:** the site is public but the write endpoints are not. `/share`, `/inbox` and `/api/*` are behind **Cloudflare Access** (free for one user: log in once with email, cookie lasts a month). The public map stays public.

---

## Data model: `places.json`

```js
{
  "id": "p_abc123",
  "name": "芮秋 Rachel",
  "lat": 25.06, "lng": 121.56,
  "address": "...",
  "area": "Songshan",
  "googlePlaceId": "ChIJ...",       // de-duplication + later lookups (hours, etc.)
  "category": "cafe",               // free text, not an enum
  "cuisine": "European Brunch",     // optional
  "price": "$400-600 TWD",          // optional
  "why": "Signature Dutch baby pancake",   // the one line I'll otherwise forget
  "dishes": ["Dutch baby"],
  "sources": [
    { "type": "ig", "url": "https://instagram.com/p/...", "image": "images/p_abc123.jpg", "author": "@...", "savedAt": "2026-09-30" }
  ],
  "status": "want",                 // "want" | "visited"
  "rank": null,                     // T0–T5, assigned after visiting
  "notes": ""
}
```

- Sharing a place that already exists (same `googlePlaceId`) **adds a source** instead of creating a duplicate.
- Only `name`, `lat`, `lng` and `why` are required. Everything else can be filled in later.

---

## Build steps

### Step 1 — Move hosting and switch to `places.json`
- [x] Convert `data.js` → `places.json` (migrate the 7 existing places into the new model)
- [x] Map loads `places.json` with `fetch`
- [ ] Deploy to Cloudflare Pages from this repo (needs a Cloudflare account)
- [x] Add "want to go / visited" filter to the map
- [x] Remove the Airtable script and docs

### Step 2 — Make the site installable and a share target
- [ ] `manifest.webmanifest` with `share_target` (POST, `multipart/form-data`, accepts `image/*`)
- [ ] Minimal service worker (needed for install on some Android browsers)
- [ ] `/share` Function that stores the raw capture in KV and redirects to `/inbox`
- [ ] Cloudflare Access on `/share`, `/inbox`, `/api/*`

### Step 3 — Extraction
- [ ] Google Maps link → Places details
- [ ] Image / caption / page text → Claude vision → structured draft
- [ ] Places text search to attach lat/lng + `placeId`
- [ ] Confidence flag: drafts without a Places match get a ⚠️ and no auto-pin

### Step 4 — Inbox and save
- [ ] `/inbox` page: draft cards, inline editing, draggable pin
- [ ] Approve → commit `places.json` + image via GitHub API (fine-grained token, this repo only)
- [ ] Merge into existing place when `placeId` matches
- [ ] Skip → delete draft

### Step 5 — Bulk import from Google Maps
- [ ] Google Takeout → saved lists (CSV / GeoJSON) → drafts in the inbox, marked "needs why"

### Then: use it for 2–4 weeks before building anything else
Candidates, decided by real usage: filters (category, area, status), a "near me, want to go" view, visit notes/ranking flow, email forwarding as a second capture path, non-food places.

---

## Secrets needed (stored in Cloudflare, never in the repo)
- `ANTHROPIC_API_KEY`
- `GOOGLE_PLACES_API_KEY`
- `GITHUB_TOKEN` — fine-grained, contents read/write on this repo only

## Success criteria
- Share → draft visible in the inbox in **under 10 seconds**
- **30+ places** saved in the first month without forcing it
