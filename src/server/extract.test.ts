/**
 * Fixtures, not live calls: the Places responses follow the documented
 * places:searchText shape and the redirects mimic maps.app.goo.gl. Record real
 * responses here once the API keys exist.
 */
import { describe, expect, it, vi } from 'vitest';
import type { Draft } from '../place.ts';
import { MODEL, createExtractor, resolveMapsLink, type ExtractDeps, type ShareReading } from './extract.ts';

const draft = (d: Partial<Draft>): Draft => ({
  id: 'd_000000000001', createdAt: '2026-10-07T00:00:00Z', title: null, text: null, url: null, image: null,
  extraction: 'pending', suggestion: null, ...d,
});

const PLACE_URL = 'https://www.google.com/maps/place/%E9%98%BF%E5%AE%97%E9%BA%B5%E7%B7%9A/@25.0400,121.5000,15z/data=!3d25.0441!4d121.5076';

/** A fake network: redirects for goo.gl, JSON for Places, and a record of every request. */
function fakeFetch(places: unknown[] = [], redirects: Record<string, string> = {}) {
  const calls: { url: string; body?: unknown }[] = [];
  const fn = vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    calls.push({ url, body: init?.body ? JSON.parse(String(init.body)) : undefined });
    if (redirects[url]) return new Response(null, { status: 302, headers: { location: redirects[url] } });
    if (url.startsWith('https://places.googleapis.com/')) return Response.json({ places });
    return new Response('not found', { status: 404 });
  });
  return { fetch: fn as unknown as typeof fetch, calls };
}

function fakeClaude(reading: ShareReading | null, opts: { refuse?: boolean; fail?: boolean } = {}) {
  const parse = vi.fn(async () => {
    if (opts.fail) throw new Error('overloaded');
    return { stop_reason: opts.refuse ? 'refusal' : 'end_turn', parsed_output: reading };
  });
  return { client: { beta: { messages: { parse } } } as unknown as ExtractDeps['anthropic'], parse };
}

const ahZong = { id: 'ChIJahzong', displayName: { text: 'Ay-Chung Flour-Rice Noodle' }, formattedAddress: 'No. 8-1, Emei St, Wanhua District, Taipei City, 108', location: { latitude: 25.04412, longitude: 121.50761 } };

describe('Google Maps shares', () => {
  it('resolves a short link and pins the place with Places, without calling Claude', async () => {
    const net = fakeFetch([ahZong], { 'https://maps.app.goo.gl/abc': PLACE_URL });
    const claude = fakeClaude(null);
    const extract = createExtractor({ anthropic: claude.client, placesKey: 'k', fetch: net.fetch });

    const s = await extract(draft({ title: '阿宗麵線', text: 'https://maps.app.goo.gl/abc' }), null);

    expect(s).toMatchObject({
      name: '阿宗麵線', lat: 25.04412, lng: 121.50761, googlePlaceId: 'ChIJahzong',
      area: 'Wanhua District', address: ahZong.formattedAddress, confidence: 'high', note: null,
    });
    expect(claude.parse).not.toHaveBeenCalled();
    // Searched near the link's place pin (!3d/!4d), not the whole city.
    const search = net.calls.find((c) => c.url.includes('places.googleapis.com'))!.body as { textQuery: string; locationBias: { circle: { center: unknown; radius: number } } };
    expect(search.textQuery).toBe('阿宗麵線');
    expect(search.locationBias.circle).toEqual({ center: { latitude: 25.0441, longitude: 121.5076 }, radius: 300 });
  });

  it('still pins from the link alone when there is no Places key', async () => {
    const net = fakeFetch([], { 'https://maps.app.goo.gl/abc': PLACE_URL });
    const s = await createExtractor({ anthropic: null, placesKey: null, fetch: net.fetch })(draft({ url: 'https://maps.app.goo.gl/abc' }), null);
    expect(s).toMatchObject({ name: '阿宗麵線', lat: 25.0441, lng: 121.5076, confidence: 'high', googlePlaceId: null });
  });

  it('only fetches goo.gl, and never follows a redirect off Google', async () => {
    const net = fakeFetch([], { 'https://maps.app.goo.gl/evil': 'http://169.254.169.254/latest/meta-data' });
    const r = await resolveMapsLink('https://maps.app.goo.gl/evil', net.fetch);
    expect(r.coords).toBeNull();
    expect(net.calls.map((c) => c.url)).toEqual(['https://maps.app.goo.gl/evil']);

    const long = fakeFetch();
    await resolveMapsLink(PLACE_URL, long.fetch);
    expect(long.calls).toEqual([]); // a full Maps URL is parsed, not fetched
  });
});

describe('screenshots', () => {
  const rachel: ShareReading = {
    is_food_place: true, name: '芮秋 Rachel', area: 'Songshan District', why: 'Iron-skillet Dutch baby that took a year to perfect',
    dishes: ['Dutch baby pancake'], category: 'Brunch', cuisine: 'European',
  };
  const jpeg = { bytes: new Uint8Array([0xff, 0xd8, 0xff]), mediaType: 'image/jpeg' as const };

  it('reads the screenshot with Claude, then pins it with Places', async () => {
    const net = fakeFetch([{ id: 'ChIJrachel', formattedAddress: 'Songshan District, Taipei', location: { latitude: 25.0512, longitude: 121.5612 } }]);
    const claude = fakeClaude(rachel);
    const s = await createExtractor({ anthropic: claude.client, placesKey: 'k', fetch: net.fetch })(
      draft({ text: 'https://www.instagram.com/p/xyz/', image: 'images/d_000000000001.jpg' }), jpeg,
    );

    expect(s).toMatchObject({ name: '芮秋 Rachel', why: rachel.why, dishes: ['Dutch baby pancake'], category: 'Brunch', lat: 25.0512, googlePlaceId: 'ChIJrachel', confidence: 'high' });
    const [params] = claude.parse.mock.calls[0] as unknown as [Record<string, unknown>];
    expect(params).toMatchObject({ model: MODEL, fallbacks: 'default', betas: ['server-side-fallback-2026-07-01'], output_config: { effort: 'low' } });
    const content = (params.messages as { content: { type: string; source?: { data: string; media_type: string } }[] }[])[0]!.content;
    expect(content[0]).toMatchObject({ type: 'image', source: { media_type: 'image/jpeg', data: Buffer.from(jpeg.bytes).toString('base64') } });
    const search = net.calls[0]!.body as { textQuery: string; locationBias: { circle: { radius: number } } };
    expect(search.textQuery).toBe('芮秋 Rachel Songshan District');
    expect(search.locationBias.circle.radius).toBe(50_000);
  });

  it('keeps what Claude read but places no pin when Places finds nothing', async () => {
    const s = await createExtractor({ anthropic: fakeClaude({ ...rachel, name: '小巷子麵店', area: null }).client, placesKey: 'k', fetch: fakeFetch([]).fetch })(draft({}), jpeg);
    expect(s).toMatchObject({ name: '小巷子麵店', lat: null, lng: null, confidence: 'low' });
    expect(s.note).toMatch(/drop the pin yourself/);
  });

  it('survives Claude failing or declining', async () => {
    const failed = await createExtractor({ anthropic: fakeClaude(null, { fail: true }).client, placesKey: 'k', fetch: fakeFetch().fetch })(draft({}), jpeg);
    expect(failed).toMatchObject({ name: null, confidence: 'low' });
    expect(failed.note).toMatch(/Couldn’t read/);
    const refused = await createExtractor({ anthropic: fakeClaude(null, { refuse: true }).client, placesKey: 'k', fetch: fakeFetch().fetch })(draft({}), jpeg);
    expect(refused.note).toMatch(/declined/);
  });

  it('notes a share that is not about food', async () => {
    const s = await createExtractor({ anthropic: fakeClaude({ ...rachel, is_food_place: false, name: null }).client, placesKey: 'k', fetch: fakeFetch().fetch })(draft({}), jpeg);
    expect(s.note).toMatch(/doesn’t look like a place to eat/);
  });
});
