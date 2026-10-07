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
import type { Draft, Place, SaveInput } from '../place.ts';

export const isDraftId = (id: string) => /^d_[0-9a-f]{12}$/.test(id);

export class NotFound extends Error {}

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

    async addDraft(share: { title: string | null; text: string | null; url: string | null; image: { bytes: Uint8Array; ext: string } | null }) {
      const id = `d_${randomBytes(6).toString('hex')}`;
      let image: string | null = null;
      if (share.image) {
        await mkdir(imagesDir, { recursive: true });
        image = `images/${id}.${share.image.ext}`;
        await writeFile(join(dataDir, image), share.image.bytes);
      }
      const draft: Draft = { id, createdAt: new Date().toISOString(), title: share.title, text: share.text, url: share.url, image };
      await mkdir(draftsDir, { recursive: true });
      await writeJson(draftFile(id), draft);
      return draft;
    },

    /** Draft → place. The screenshot stays in images/ and moves to the place's source. */
    saveDraft: (id: string, input: SaveInput) =>
      serial(async () => {
        const draft = await getDraft(id);
        const place: Place = {
          id: `p_${randomBytes(4).toString('hex')}`,
          name: input.name,
          lat: input.lat,
          lng: input.lng,
          address: null,
          area: input.area,
          googlePlaceId: null,
          category: null,
          cuisine: null,
          price: null,
          why: input.why,
          dishes: input.dishes,
          sources: [{ type: input.sourceType, detail: input.sourceDetail, url: draft.url, image: draft.image }],
          status: 'want',
          rank: null,
          notes: null,
        };
        const places = await readJson<Place[]>(placesFile, []);
        await writeJson(placesFile, [...places, place]);
        await rm(draftFile(id));
        return place;
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
