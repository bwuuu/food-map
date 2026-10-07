import { mkdtemp, readdir, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Draft, Place, Suggestion } from '../place.ts';
import { createApp, parseSaveInput } from './app.ts';

let dataDir: string;
let app: ReturnType<typeof createApp>;
beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'food-map-inbox-'));
  app = createApp({ identify: async () => ({ email: 'me@example.com' }), dataDir, webDir: dataDir });
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

function share(fields: Record<string, string>, file?: File) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  if (file) form.set('image', file);
  return app.request('/share', { method: 'POST', body: form });
}

const drafts = async () => (await (await app.request('/api/drafts')).json()) as Draft[];
const places = async () => (await (await app.request('/api/places')).json()) as Place[];
const save = (id: string, body: unknown) =>
  app.request(`/api/drafts/${id}/save`, { method: 'POST', body: JSON.stringify(body), headers: { 'content-type': 'application/json' } });

const valid = { name: '芮秋 Rachel', why: 'Dutch baby pancake', lat: 25.0512345, lng: 121.5612345, dishes: ['Dutch baby'], sourceType: 'ig', sourceDetail: '@foodie', category: 'Brunch', cuisine: null, address: 'Songshan District, Taipei', googlePlaceId: 'ChIJrachel' };

describe('share → inbox → map', () => {
  it('stores a shared screenshot as a draft and redirects to it', async () => {
    const res = await share({ text: 'Look at this https://www.instagram.com/p/abc/ wow' }, new File([JPEG], 's.jpg', { type: 'image/jpeg' }));
    expect(res.status).toBe(303);
    const [draft] = await drafts();
    expect(res.headers.get('location')).toBe(`/inbox.html#${draft!.id}`);
    // The link is pulled out of the text: Instagram doesn't fill `url`.
    expect(draft).toMatchObject({ url: 'https://www.instagram.com/p/abc/', image: `images/${draft!.id}.jpg` });
    expect(new Uint8Array(await readFile(join(dataDir, draft!.image!)))).toEqual(JPEG);
  });

  it('saves a draft as a place, keeping its screenshot and link as the source', async () => {
    await share({ url: 'https://www.instagram.com/p/abc/' }, new File([JPEG], 's.jpg', { type: 'image/jpeg' }));
    const [draft] = await drafts();
    expect((await save(draft!.id, valid)).status).toBe(200);
    const [place] = await places();
    expect(place).toMatchObject({
      name: '芮秋 Rachel', why: 'Dutch baby pancake', lat: 25.0512345, status: 'want', rank: null,
      googlePlaceId: 'ChIJrachel', category: 'Brunch', address: 'Songshan District, Taipei',
      sources: [{ type: 'ig', detail: '@foodie', url: 'https://www.instagram.com/p/abc/', image: draft!.image }],
    });
    expect(await drafts()).toEqual([]);
    expect(await readdir(join(dataDir, 'images'))).toEqual([draft!.image!.slice('images/'.length)]);
  });

  it('keeps every place when saves arrive together', async () => {
    for (let i = 0; i < 5; i++) await share({ text: `place ${i}` });
    const ids = (await drafts()).map((d) => d.id);
    await Promise.all(ids.map((id, i) => save(id, { ...valid, name: `P${i}` })));
    expect((await places()).length).toBe(5);
  });

  it('skip deletes the draft and its screenshot', async () => {
    await share({}, new File([JPEG], 's.jpg', { type: 'image/jpeg' }));
    const [draft] = await drafts();
    expect((await app.request(`/api/drafts/${draft!.id}`, { method: 'DELETE' })).status).toBe(204);
    expect(await drafts()).toEqual([]);
    expect(await readdir(join(dataDir, 'images'))).toEqual([]);
  });

  it('refuses a save without a name, a why or a pin, and keeps the draft', async () => {
    await share({ text: 'x' });
    const [draft] = await drafts();
    for (const bad of [{ ...valid, name: ' ' }, { ...valid, why: '' }, { ...valid, lat: undefined }, { ...valid, lng: 999 }]) {
      expect((await save(draft!.id, bad)).status).toBe(400);
    }
    expect((await drafts()).length).toBe(1);
  });

  it('rejects empty shares and non-images', async () => {
    expect((await share({})).status).toBe(400);
    expect((await share({}, new File(['<svg/>'], 'x.svg', { type: 'image/svg+xml' }))).status).toBe(415);
    expect(await drafts()).toEqual([]);
  });

  it('rejects uploads over the size limit', async () => {
    const big = new File([new Uint8Array(21 * 1024 * 1024)], 'big.jpg', { type: 'image/jpeg' });
    expect((await share({}, big)).status).toBe(413);
  });

  it('treats ids that could escape the data directory as unknown', async () => {
    for (const id of ['..%2Fplaces', 'd_123', '..', 'd_zzzzzzzzzzzz']) {
      expect((await save(id, valid)).status).toBe(404);
      expect((await app.request(`/api/drafts/${id}`, { method: 'DELETE' })).status).toBe(404);
    }
  });
});

describe('parseSaveInput', () => {
  it('trims, drops empty dishes, and falls back to web for an unknown source type', () => {
    expect(parseSaveInput({ ...valid, name: '  Rachel ', dishes: ['a', ' ', 3], sourceType: 'tiktok', area: '' })).toEqual({
      name: 'Rachel', why: 'Dutch baby pancake', lat: 25.0512345, lng: 121.5612345, dishes: ['a'], area: null, sourceType: 'web', sourceDetail: '@foodie',
      category: 'Brunch', cuisine: null, address: 'Songshan District, Taipei', googlePlaceId: 'ChIJrachel',
    });
  });
});

describe('background extraction', () => {
  const suggestion: Suggestion = {
    name: 'Rachel', why: 'Dutch baby', dishes: [], area: null, category: null, cuisine: null,
    lat: 25.05, lng: 121.56, address: null, googlePlaceId: null, confidence: 'high', note: null,
  };
  const withExtract = (extract: () => Promise<Suggestion>) =>
    createApp({ identify: async () => ({ email: 'me@example.com' }), dataDir, webDir: dataDir, extract });

  it('redirects before extraction finishes, then fills in the draft', async () => {
    let finish!: (s: Suggestion) => void;
    app = withExtract(() => new Promise((resolve) => (finish = resolve)));
    expect((await share({ text: 'x' })).status).toBe(303);
    const [draft] = await drafts();
    expect(draft).toMatchObject({ extraction: 'pending', suggestion: null });

    finish(suggestion);
    await vi.waitFor(async () => {
      expect(await (await app.request(`/api/drafts/${draft!.id}`)).json()).toMatchObject({ extraction: 'done', suggestion });
    });
  });

  it('marks the draft failed when extraction throws, and keeps the share', async () => {
    app = withExtract(async () => { throw new Error('boom'); });
    await share({ text: 'x' });
    await vi.waitFor(async () => expect((await drafts())[0]).toMatchObject({ extraction: 'failed', text: 'x' }));
  });

  it('does not bring back a draft that was skipped while extraction ran', async () => {
    let finish!: (s: Suggestion) => void;
    app = withExtract(() => new Promise((resolve) => (finish = resolve)));
    await share({ text: 'x' });
    const [draft] = await drafts();
    await app.request(`/api/drafts/${draft!.id}`, { method: 'DELETE' });
    finish(suggestion);
    await new Promise((r) => setTimeout(r, 50));
    expect(await drafts()).toEqual([]);
  });

  it('without an extractor, drafts are marked off', async () => {
    await share({ text: 'x' });
    expect((await drafts())[0]).toMatchObject({ extraction: 'off' });
  });
});
