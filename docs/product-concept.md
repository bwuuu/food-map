# Food Map: product concept

Last updated: 2026-10-07

## The problem

> "I saved it on Google Maps but forgot why."

I find places to eat on Instagram, on YouTube and from friends. Google Maps can save
the pin, but not the reason I saved it: the dish, the vibe, who recommended it.
Months later I have a list of starred places and no memory of which one I wanted.

v1 (a static Leaflet map with hand-edited `data.js`) solved the *remembering* part.
It failed on **capture**: adding a place meant editing a file, looking up
coordinates and committing. In four months, eight places were saved. Capture
friction is the problem worth solving. The map is easy.

## Who it's for

One person: me, on an Android phone, in Taipei. Not multi-user. Not iPhone (see
Out of scope). If friends want a copy, they can self-host the repo.

## The product in one flow

```
See a place on Instagram / Google Maps / a screenshot
  → Android share sheet → "Food Map"                    (≤ 2 taps)
  → server reads the share, drafts a place              (≤ 10 s)
  → Inbox: check the name, drag the pin, fix the "why"
  → Save → it's on the map, with the source attached
```

Later, looking for dinner: open the map, filter to "want to go" near where I am,
tap a pin, read *why* I saved it and what to order.

## What a place remembers

The "why" is the product. Every place carries:

| Field | Meaning |
|---|---|
| `name`, `lat`, `lng`, `address`, `area` | Where it is |
| `googlePlaceId` | Used to de-duplicate. Sharing a place twice adds a source and does not create a second place |
| `why` | The one line I would otherwise forget. **Required.** |
| `dishes[]` | What to order |
| `sources[]` | Each one is `{ type, detail, url, image }` (`detail` is free text: a handle, a friend's name). One place can have many sources, and one post can feed many places |
| `status` | `want` or `visited` |
| `rank` | T1–T5, set after visiting (T1 bad … T5 favourite) |
| `category`, `cuisine`, `price`, `notes` | Optional free text |

Only `name`, `lat`, `lng` and `why` are required. This is the v2-plan model, with
`rank` narrowed to post-visit: v1's "T0 = not tried" is now `status: want`.

The 7 places from v1 were migrated into this model by `scripts/migrate-v1.ts`.

## Decisions

Each decision is the boring default unless the reason says otherwise.

| Question | Decision | Why |
|---|---|---|
| Capture channel | **PWA with an Android Web Share Target** | It shows up in the share sheet of Instagram, Google Maps, Chrome and the screenshot toolbar. No chat bot sits in between. |
| Hosting | **Docker Compose on the homelab**, port `127.0.0.1:8088`, behind the existing cloudflared tunnel | This is your call (it replaces Cloudflare Pages from the v2 plan). Same pattern as Mindmapp on `:8087`. A share target must POST to the site's own origin, and one container serving both the pages and the API gives us that with no CORS. |
| Access | **Cloudflare Access on the whole hostname**. The app also verifies the Access JWT and refuses to start without `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` | One user, so there's no reason to have a public part. Copied from Mindmapp. Verifying the JWT in the app means a tunnel misconfiguration fails closed. |
| Storage | **`places.json` and `images/` in a mounted `./data` volume**, written atomically (temp file, then rename). Drafts live in `./data/drafts/` | Hundreds of places, one writer. A database is not needed. Backing up the app means copying one folder. The v2 plan used "git as the database" (commits through the GitHub API) because Pages had no disk; we have a disk now, so the GitHub token goes away. |
| Extraction | **One Claude vision call per capture** (image, caption or page text in; structured draft out) | Replaces separate OCR, parser and classifier steps. |
| Geocoding | **Google Places API** (text search and details) | Handles Chinese names and small Taipei shops far better than OpenStreetMap, and gives `placeId` for de-duplication. |
| Stack | **One Node container**: Hono for the API and static files, Vite + vanilla TypeScript for two pages (map and inbox), Leaflet, Vitest | Two pages don't justify React. Logic worth testing (extraction parsing, merge by `placeId`, migration) is plain TypeScript. |
| Secrets | `ANTHROPIC_API_KEY` and `GOOGLE_PLACES_API_KEY` from Bitwarden, injected at `docker compose up` and never committed | Matches your existing rule for credentials. |

### Three worth your disagreement

1. **The whole site sits behind Access.** The v2 plan kept the map public. Being
   private is simpler (one Access rule) and safer (precise locations plus "visited"
   status, for a single person). If you want a public, shareable map, it's a
   read-only route we can open later.
2. **Files, not SQLite.** This is fine up to a few thousand places. Upgrade path:
   swap the storage module for SQLite; nothing else changes.
3. **No offline mode.** The service worker exists only to satisfy installability.
   Captures need the server anyway (Claude, Places).

## Out of scope

| Not doing | Why | Revisit when |
|---|---|---|
| iPhone share target | Safari doesn't let websites register as share targets | An Apple Shortcut can POST to the same `/api/capture` if it's ever needed |
| Multiple users, accounts | One person | Never, unless someone asks |
| Airtable / Supabase / Telegram | Dropped in the v2 plan; not needed for one person | Never |
| Recommendations, reviews, social features | Not the problem | Never |
| Non-food places | Keep the model focused first | After 2–4 weeks of real use |
| GitHub Pages / Cloudflare Pages | Replaced by the homelab | Never |

## Success

- Share to draft visible in the inbox in **under 10 seconds**
- **30+ places** saved in the first month without forcing it (v1: 8 in four months)
- Every saved place has a `why`
