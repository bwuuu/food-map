import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { Unauthorized } from './auth.ts';
import { createApp } from './app.ts';

let root: string;
beforeAll(async () => {
  root = await mkdtemp(join(tmpdir(), 'food-map-'));
  await mkdir(join(root, 'data/images'), { recursive: true });
  await mkdir(join(root, 'web'));
  await writeFile(join(root, 'data/places.json'), '[{"id":"p_1","name":"Rachel"}]');
  await writeFile(join(root, 'data/images/a.jpg'), 'jpg');
  await writeFile(join(root, 'data/secret.txt'), 'nope');
  await writeFile(join(root, 'web/index.html'), '<h1>map</h1>');
});

const app = (signedIn: boolean) =>
  createApp({
    identify: async () => {
      if (!signedIn) throw new Unauthorized('not signed in');
      return { email: 'me@example.com' };
    },
    dataDir: join(root, 'data'),
    webDir: join(root, 'web'),
  });

describe('app', () => {
  it('serves nothing to a request Access did not sign, pages included', async () => {
    for (const path of ['/', '/api/places', '/images/a.jpg']) {
      expect((await app(false).request(path)).status).toBe(401);
    }
  });

  it('serves the page, the places and the images when signed in', async () => {
    expect(await (await app(true).request('/')).text()).toContain('map');
    expect(await (await app(true).request('/api/places')).json()).toEqual([{ id: 'p_1', name: 'Rachel' }]);
    expect(await (await app(true).request('/images/a.jpg')).text()).toBe('jpg');
  });

  it('does not let /images reach other files in the data directory', async () => {
    for (const path of ['/images/../secret.txt', '/images/%2e%2e/secret.txt', '/images/..%2fsecret.txt']) {
      const res = await app(true).request(path);
      expect(await res.text()).not.toBe('nope');
    }
  });
});
