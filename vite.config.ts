import { defineConfig } from 'vitest/config';

// The web pages live in src/web and build into dist/, which the server serves.
// In dev, Vite serves the pages and forwards data requests to `npm run dev:server`.
export default defineConfig({
  root: 'src/web',
  build: {
    outDir: '../../dist',
    emptyOutDir: true,
    rollupOptions: { input: { map: 'src/web/index.html', inbox: 'src/web/inbox.html' } },
  },
  server: {
    port: 5178,
    strictPort: true,
    proxy: { '/api': 'http://localhost:8080', '/images': 'http://localhost:8080', '/share': 'http://localhost:8080' },
  },
  test: { root: '.', include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'] },
});
