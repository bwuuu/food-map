/** Entry point. Refuses to start misconfigured rather than start open. */
import { serve } from '@hono/node-server';
import { accessVerifier } from './auth.ts';
import Anthropic from '@anthropic-ai/sdk';
import { createApp } from './app.ts';
import { TAIPEI, createExtractor, findPlace } from './extract.ts';

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = process.env.DATA_DIR ?? '/data';
const PLACES_KEY = process.env.GOOGLE_PLACES_API_KEY || null;

const app = createApp({
  identify: accessVerifier({
    teamDomain: process.env.ACCESS_TEAM_DOMAIN,
    audience: process.env.ACCESS_AUD,
    devAccount: process.env.DEV_ACCOUNT,
  }),
  dataDir: DATA_DIR,
  webDir: process.env.WEB_DIR ?? './dist',
  // Maps links resolve without any key; the keys add screenshot reading and Places pins.
  extract: createExtractor({
    anthropic: process.env.ANTHROPIC_API_KEY ? new Anthropic() : null,
    placesKey: PLACES_KEY,
    fetch,
  }),
  // Offered to agents on /mcp as find_place.
  findPlace: PLACES_KEY ? (query) => findPlace(query, { ...TAIPEI, radius: 50_000 }, PLACES_KEY, fetch) : undefined,
});
console.log(
  `[server] extraction: Maps links on, Claude ${process.env.ANTHROPIC_API_KEY ? 'on' : 'off (no ANTHROPIC_API_KEY)'}, ` +
    `Google Places ${process.env.GOOGLE_PLACES_API_KEY ? 'on' : 'off (no GOOGLE_PLACES_API_KEY)'}`,
);

serve({ fetch: app.fetch, port: PORT }, () => console.log(`[server] listening on ${PORT}, data in ${DATA_DIR}`));
