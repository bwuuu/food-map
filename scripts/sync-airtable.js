#!/usr/bin/env node
/**
 * Sync Airtable → data.js
 * Usage:
 *   AIRTABLE_API_KEY=keyxxxxx AIRTABLE_BASE_ID=appXXXXXX node scripts/sync-airtable.js
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

// ── Config ──────────────────────────────────────────────────────────────
const API_KEY = process.env.AIRTABLE_API_KEY;
const BASE_ID = process.env.AIRTABLE_BASE_ID;
const TABLE_NAME = process.env.AIRTABLE_TABLE || 'Restaurants';
const VIEW_NAME = process.env.AIRTABLE_VIEW || 'Grid view';

if (!API_KEY || !BASE_ID) {
    console.error('❌ Set AIRTABLE_API_KEY and AIRTABLE_BASE_ID env vars');
    process.exit(1);
}

// ── Fetch all records from Airtable ─────────────────────────────────────
function fetchAirtableRecords(offset = null) {
    return new Promise((resolve, reject) => {
        const params = new URLSearchParams({
            view: VIEW_NAME,
            pageSize: '100',
        });
        if (offset) params.append('offset', offset);

        const options = {
            hostname: 'api.airtable.com',
            path: `/v0/${BASE_ID}/${encodeURIComponent(TABLE_NAME)}?${params.toString()}`,
            headers: {
                'Authorization': `Bearer ${API_KEY}`,
            },
        };

        https.get(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    if (json.error) {
                        reject(new Error(`Airtable API error: ${json.error.message}`));
                        return;
                    }
                    resolve(json);
                } catch (e) {
                    reject(e);
                }
            });
        }).on('error', reject);
    });
}

// ── Map Airtable record → foodData object ───────────────────────────────
function mapRecord(record) {
    const f = record.fields;

    // lat/lng from Airtable's "Location" field (if using Geolocation field type)
    // or from separate lat/lng fields
    let lat = f.lat || f.Latitude || (f.Location && f.Location.lat);
    let lng = f.lng || f.Longitude || (f.Location && f.Location.lng);

    return {
        name: f.Name || f.name || '',
        rank: f.rank || f.Rank || f.Tier || 'T2',
        area: f.area || f.Area || f.Neighborhood || '',
        address: f.address || f.Address || '',
        cuisine: f.cuisine || f.Cuisine || '',
        type: f.type || f.Type || '',
        price: f.price || f.Price || '',
        notes: f.notes || f.Notes || '',
        lat: lat ? parseFloat(lat) : null,
        lng: lng ? parseFloat(lng) : null,
        plusCode: f.plusCode || f['Plus Code'] || '',
        source: f.source || f.Source || 'Random',
        sourceDetail: f.sourceDetail || f['Source Detail'] || '',
        status: f.status || f.Status || 'Not Tried',
        inspirationLink: f.inspirationLink || f['Inspiration Link'] || '',
        inspirationImage: f.inspirationImage || f['Inspiration Image'] || '',
        whyTry: f.whyTry || f['Why Try'] || '',
        dishRecommendations: f.dishRecommendations || f['Dish Recommendations'] || '',
        mood: f.mood || f.Mood || '',
        bestFor: f.bestFor || f['Best For'] || '',
    };
}

// ── Main ────────────────────────────────────────────────────────────────
async function sync() {
    console.log(`🔄 Syncing from Airtable base: ${BASE_ID}`);

    let allRecords = [];
    let offset = null;

    do {
        const response = await fetchAirtableRecords(offset);
        const records = response.records || [];
        allRecords = allRecords.concat(records);
        offset = response.offset;
        console.log(`  Fetched ${records.length} records...`);
    } while (offset);

    const foodData = allRecords.map(mapRecord).filter(r => r.name && r.lat && r.lng);

    console.log(`✅ Total records: ${allRecords.length}`);
    console.log(`✅ Valid records: ${foodData.length}`);

    // Sort by rank priority
    const rankOrder = { 'T0': 0, 'T1': 1, 'T2': 2, 'T3': 3, 'T4': 4, 'T5': 5 };
    foodData.sort((a, b) => (rankOrder[a.rank] || 99) - (rankOrder[b.rank] || 99));

    // Write data.js
    const output = `// Auto-generated from Airtable - do not edit directly
// Base: ${BASE_ID} | Table: ${TABLE_NAME}
// Generated: ${new Date().toISOString()}
const foodData = ${JSON.stringify(foodData, null, 4)};
`;

    const dataPath = path.join(__dirname, '..', 'data.js');
    fs.writeFileSync(dataPath, output);
    console.log(`💾 Written ${foodData.length} records to data.js`);
}

sync().catch(err => {
    console.error('❌ Sync failed:', err.message);
    process.exit(1);
});
