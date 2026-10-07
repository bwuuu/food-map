import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { describe, expect, it } from 'vitest';
import { Unauthorized, accessVerifier } from './auth.ts';

const TEAM = 'example.cloudflareaccess.com';
const AUD = 'aud-tag-for-this-app';

/** Stands in for Cloudflare: signs tokens, and serves the matching key set. */
async function fakeCloudflare() {
  const { publicKey, privateKey } = await generateKeyPair('RS256');
  const jwk = { ...(await exportJWK(publicKey)), kid: 'k1', alg: 'RS256', use: 'sig' };
  const sign = (o: { audience?: string; expires?: string } = {}) =>
    new SignJWT({ email: 'me@example.com' })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer(`https://${TEAM}`)
      .setAudience(o.audience ?? AUD)
      .setSubject('github|1')
      .setIssuedAt()
      .setExpirationTime(o.expires ?? '1h')
      .sign(privateKey);
  const identify = accessVerifier({ teamDomain: TEAM, audience: AUD, keySet: createLocalJWKSet({ keys: [jwk] }) });
  return { sign, identify };
}

const headers = (h: Record<string, string>) => new Headers(h);

describe('accessVerifier', () => {
  it('accepts a token Cloudflare signed, from the header or the cookie', async () => {
    const cf = await fakeCloudflare();
    const token = await cf.sign();
    expect(await cf.identify(headers({ 'cf-access-jwt-assertion': token }))).toEqual({ email: 'me@example.com' });
    expect(await cf.identify(headers({ cookie: `a=b; CF_Authorization=${token}` }))).toEqual({ email: 'me@example.com' });
  });

  it('refuses no token, another app’s token, and an expired one', async () => {
    const cf = await fakeCloudflare();
    await expect(cf.identify(headers({}))).rejects.toThrow(Unauthorized);
    const other = await cf.sign({ audience: 'some-other-app' });
    await expect(cf.identify(headers({ 'cf-access-jwt-assertion': other }))).rejects.toThrow(Unauthorized);
    const old = await cf.sign({ expires: '-1m' });
    await expect(cf.identify(headers({ 'cf-access-jwt-assertion': old }))).rejects.toThrow(Unauthorized);
  });

  it('refuses to start without Access config', () => {
    expect(() => accessVerifier({})).toThrow(/ACCESS_TEAM_DOMAIN/);
    expect(() => accessVerifier({ teamDomain: TEAM })).toThrow(/ACCESS_AUD/);
  });
});
