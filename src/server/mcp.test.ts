import { mkdtemp } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import type { Place } from '../place.ts';
import { Unauthorized } from './auth.ts';
import { createApp } from './app.ts';
import { checkKey, failureLimiter, newKey } from './keys.ts';
import { createStore } from './store.ts';

let dataDir: string;
let app: ReturnType<typeof createApp>;
let writeKey: string;
let readKey: string;

beforeEach(async () => {
  dataDir = await mkdtemp(join(tmpdir(), 'food-map-mcp-'));
  // Signed out for Access: /mcp must work on its key alone.
  app = createApp({ identify: async () => { throw new Unauthorized('not signed in'); }, dataDir, webDir: dataDir });
  const w = newKey('claude-laptop', 'write');
  const r = newKey('reader', 'read');
  await createStore(dataDir).updateKeys((keys) => Object.assign(keys, { [w.record.id]: w.record, [r.record.id]: r.record }));
  writeKey = w.token;
  readKey = r.token;
});

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);

let nextId = 1;
const rpc = (key: string | null, method: string, params?: object, addr = '1.2.3.4') =>
  app.request('/mcp', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'cf-connecting-ip': addr, ...(key ? { authorization: `Bearer ${key}` } : {}) },
    body: JSON.stringify({ jsonrpc: '2.0', id: nextId++, method, params }),
  });

async function tool(name: string, args: object = {}, key = writeKey) {
  const { result } = await (await rpc(key, 'tools/call', { name, arguments: args })).json();
  return result as { content: { type: string; text?: string; data?: string; mimeType?: string }[]; isError: boolean };
}
const json = async (name: string, args: object = {}) => JSON.parse((await tool(name, args)).content[0]!.text!);

async function share(fields: Record<string, string>, image?: typeof JPEG) {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  if (image) form.set('image', new File([image], 's.jpg', { type: 'image/jpeg' }));
  // /share is behind Access; use a signed-in app on the same data.
  await createApp({ identify: async () => ({ email: 'me@example.com' }), dataDir, webDir: dataDir }).request('/share', { method: 'POST', body: form });
}

describe('/mcp auth', () => {
  it('answers only to a live API key, never to the Access sign-in alone', async () => {
    expect((await rpc(null, 'ping')).status).toBe(401);
    expect((await rpc('fmk_000000000000_nottherealkeynottherealkey', 'ping')).status).toBe(401);
    expect((await rpc(writeKey, 'ping')).status).toBe(200);
  });

  it('refuses revoked and expired keys', () => {
    const { token, record } = newKey('old', 'write', 1, Date.parse('2026-01-01'));
    expect(checkKey(`Bearer ${token}`, { [record.id]: record }, Date.parse('2026-01-01'))).toMatchObject({ name: 'old' });
    expect(checkKey(`Bearer ${token}`, { [record.id]: record }, Date.parse('2026-01-03'))).toMatch(/expired/);
    expect(checkKey(`Bearer ${token}`, { [record.id]: { ...record, revoked: '2026-01-01' } }, Date.parse('2026-01-01'))).toMatch(/revoked/);
    expect(checkKey(`Bearer ${token}x`, { [record.id]: record })).toBe('unknown API key');
  });

  it('rate-limits failed attempts per address', async () => {
    for (let i = 0; i < 10; i++) await rpc('fmk_bad', 'ping', undefined, '9.9.9.9');
    expect((await rpc(writeKey, 'ping', undefined, '9.9.9.9')).status).toBe(429);
    expect((await rpc(writeKey, 'ping', undefined, '8.8.8.8')).status).toBe(200);
    const limiter = failureLimiter(1, 1000);
    limiter.fail('a', 0);
    expect(limiter.blocked('a', 500)).toBe(true);
    expect(limiter.blocked('a', 1500)).toBe(false);
  });

  it('keeps a read-only key from writing', async () => {
    await share({ text: 'hi' });
    const [draft] = await json('list_inbox');
    const res = await tool('skip_draft', { id: draft.id }, readKey);
    expect(res).toMatchObject({ isError: true, content: [{ text: expect.stringMatching(/read-only/) }] });
    expect(await json('list_inbox')).toHaveLength(1);
  });
});

describe('/mcp protocol', () => {
  it('initializes, lists tools, and answers notifications with 202', async () => {
    const init = await (await rpc(writeKey, 'initialize', { protocolVersion: '2025-06-18' })).json();
    expect(init.result).toMatchObject({ protocolVersion: '2025-06-18', serverInfo: { name: 'food-map' } });
    const { result } = await (await rpc(writeKey, 'tools/list')).json();
    const names = result.tools.map((t: { name: string }) => t.name);
    expect(names).toEqual(['list_inbox', 'get_draft', 'resolve_draft', 'flag_draft', 'skip_draft', 'search_places', 'record_visit']); // no find_place without a Places key
    const note = await app.request('/mcp', {
      method: 'POST',
      headers: { authorization: `Bearer ${writeKey}` },
      body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' }),
    });
    expect(note.status).toBe(202);
    expect((await app.request('/mcp', { headers: { authorization: `Bearer ${writeKey}` } })).status).toBe(405);
  });
});

describe('/mcp tools', () => {
  it('works a share from the inbox onto the map, and records a visit', async () => {
    await share({ text: 'Dutch baby! https://www.instagram.com/p/abc/' }, JPEG);
    const [draft] = await json('list_inbox');
    expect(draft).toMatchObject({ hasScreenshot: true, url: 'https://www.instagram.com/p/abc/' });

    const got = await tool('get_draft', { id: draft.id });
    expect(got.content[1]).toEqual({ type: 'image', mimeType: 'image/jpeg', data: Buffer.from(JPEG).toString('base64') });

    // The inbox's own checks apply.
    expect(await tool('resolve_draft', { id: draft.id, name: 'Rachel', lat: 25, lng: 121 })).toMatchObject({ isError: true, content: [{ text: expect.stringMatching(/why is required/) }] });

    const saved = await json('resolve_draft', { id: draft.id, name: '芮秋 Rachel', why: 'Dutch baby pancake', lat: 25.0512345, lng: 121.5612345, sourceType: 'ig', googlePlaceId: 'ChIJrachel' });
    expect(saved).toMatchObject({ merged: false, place: { name: '芮秋 Rachel', lat: 25.0512345, status: 'want' } });
    expect(await json('list_inbox')).toEqual([]);

    const found: Place[] = await json('search_places', { query: 'dutch' });
    expect(found.map((p) => p.id)).toEqual([saved.place.id]);
    expect(await json('search_places', { status: 'visited' })).toEqual([]);

    const visited = await json('record_visit', { id: saved.place.id, rank: 'T5', note: 'worth it' });
    expect(visited).toMatchObject({ status: 'visited', rank: 'T5' });
  });

  it('merges a second share of the same place instead of duplicating it', async () => {
    const pin = { name: 'Rachel', lat: 25.05, lng: 121.56, googlePlaceId: 'ChIJrachel' };
    await share({ text: 'one' });
    await json('resolve_draft', { id: (await json('list_inbox'))[0].id, ...pin, why: 'pancakes' });
    await share({ text: 'two' });
    const again = await json('resolve_draft', { id: (await json('list_inbox'))[0].id, ...pin, why: 'coffee too' });
    expect(again.merged).toBe(true);
    expect(await json('search_places')).toHaveLength(1);
  });

  it('skips a draft, and says so when an id is unknown', async () => {
    await share({ text: 'not food' });
    const [draft] = await json('list_inbox');
    expect(await json('skip_draft', { id: draft.id })).toEqual({ skipped: draft.id });
    expect(await tool('get_draft', { id: draft.id })).toMatchObject({ isError: true, content: [{ text: expect.stringMatching(/not found/) }] });
  });

  it('puts only a confirmed pin on the map, and records which agent did (#18)', async () => {
    await share({ text: 'somewhere' });
    const [draft] = await json('list_inbox');
    const guess = { id: draft.id, name: 'Rachel', why: 'pancakes', lat: 25.05, lng: 121.56 };
    expect(await tool('resolve_draft', guess)).toMatchObject({ isError: true, content: [{ text: expect.stringMatching(/unconfirmed pin/) }] });

    // A Maps link's pin, as the extractor leaves it on the draft.
    await createStore(dataDir).finishExtraction(draft.id, { name: 'Rachel', why: null, dishes: [], area: null, category: null, cuisine: null, lat: 25.0512345, lng: 121.5612345, address: null, googlePlaceId: null, confidence: 'high', note: null });
    expect(await tool('resolve_draft', { ...guess, lat: 25.05 })).toMatchObject({ isError: true });
    const { place } = await json('resolve_draft', { ...guess, lat: 25.0512345, lng: 121.5612345 });
    expect(place).toMatchObject({ addedBy: 'claude-laptop', lat: 25.0512345 });
  });

  it('flags a draft for the person: the reading pre-fills the form, and the next run leaves it alone', async () => {
    await share({ text: 'Rachel pancakes' });
    const [draft] = await json('list_inbox');
    expect(await tool('flag_draft', { id: draft.id })).toMatchObject({ isError: true });
    expect(await json('flag_draft', { id: draft.id, reason: 'No Places match: drop the pin.', name: '芮秋 Rachel', why: 'Dutch baby', dishes: ['Dutch baby'] })).toEqual({ flagged: draft.id });
    expect(await json('list_inbox')).toEqual([]);
    const [flagged] = await json('list_inbox', { all: true });
    expect(flagged).toMatchObject({
      flagged: { by: 'claude-laptop' },
      extraction: 'done',
      suggestion: { name: '芮秋 Rachel', why: 'Dutch baby', dishes: ['Dutch baby'], lat: null, confidence: 'low', note: 'No Places match: drop the pin.' },
    });
  });

  it('lets me remove a place an agent added, but not one I saved or visited', async () => {
    const signedIn = createApp({ identify: async () => ({ email: 'me@example.com' }), dataDir, webDir: dataDir });
    const del = (id: string) => signedIn.request(`/api/places/${id}`, { method: 'DELETE' });
    const pin = { lat: 25.05, lng: 121.56, why: 'x' };
    await share({ text: 'a' });
    const agents = (await json('resolve_draft', { id: (await json('list_inbox'))[0].id, ...pin, name: 'A', googlePlaceId: 'ChIJa' })).place;
    await share({ text: 'b' });
    const visited = (await json('resolve_draft', { id: (await json('list_inbox'))[0].id, ...pin, name: 'B', googlePlaceId: 'ChIJb' })).place;
    await json('record_visit', { id: visited.id, rank: 'T4' });
    await share({ text: 'c' });
    const mine = (await (await signedIn.request(`/api/drafts/${(await json('list_inbox'))[0].id}/save`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...pin, name: 'C' }),
    })).json()).place;
    expect(mine.addedBy).toBeUndefined();

    expect((await del(mine.id)).status).toBe(404);
    expect((await del(visited.id)).status).toBe(404);
    expect((await del(agents.id)).status).toBe(204);
    expect((await json('search_places')).map((p: Place) => p.name).sort()).toEqual(['B', 'C']);
  });

  it('offers find_place only with a Places lookup', async () => {
    app = createApp({
      identify: async () => ({ email: null }),
      dataDir,
      webDir: dataDir,
      findPlace: async (q) => ({ googlePlaceId: 'ChIJx', name: q, address: null, lat: 25, lng: 121 }),
    });
    expect(await json('find_place', { query: 'Rachel' })).toMatchObject({ googlePlaceId: 'ChIJx', name: 'Rachel' });
  });
});
