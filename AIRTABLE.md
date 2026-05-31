# Airtable Integration for Food Map

This document explains how to set up and use Airtable as the data source for your food map.

## Setup

### 1. Create Airtable Base

Go to [Airtable](https://airtable.com/) and create a new base called **"Food Map"**.

Use this template to create the table structure:

| Field Name | Field Type | Description |
|---|---|---|
| `Name` | Single line text | Restaurant name |
| `rank` | Single select: T0, T1, T2, T3, T4, T5 | Priority tier |
| `area` | Single select | District/neighborhood |
| `address` | Single line text | Full address |
| `cuisine` | Single select | Cuisine type |
| `type` | Single select | Dining style |
| `price` | Single line text | Price range (e.g. "$400-600 TWD") |
| `notes` | Long text | Staff notes |
| `lat` | Number | Latitude |
| `lng` | Number | Longitude |
| `plusCode` | Single line text | Google Plus Code |
| `source` | Single select: IG, Friend, Blog, Magazine, Random | Where you found it |
| `sourceDetail` | Single line text | Specific handle, friend name, etc. |
| `status` | Single select: Not Tried, Tried, Want to Return | Visit status |
| `inspirationLink` | URL | IG post, blog link, etc. |
| `inspirationImage` | Attachment | Screenshot or photo |
| `whyTry` | Long text | What caught your attention |
| `dishRecommendations` | Long text | What to order |
| `mood` | Long text | Occasion tags (comma-separated) |
| `bestFor` | Long text | Best time to visit |

### 2. Get API Credentials

1. Go to [Airtable Personal Access Tokens](https://airtable.com/create/tokens)
2. Click **Create new token**
3. Give it a name: `Food Map Sync`
4. Add scope: `data:records:read`
5. Add your base under **Access**
6. Copy the token (starts with `pat...`)
7. Copy your **Base ID** from the URL or settings

### 3. Configure Environment

Create a `.env` file in the project root:

```bash
AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXXXX
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

Or export directly:

```bash
export AIRTABLE_API_KEY=patXXXXXXXXXXXXXXXXXXXX
export AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
```

### 4. Run the Sync

```bash
# From project root
node scripts/sync-airtable.js
```

This will:
1. Connect to your Airtable base
2. Download all records from the "Restaurants" table
3. Generate a new `data.js`
4. Overwrite the existing file

### 5. Commit & Deploy

```bash
git add data.js
git commit -m "Sync: Import ${N} restaurants from Airtable"
git push origin main
```

GitHub Pages will auto-deploy the updated data.

---

## Workflow

### Daily Add Flow

1. Open Airtable (web or mobile app)
2. Add a new restaurant record
3. Fill in fields (at minimum: Name, rank, lat, lng)
4. Run: `node scripts/sync-airtable.js`
5. `git commit` and `git push`
6. Done!

### Batch Import from Existing data.js

If you have existing data in `data.js`, you can import into Airtable using the CSV import feature:

1. Create a temporary script to export data.js to CSV
2. Use Airtable's **CSV Import** extension
3. Map columns to fields
4. Clean up / adjust as needed

---

## Automation Options

### Option A: Manual Sync (Current)

Run `node scripts/sync-airtable.js` whenever you want to update.

**Pros:** Full control, review changes before commit
**Cons:** Manual step

### Option B: GitHub Actions (Auto-sync)

Create `.github/workflows/sync-airtable.yml`:

```yaml
name: Sync Airtable Data

on:
  workflow_dispatch:  # Manual trigger
  schedule:
    - cron: '0 */6 * * *'  # Every 6 hours

jobs:
  sync:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: node scripts/sync-airtable.js
        env:
          AIRTABLE_API_KEY: ${{ secrets.AIRTABLE_API_KEY }}
          AIRTABLE_BASE_ID: ${{ secrets.AIRTABLE_BASE_ID }}
      - name: Commit changes
        run: |
          git config --global user.name 'github-actions'
          git config --global user.email 'actions@github.com'
          git add data.js
          git diff --quiet && git diff --staged --quiet || git commit -m "Auto-sync: Update from Airtable"
          git push
```

Add these secrets in GitHub repo settings:
- `AIRTABLE_API_KEY`
- `AIRTABLE_BASE_ID`

**Pros:** Zero manual steps, data is always fresh
**Cons:** Every 6 hours = up to ~250 commits/month

### Option C: Direct API from Browser (No sync)

Instead of generating `data.js`, fetch from Airtable API directly in the browser.

**Pros:** Always live data, no build step
**Cons:** API key exposed (needs read-only key), rate limited

This is less ideal for a static site. Option A or B is recommended.

---

## Troubleshooting

### "No records found"
Check that your VIEW_NAME matches the view in Airtable (default: "Grid view").

### "lat/lng is null"
Make sure the `lat` and `lng` fields are set as **Number** type in Airtable, not text.

### Rate Limits
Airtable free plan: 5 requests/sec, 1000 requests/month.
Our script does one request per 100 records (pagination), so fine for personal use.

### CORS Error (if using direct browser API)
You must use server-side request (like our script) or Airtable will block it.

---

## Security Note

**Never commit your API key.** Keep it in environment variables or GitHub secrets only.

If using the browser-direct approach, use a read-only token with minimal permissions.

---

## Next Steps

- [ ] Set up Airtable base with the schema above
- [ ] Create API token with `data:records:read` scope
- [ ] Run `node scripts/sync-airtable.js` to test
- [ ] Import your existing `data.js` restaurants into Airtable
- [ ] Decide on sync frequency (manual vs scheduled)
