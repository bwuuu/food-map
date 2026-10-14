/**
 * API keys for agents on /mcp (#19). Agents can't do the Cloudflare Access
 * sign-in, so /mcp has its own Access bypass and these keys are its only gate.
 * Same design as SFDC_Ticket_Portal's cfk_ keys: shown once, stored as SHA-256,
 * compared in constant time, expiring, revocable, failures rate-limited.
 */
import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';

export const KEY_SCOPES = ['read', 'write'] as const;
export type KeyScope = (typeof KEY_SCOPES)[number];
export const KEY_DAYS = 90;

export interface KeyRecord {
  id: string;
  /** Who uses it, e.g. "claude-laptop". */
  name: string;
  scope: KeyScope;
  created: string;
  expires: string;
  revoked: string | null;
  hash: string;
}

const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

/** The plaintext token is returned once and never stored. */
export function newKey(name: string, scope: KeyScope, days = KEY_DAYS, now = Date.now()) {
  if (!/^[\w.-]{1,60}$/.test(name)) throw new Error('name the key after the agent that uses it, e.g. claude-laptop (letters, digits, . _ -)');
  if (!KEY_SCOPES.includes(scope)) throw new Error('scope must be read or write');
  if (!Number.isInteger(days) || days < 1 || days > 365) throw new Error('days must be a whole number from 1 to 365');
  const id = randomBytes(6).toString('hex');
  const token = `fmk_${id}_${randomBytes(32).toString('base64url')}`;
  const record: KeyRecord = {
    id, name, scope,
    created: new Date(now).toISOString(),
    expires: new Date(now + days * 86_400_000).toISOString(),
    revoked: null,
    hash: sha256(token),
  };
  return { token, record };
}

/** The live key an `Authorization: Bearer fmk_…` header names, or why not. */
export function checkKey(header: string | null, keys: Record<string, KeyRecord>, now = Date.now()): KeyRecord | string {
  const token = header?.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return 'this endpoint needs an API key: Authorization: Bearer fmk_…';
  const rec = keys[token.match(/^fmk_([0-9a-f]{12})_[\w-]{20,}$/)?.[1] ?? ''];
  if (!rec || !timingSafeEqual(Buffer.from(rec.hash), Buffer.from(sha256(token)))) return 'unknown API key';
  if (rec.revoked) return 'this API key was revoked';
  if (Date.parse(rec.expires) < now) return 'this API key has expired: create a new one';
  return rec;
}

/**
 * Failed attempts per client address per minute. Keys are 256-bit, so this is
 * about log noise and load, not guessing.
 * ponytail: in-memory, one container; resets on restart.
 */
export function failureLimiter(max = 10, windowMs = 60_000) {
  const seen = new Map<string, number[]>();
  const recent = (addr: string, now: number) => (seen.get(addr) ?? []).filter((t) => now - t < windowMs);
  return {
    blocked: (addr: string, now = Date.now()) => recent(addr, now).length >= max,
    fail(addr: string, now = Date.now()) {
      if (seen.size > 10_000) seen.clear(); // bounded memory beats a perfect count
      seen.set(addr, [...recent(addr, now), now]);
    },
  };
}
