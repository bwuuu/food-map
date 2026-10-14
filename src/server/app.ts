import { Hono } from 'hono';
import { bodyLimit } from 'hono/body-limit';
import { serveStatic } from '@hono/node-server/serve-static';
import { RANKS, SOURCE_TYPES, type SaveInput, type Source, type VisitInput } from '../place.ts';
import { Unauthorized, type Identify } from './auth.ts';
import type { Extract, ImageInput, PlaceMatch } from './extract.ts';
import { checkKey, failureLimiter } from './keys.ts';
import { createMcp } from './mcp.ts';
import { NotFound, createStore, imageExtension } from './store.ts';

const MAX_UPLOAD = 20 * 1024 * 1024; // phone screenshots are 1–5 MB

const text = (v: unknown, max = 2000) => (typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null);

/** Instagram and others put the link inside the shared text, not in `url`. */
const firstUrl = (s: string | null) => s?.match(/https?:\/\/\S+/)?.[0] ?? null;

/** The trust boundary for saves: everything the inbox sends is checked here. */
export function parseSaveInput(body: unknown): SaveInput | string {
  if (typeof body !== 'object' || body === null) return 'expected a JSON object';
  const b = body as Record<string, unknown>;
  const name = text(b.name, 200);
  const why = text(b.why);
  const { lat, lng } = b;
  if (!name) return 'name is required';
  if (!why) return 'why is required: it is the point of the map';
  if (typeof lat !== 'number' || typeof lng !== 'number' || Math.abs(lat) > 90 || Math.abs(lng) > 180) {
    return 'a pin (lat, lng) is required';
  }
  const sourceType = SOURCE_TYPES.includes(b.sourceType as Source['type']) ? (b.sourceType as Source['type']) : 'web';
  const dishes = Array.isArray(b.dishes) ? b.dishes.map((d) => text(d, 300)).filter((d): d is string => !!d) : [];
  return {
    name, why, lat, lng, dishes,
    area: text(b.area, 100),
    sourceType,
    sourceDetail: text(b.sourceDetail, 200),
    category: text(b.category, 100),
    cuisine: text(b.cuisine, 100),
    address: text(b.address, 300),
    googlePlaceId: text(b.googlePlaceId, 300),
  };
}

export function parseVisitInput(body: unknown): VisitInput | string {
  if (typeof body !== 'object' || body === null) return 'expected a JSON object';
  const b = body as Record<string, unknown>;
  if (!RANKS.includes(b.rank as VisitInput['rank'])) return 'rank must be T1–T5';
  return { rank: b.rank as VisitInput['rank'], note: text(b.note, 1000) };
}

export function createApp({ identify, dataDir, webDir, extract, findPlace }: {
  identify: Identify;
  dataDir: string;
  webDir: string;
  extract?: Extract;
  findPlace?: (query: string) => Promise<PlaceMatch | null>;
}) {
  const app = new Hono();
  const store = createStore(dataDir);
  const mcp = createMcp({ store, dataDir, findPlace });
  const failures = failureLimiter();

  // Agents can't do the Access sign-in: /mcp has its own Access bypass, and an
  // app-issued API key (keys.ts) is its only gate. Registered before the
  // sign-in check, and it always answers, so nothing else is reachable this way.
  app.all('/mcp', async (c) => {
    // Cloudflare sets this and overwrites any value a client sends.
    const addr = c.req.header('cf-connecting-ip') ?? 'direct';
    if (failures.blocked(addr)) return c.json({ error: 'too many failed key attempts: wait a minute' }, 429);
    const key = checkKey(c.req.header('authorization') ?? null, await store.keys());
    if (typeof key === 'string') {
      failures.fail(addr);
      return c.json({ error: key }, 401);
    }
    // Stateless Streamable HTTP: no server-sent event stream to open.
    if (c.req.method !== 'POST') return c.body(null, 405, { allow: 'POST' });
    const body = await c.req.json().catch(() => undefined);
    if (body === undefined) return c.json({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } }, 400);
    const answer = await mcp(body, key.scope);
    return answer ? c.json(answer) : c.body(null, 202);
  });

  // The manifest and icons are public: browsers and Chrome's WebAPK minting fetch
  // them without my cookie, and without them the app can't install as a share
  // target (#16). Static and non-sensitive; nothing else is served from /pwa/.
  app.use('/pwa/*', serveStatic({ root: webDir }));

  // Everything else is private, pages included.
  app.use('*', async (c, next) => {
    try {
      await identify(c.req.raw.headers);
    } catch (e) {
      if (e instanceof Unauthorized) return c.text(e.message, 401);
      throw e;
    }
    await next();
  });

  app.onError((e, c) => {
    if (e instanceof NotFound) return c.json({ error: 'not found' }, 404);
    console.error(e);
    return c.json({ error: 'something went wrong' }, 500);
  });

  app.get('/api/places', async (c) => c.json(await store.places()));
  app.get('/api/drafts', async (c) => c.json(await store.drafts()));
  app.get('/api/drafts/:id', async (c) => c.json(await store.draft(c.req.param('id'))));

  // The Android share sheet posts here (pwa/manifest.webmanifest → share_target).
  app.post('/share', bodyLimit({ maxSize: MAX_UPLOAD, onError: (c) => c.text('That file is too large.', 413) }), async (c) => {
    const form = await c.req.formData();
    const image = form.get('image');
    let upload: { bytes: Uint8Array; ext: string; mediaType: ImageInput['mediaType'] } | null = null;
    if (image instanceof File && image.size > 0) {
      const ext = imageExtension(image.type);
      if (!ext) return c.text('Only JPEG, PNG, WebP or GIF images can be shared.', 415);
      upload = { bytes: new Uint8Array(await image.arrayBuffer()), ext, mediaType: image.type as ImageInput['mediaType'] };
    }
    const title = text(form.get('title'), 500);
    const sharedText = text(form.get('text'));
    const url = text(form.get('url'), 2000) ?? firstUrl(sharedText);
    if (!title && !sharedText && !url && !upload) return c.text('Nothing was shared.', 400);
    const draft = await store.addDraft({ title, text: sharedText, url, image: upload }, extract ? 'pending' : 'off');
    // Not awaited: the share is safe on disk, and the inbox polls for the result.
    if (extract) {
      extract(draft, upload)
        .then((suggestion) => store.finishExtraction(draft.id, suggestion))
        .catch(async (e) => {
          console.error(`[extract] ${draft.id} failed:`, e);
          await store.finishExtraction(draft.id, null).catch(() => {});
        });
    }
    return c.redirect(`/inbox.html#${draft.id}`, 303);
  });

  app.post('/api/drafts/:id/save', async (c) => {
    const input = parseSaveInput(await c.req.json().catch(() => null));
    if (typeof input === 'string') return c.json({ error: input }, 400);
    return c.json(await store.saveDraft(c.req.param('id'), input));
  });

  app.post('/api/places/:id/visit', async (c) => {
    const visit = parseVisitInput(await c.req.json().catch(() => null));
    if (typeof visit === 'string') return c.json({ error: visit }, 400);
    return c.json(await store.recordVisit(c.req.param('id'), visit));
  });

  app.delete('/api/drafts/:id', async (c) => {
    await store.skipDraft(c.req.param('id'));
    return c.body(null, 204);
  });

  app.use('/images/*', serveStatic({ root: dataDir }));
  app.use('*', serveStatic({ root: webDir }));
  return app;
}
