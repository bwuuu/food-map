# 🍝 Food Map

A personal map of places I want to try in Taipei, and *why* I saved each one. Built with Leaflet.js and plain HTML/CSS/JS. Inspired by the [Taipei Burger Map](https://hsieh-george.github.io/taipei-burger-map/).

See [`PROJECT_PLAN.md`](PROJECT_PLAN.md) for where this is going: saving places straight from the Android share menu.

## ✨ Features

- 🗺️ **Interactive map** with CARTO dark tiles
- ✨ **Why I saved it**, dishes to order, and the original post or screenshot in every popup
- ⭐ **Tiers** T0 (Must Try) to T5 (Skip), or unranked until visited
- 🔍 **Filter** by status (want to go / visited), tier and area
- 📤 **Open in Google Maps** from any pin

## 🚀 Run locally

The map loads `places.json` with `fetch`, so it needs a local server (opening `index.html` directly won't work):

```bash
python3 -m http.server 8000
# then open http://localhost:8000
```

## 📝 Adding a place

Places live in `places.json`. Once the share-menu capture is built, entries will be added automatically; until then, add one by hand:

```json
{
  "id": "p_unique1",
  "name": "芮秋 Rachel",
  "lat": 25.0608,
  "lng": 121.5602,
  "address": "No. 405號, Fujin St, Songshan District, Taipei City",
  "area": "Songshan District",
  "googlePlaceId": null,
  "category": "Brunch Restaurant",
  "cuisine": "European Brunch",
  "price": "$400-600 TWD",
  "why": "Signature iron skillet Dutch baby pancake",
  "dishes": ["Dutch baby pancake"],
  "sources": [
    {
      "type": "ig",
      "url": "https://www.instagram.com/p/XXXXX/",
      "image": "images/rachel_screenshot.jpg",
      "author": "@handle",
      "savedAt": "2026-04-20"
    }
  ],
  "status": "want",
  "rank": null,
  "notes": ""
}
```

- **Required:** `id`, `name`, `lat`, `lng`, `why`. Everything else is optional.
- **`status`:** `want` or `visited`.
- **`rank`:** `T0`–`T5`, or `null` for unranked.
- **`sources[].type`:** `ig`, `friend`, `blog`, `magazine` or `other`. A place can have several sources.
- **Coordinates:** in Google Maps, right-click the place and click the coordinates to copy them.

## 📄 License

MIT
