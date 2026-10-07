/**
 * All reads and writes of the data directory:
 *   places.json       the map
 *   drafts/<id>.json  shares waiting in the inbox
 *   images/           screenshots, from v1 and from shares
 *
 * Writes go to a temp file and are renamed over the target, so a crash never
 * leaves half a places.json. They also run one at a time, so two quick saves
 * can't both read the old list and drop each other's place.
 * ponytail: one in-process queue; fine for one container and one user.
 */
import { randomBytes } from 'node:crypto';
import { mkdir, readdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { Draft, Place, SaveInput, Suggestion, VisitInput } from '../place.ts';

export const isDraftId = (id: string) => /^d_[0-9a-f]{12}$/.test(id);
export const isPlaceId = (id: string) => /^p_[0-9a-f]{8}$/.test(id);

export class NotFound extends Error {}

const today = () => new Date().toISOString().slice(0, 10);
const addNote = (notes: string | null, line: string) => (notes ? `${notes}\n${line}` : line);

const IMAGE_TYPES: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
export const imageExtension = (type: string) => IMAGE_TYPES[type] ?? null;

export function createStore(dataDir: string) {
  const placesFile = join(dataDir, 'places.json');
  const draftsDir = join(dataDir, 'drafts');
  const imagesDir = join(dataDir, 'images');

  let queue: Promise<unknown> = Promise.resolve();
  const serial = <T>(fn: () => Promise<T>): Promise<T> => {
    const run = queue.then(fn);
    queue = run.catch(() => {});
    return run;
  };

  async function writeJson(file: string, value: unknown) {
    const tmp = `${file}.${randomBytes(4).toString('hex')}.tmp`;
    await writeFile(tmp, JSON.stringify(value, null, 2) + '\n');
    await rename(tmp, file);
  }

  async function readJson<T>(file: string, missing: T): Promise<T> {
    try {
      return JSON.parse(await readFile(file, 'utf8'));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return missing;
      throw e;
    }
  }

  const draftFile = (id: string) => {
    if (!isDraftId(id)) throw new NotFound();
    return join(draftsDir, `${id}.json`);
  };

  async function getDraft(id: string): Promise<Draft> {
    const draft = await readJson<Draft | null>(draftFile(id), null);
    if (!draft) throw new NotFound();
    return draft;
  }

  return {
    places: () => readJson<Place[]>(placesFile, []),

    async drafts(): Promise<Draft[]> {
      const files = await readdir(draftsDir).catch(() => [] as string[]);
      const drafts = await Promise.all(
        files.filter((f) => f.endsWith('.json')).map((f) => readJson<Draft | null>(join(draftsDir, f), null)),
      );
      return drafts.filter((d): d is Draft => d !== null).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },

    draft: getDraft,

    async addDraft(
      share: { title: string | null; text: string | null; url: string | null; image: { bytes: Uint8Array; ext: string } | null },
      extraction: Draft['extraction'],
    ) {
      const id = `d_${randomBytes(6).toString('hex')}`;
      let image: string | null = null;
      if (share.image) {
        await mkdir(imagesDir, { recursive: true });
        image = `images/${id}.${share.image.ext}`;
        await writeFile(join(dataDir, image), share.image.bytes);
      }
      const draft: Draft = {
        id, createdAt: new Date().toISOString(), title: share.title, text: share.text, url: share.url, image, extraction, suggestion: null,
      };
      await mkdir(draftsDir, { recursive: true });
      await writeJson(draftFile(id), draft);
      return draft;
    },

    /** Background extraction finished. The draft may already be saved or skipped: then there's nothing to do. */
    finishExtraction: (id: string, suggestion: Suggestion | null) =>
      serial(async () => {
        const draft = await getDraft(id).catch((e) => {
          if (e instanceof NotFound) return null;
          throw e;
        });
        if (!draft) return;
        await writeJson(draftFile(id), { ...draft, extraction: suggestion ? 'done' : 'failed', suggestion });
      }),

    /**
     * Draft → place. If Google Places says it's a place already on the map, the
     * share becomes another source of that place instead of a duplicate pin.
     * The screenshot stays in images/ either way.
     */
    saveDraft: (id: string, input: SaveInput) =>
      serial(async (): Promise<{ place: Place; merged: boolean }> => {
        const draft = await getDraft(id);
        const source = { type: input.sourceType, detail: input.sourceDetail, url: draft.url, image: draft.image };
        const places = await readJson<Place[]>(placesFile, []);
        const existing = input.googlePlaceId ? places.find((p) => p.googlePlaceId === input.googlePlaceId) : undefined;

        let place: Place;
        if (existing) {
          place = {
            ...existing,
            sources: [...existing.sources, source],
            dishes: [...new Set([...existing.dishes, ...input.dishes])],
            // Fill gaps only: what's already on the map was reviewed before.
            area: existing.area ?? input.area,
            category: existing.category ?? input.category,
            cuisine: existing.cuisine ?? input.cuisine,
            address: existing.address ?? input.address,
            notes: input.why === existing.why ? existing.notes : addNote(existing.notes, `Also saved because: ${input.why}`),
          };
          await writeJson(placesFile, places.map((p) => (p.id === existing.id ? place : p)));
        } else {
          place = {
            id: `p_${randomBytes(4).toString('hex')}`,
            name: input.name,
            lat: input.lat,
            lng: input.lng,
            address: input.address,
            area: input.area,
            googlePlaceId: input.googlePlaceId,
            category: input.category,
            cuisine: input.cuisine,
            price: null,
            why: input.why,
            dishes: input.dishes,
            sources: [source],
            status: 'want',
            rank: null,
            notes: null,
          };
          await writeJson(placesFile, [...places, place]);
        }
        await rm(draftFile(id));
        return { place, merged: !!existing };
      }),

    /** After eating there: visited, a rank, and a dated line in the notes. */
    recordVisit: (id: string, visit: VisitInput) =>
      serial(async () => {
        if (!isPlaceId(id)) throw new NotFound();
        const places = await readJson<Place[]>(placesFile, []);
        const place = places.find((p) => p.id === id);
        if (!place) throw new NotFound();
        const updated: Place = {
          ...place,
          status: 'visited',
          rank: visit.rank,
          notes: addNote(place.notes, `Visited ${today()} (${visit.rank})${visit.note ? `: ${visit.note}` : ''}`),
        };
        await writeJson(placesFile, places.map((p) => (p.id === id ? updated : p)));
        return updated;
      }),

    skipDraft: (id: string) =>
      serial(async () => {
        const draft = await getDraft(id);
        if (draft.image) await rm(join(dataDir, draft.image), { force: true });
        await rm(draftFile(id));
      }),
  };
}

export type Store = ReturnType<typeof createStore>;
