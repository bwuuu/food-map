/** Entry point. Refuses to start misconfigured rather than start open. */
import { serve } from '@hono/node-server';
import { accessVerifier } from './auth.ts';
import { createApp } from './app.ts';

const PORT = Number(process.env.PORT ?? 8080);
const DATA_DIR = process.env.DATA_DIR ?? '/data';

const app = createApp({
  identify: accessVerifier({
    teamDomain: process.env.ACCESS_TEAM_DOMAIN,
    audience: process.env.ACCESS_AUD,
    devAccount: process.env.DEV_ACCOUNT,
  }),
  dataDir: DATA_DIR,
  webDir: process.env.WEB_DIR ?? './dist',
});

serve({ fetch: app.fetch, port: PORT }, () => console.log(`[server] listening on ${PORT}, data in ${DATA_DIR}`));
