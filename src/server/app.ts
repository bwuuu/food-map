import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Hono } from 'hono';
import { serveStatic } from '@hono/node-server/serve-static';
import { Unauthorized, type Identify } from './auth.ts';

export function createApp({ identify, dataDir, webDir }: { identify: Identify; dataDir: string; webDir: string }) {
  const app = new Hono();

  // Everything is private, pages included: one rule, nothing to forget later.
  app.use('*', async (c, next) => {
    try {
      await identify(c.req.raw.headers);
    } catch (e) {
      if (e instanceof Unauthorized) return c.text(e.message, 401);
      throw e;
    }
    await next();
  });

  // Read per request: a few KB for one user, and it can never be stale.
  app.get('/api/places', async (c) => {
    try {
      return c.json(JSON.parse(await readFile(join(dataDir, 'places.json'), 'utf8')));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return c.json([]);
      throw e;
    }
  });

  app.use('/images/*', serveStatic({ root: dataDir }));
  app.use('*', serveStatic({ root: webDir }));
  return app;
}
