/**
 * Manage agent API keys for /mcp (#19). Run inside the container:
 *   docker compose exec app node src/server/key-cli.ts new claude-laptop [--read] [--days 90]
 *   docker compose exec app node src/server/key-cli.ts list
 *   docker compose exec app node src/server/key-cli.ts revoke <id>
 * The key is printed once: put it in Bitwarden. Only its hash is kept.
 */
import { parseArgs } from 'node:util';
import { KEY_DAYS, newKey } from './keys.ts';
import { createStore } from './store.ts';

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { read: { type: 'boolean', default: false }, days: { type: 'string', default: String(KEY_DAYS) } },
});
const [command, arg] = positionals;
const store = createStore(process.env.DATA_DIR ?? '/data');

if (command === 'new' && arg) {
  const { token, record } = newKey(arg, values.read ? 'read' : 'write', Number(values.days));
  await store.updateKeys((keys) => {
    keys[record.id] = record;
  });
  console.log(`${record.name} (${record.id}, ${record.scope}), expires ${record.expires.slice(0, 10)}. Shown once:\n\n${token}\n`);
} else if (command === 'list') {
  for (const k of Object.values(await store.keys())) {
    const state = k.revoked ? `revoked ${k.revoked.slice(0, 10)}` : `expires ${k.expires.slice(0, 10)}`;
    console.log(`${k.id}  ${k.name.padEnd(20)} ${k.scope.padEnd(5)} ${state}`);
  }
} else if (command === 'revoke' && arg) {
  let found = false;
  await store.updateKeys((keys) => {
    const k = keys[arg];
    if (k) {
      found = true;
      k.revoked ??= new Date().toISOString();
    }
  });
  console.log(found ? `revoked ${arg}` : `no key ${arg}`);
  if (!found) process.exitCode = 1;
} else {
  console.error('usage: key-cli.ts new <name> [--read] [--days N] | list | revoke <id>');
  process.exitCode = 2;
}
