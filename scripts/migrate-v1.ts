/**
 * One-off: v1 `data.js` → `data/places.json` and `data/images/`.
 *
 *   npm run migrate-v1 -- [path/to/data.js] [data dir]
 *
 * Refuses to overwrite an existing places.json: once the app has saved places
 * of its own, re-running this would silently throw them away.
 */
import { createHash } from 'node:crypto';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Place, Source } from '../src/place.ts';

interface V1Place {
  name: string;
  rank: string;
  area?: string;
  address?: string;
  cuisine?: string;
  type?: string;
  price?: string;
  notes?: string;
  lat: number;
  lng: number;
  plusCode?: string;
  sources?: { type: string; detail?: string; link?: string; image?: string }[];
  whyTry?: string;
  dishRecommendations?: string;
  mood?: string;
  bestFor?: string;
}

const SOURCE_TYPES: Record<string, Source['type']> = { Instagram: 'ig', YouTube: 'youtube', Friend: 'friend' };

export function migrate(v1: V1Place[]): Place[] {
  return v1.map((p) => {
    const notes = [
      p.notes,
      p.plusCode && !p.notes?.includes(p.plusCode.split(' ')[0]!) ? `Plus Code: ${p.plusCode}` : null,
      p.mood ? `Mood: ${p.mood}` : null,
      p.bestFor ? `Best for: ${p.bestFor}` : null,
    ].filter(Boolean);
    const visited = p.rank !== 'T0';
    return {
      // Stable across re-runs, so a re-migration never changes ids.
      id: 'p_' + createHash('sha1').update(p.name).digest('hex').slice(0, 8),
      name: p.name,
      lat: p.lat,
      lng: p.lng,
      address: p.address ?? null,
      area: p.area ?? null,
      googlePlaceId: null,
      category: p.type ?? null,
      cuisine: p.cuisine ?? null,
      price: p.price ?? null,
      why: p.whyTry ?? '',
      // Kept whole: splitting on commas mangles sentences like "X with Y, paired with Z".
      dishes: p.dishRecommendations ? [p.dishRecommendations] : [],
      sources: (p.sources ?? []).map((s) => ({
        type: SOURCE_TYPES[s.type] ?? 'web',
        detail: s.detail ?? null,
        url: s.link ?? null,
        image: s.image ? s.image.replace(/^\.\//, '') : null,
      })),
      status: visited ? 'visited' : 'want',
      rank: visited ? (p.rank as Place['rank']) : null,
      notes: notes.length ? notes.join('\n') : null,
    };
  });
}

if (import.meta.main) {
  const [src = 'data.js', dataDir = 'data'] = process.argv.slice(2);
  const out = join(dataDir, 'places.json');
  if (existsSync(out)) {
    console.error(`${out} already exists; refusing to overwrite it.`);
    process.exit(1);
  }
  // data.js is our own file declaring `const foodData = [...]` with comments.
  const v1 = new Function(`${await readFile(src, 'utf8')}; return foodData;`)() as V1Place[];
  const places = migrate(v1);
  await mkdir(dataDir, { recursive: true });
  await cp(join(dirname(src), 'images'), join(dataDir, 'images'), { recursive: true });
  await writeFile(out, JSON.stringify(places, null, 2) + '\n');
  console.log(`Wrote ${places.length} places to ${out}`);
}
