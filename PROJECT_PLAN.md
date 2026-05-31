# 🗺️ Personal Interest Map — Project Plan

> **Vision:** A personal map for storing locations of interest — restaurants, cafes, bars, shops, activities — with the key differentiator being **rich context**: why you saved it, the original IG post, screenshots, blog mentions, friend recommendations. The system is optimized for **zero-friction capture** and **structured curation**, not just map viewing.

---

## Problem Statement

Current capture methods all have too much friction:

| Method | Friction |
|--------|----------|
| Ask assistant (human) | Bottleneck, async delay, context loss |
| Edit `data.js` manually | Dev tools, lat/lng lookup, formatting hell |
| Airtable form | Switch apps, manual fields, no auto-context |
| Google Maps save | No rich context, no screenshots, no "why?" |

**The real product is the pipeline from "I saw something cool" → "rich context on a map."**

---

## Architecture: 3 Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 1: INBOX        (Zero-friction capture)                  │
│  ───────                                                       │
│  • Share IG post → Telegram bot        (2 taps)                 │
│  • Screenshot → Telegram/drop zone     (1 paste)                │
│  • Maps pin + voice note               (3 sec)                  │
│  • Blog link → email forward                                       │
│  • Raw, unstructured, append-only                                 │
└───────────────────────────────┬─────────────────────────────────┘
                                │ raw drafts (URL, image, text, location)
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 2: CURATION     (Structured refinement)                  │
│  ────────                                                       │
│  • Auto-extract: IG captions → name, area, whyTry, dishes       │
│  • Auto-geocode: "X Cafe, Da'an" → lat/lng suggestion           │
│  • Auto-categorize: text → cuisine, type, price hints           │
│  • Batch review queue: swipe/tap to confirm fields              │
│  • Manual decisions limited to: rank, status, location pin      │
└───────────────────────────────┬─────────────────────────────────┘
                                │ structured records
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 3: MAP          (Rich context viewing)                   │
│  ──────                                                         │
│  • Leaflet-based map with context panels                        │
│  • Source attribution showing IG/blog embeds                    │
│  • Screenshots in popups                                        │
│  • Filter by mood, bestFor, source, status, companion           │
│  • Not just food — any interest category                        │
└─────────────────────────────────────────────────────────────────┘
```

---

## Data Model: `Place`

```
place: {
    // ── Core ──
    name: string,
    lat: number,
    lng: number,
    address: string,
    area: string,

    // ── Taxonomy (beyond just food) ──
    category: "food" | "cafe" | "bar" | "shop" | "activity" | "hotel" | "viewpoint",
    subcategory: "Italian" | "Bookstore" | "Hiking trail" | ...,

    // ── Rich Context (the key differentiator) ──
    whySaved: string,          // What caught your attention
    notes: string,             // Post-visit personal notes
    mood: string[],            // "date night", "solo adventure"
    bestFor: string,           // "weekend afternoon", "rainy day"
    companion: ["solo" | "date" | "group" | "family"],

    // ── Source Trail (full provenance) ──
    sources: [{
        type: "ig_post" | "blog" | "screenshot" | "friend" | "magazine",
        url: string,           // Original link
        author: string,        // @handle or friend name
        image: string,         // Path to downloaded/screenshot image
        capturedAt: timestamp
    }],

    // ── Status & Priority ──
    status: "want_to_go" | "visited" | "want_to_return" | "not_interested",
    visitedAt: timestamp | null,
    rank: "T0" | "T1" | "T2" | "T3" | "T4" | "T5",

    // ── Practical ──
    priceRange: string,        // "$400-600 TWD"
    hours: string,
    phone: string,
    reservationRequired: boolean,

    // ── Personal Tags ──
    tags: ["birthday_spot", "rainy_day", "take_parents"],

    // ── Media ──
    photos: ["./images/..."],
    screenshots: ["./screenshots/..."]
}
```

**Key evolution from current `data.js`:**
- `sources` is an **array** (one place may come from IG + friend + blog)
- `category` is not limited to food — enables map expansion
- `screenshots` are first-class, not shoehorned into `inspirationImage`
- `mood`, `companion`, `tags` enable richer filtering

---

## Implementation Phases

### ✅ Phase 0: Current State (Done)
- Static Leaflet map from `data.js`
- Filters by rank & area
- Popups with context (whyTry, dishRecs, mood, bestFor)
- Screenshots stored in `./images/`
- Data entry via manual `data.js` edits or assistant

---

### 📌 Phase 1: Telegram Inbox — Zero-Friction Capture

**Goal:** Replace human assistant as the capture bottleneck. Every interesting location should be savable in ≤3 taps from the app you're already in (IG, Maps, browser).

**Deliverables:**
- [ ] Telegram bot/channel configured as inbox
- [ ] IG share target configured (Share → Telegram → Bot)
- [ ] Bot receives and stores raw: URL, caption, media, metadata
- [ ] Screenshot paste accepted (image + optional text note)
- [ ] Map pin share accepted (location + optional voice/text context)
- [ ] Inbox buffer stored draft records (file, DB, or even a Telegram chat archive)

**Technical note:** Can start with a simple cron that polls a designated Telegram chat, or a webhook bot. No complex infra.

---

### 📌 Phase 2: Auto-Extraction Pipeline

**Goal:** Turn raw inbox items into structured draft records with minimal human input.

**Deliverables:**
- [ ] IG caption parser: extract name, area, dishes, vibe descriptors
- [ ] Screenshot OCR: extract visible text (restaurant name, address, menu items)
- [ ] Auto-geocoder: "芮秋 Rachel, 民生社區" → lat/lng suggestion
- [ ] Auto-category classifier: text signals → category, subcategory, cuisine
- [ ] Draft record generator with **all** fields pre-filled
- [ ] Confidence scoring: flag low-confidence extractions for manual review

**Output:** A queue of draft records waiting for approval.

---

### 📌 Phase 3: Curation UI / Review Flow

**Goal:** Approve or tweak auto-extracted drafts with minimal friction.

**Options:**

**Option A: Telegram-native review**
- Bot sends draft as a formatted message
- You reply: `T0` (sets rank + approves), `edit name = "Corrected"`, `skip`
- Lowest friction, no new apps

**Option B: Mobile web review UI**
- Simple page showing draft cards (swipe-like or form-like)
- Drag pin on mini-map to correct location
- Tap to confirm rank, status
- Batch approve multiple at once

**Option C: Obsidian/Telegram hybrid**
- Review inbox rendered in Obsidian for detailed editing
- Sync back via commit

**Deliverables:**
- [ ] Review queue populated from draft records
- [ ] One-tap approve with rank assignment
- [ ] Edit any field inline
- [ ] On approve: write to `data.js`, commit, push, redeploy

---

### 📌 Phase 4: Enhanced Map Viewing

**Goal:** The map becomes a rich browsing experience, not just a data viewer.

**Deliverables:**
- [ ] Source attribution in popup: link to original IG post, blog URL
- [ ] Embedded screenshots / media in popups
- [ ] Filter by: mood, companion, tags, category, source type
- [ ] "Want to go" / "Visited" toggles with date tracking
- [ ] Category expansion: switch between Food view and All Interests view
- [ ] Route planning: multi-stop selection from saved places

---

### 📌 Phase 5: Sync Infrastructure

**Goal:** Reliable, automated sync from inbox → data → deployed map.

**Deliverables:**
- [ ] Cron job or GH Action that processes inbox periodically
- [ ] Airtable or Supabase as structured backing store (optional — for multi-device access)
- [ ] Sync script: inbox → structured records → `data.js` → commit → deploy
- [ ] Conflict resolution: if you edit in Git and in Airtable simultaneously

**Note:** Airtable was explored but deprioritized due to capture friction. May be revisited as the **storage backend** for curation, not the **capture interface**.

---

## Capture Method Comparison

| Task | Airtable | Manual data.js | Telegram Inbox (Proposed) |
|------|----------|----------------|---------------------------|
| IG post → save | Switch app, manual fields | Dev environment | Share → Telegram (2 taps) |
| Screenshot + context | Upload, type description | OCR + manual lat/lng | Paste image, done |
| "Why I saved it" | Type from memory | Type from memory | Auto-extracted from caption |
| Location | Look up lat/lng | Look up lat/lng | Auto-geocoded from name |
| Batch add 5 places | Repeat form 5× | Edit file, format 5× | Share 5 posts, review once |
| Rich media | Attachment field | File path + git add | Original preserved, linked |
| Add while on phone | Mobile-unfriendly | Impossible | Native to phone workflow |

---

## Decisions to Make

1. **Capture channel:** Telegram bot vs. Telegram channel vs. shared iOS album vs. email address
2. **Review interface:** Telegram reply commands vs. mobile web UI vs. Obsidian
3. **Storage backend:** Git-only (`data.js`) vs. lightweight DB (SQLite/JSON file) vs. Airtable/Supabase as sync target
4. **Auto-extraction engine:** Local LLM OCR vs. cloud vision API vs. rule-based parsers
5. **Deployment trigger:** Manual `git push` vs. GitHub Actions auto-deploy vs. webhook push

---

## Immediate Next Steps (When Resuming)

1. **Confirm Phase 1 scope:** Do we start with a Telegram bot, or would you prefer a dedicated email address or photo album as the inbox?
2. **Pick the review style:** Reply-to-bot commands, or a simple mobile web page for review?
3. **Store this plan in repo:** `PROJECT_PLAN.md` alongside code

---

## Appendix: Why This Architecture Wins

- **Capture first:** The hardest part of any personal data app is getting data in. Optimizing for capture means the system gets used.
- **Don't make me type lat/lng:** Geocoding should be automatic from names and areas. Human should only confirm the pin.
- **Preserve provenance:** A place is memorable because of *how you discovered it*. The screenshot, the IG caption, the friend's voice note — all preserved.
- **Structured lazily:** You don't know whether a place is T0 when you first see it. The system should let you capture first, prioritize later.
- **Category-agnostic from day 1:** Even if 90% of entries are food today, the data model should not assume food. Tomorrow you might save a bookstore or a viewpoint.

---

*Document version: 1.0*
*Created: 2025*
*Status: Awaiting Phase 1 kickoff*
