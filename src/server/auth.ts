/**
 * Is this request from me?
 *
 * Cloudflare Access sits in front of the whole hostname and does the signing
 * in. Every request that reaches us should carry a JWT that Cloudflare signed;
 * we verify it anyway, so a tunnel or Access misconfiguration fails closed
 * instead of publishing the map. Ported from mindmapp's apps/server/src/auth.mjs.
 */
import { createRemoteJWKSet, jwtVerify, type JWTVerifyGetKey } from 'jose';

const HEADER = 'cf-access-jwt-assertion';
/** Access also sets this cookie; browsers send it automatically. */
const COOKIE = 'CF_Authorization';

export class Unauthorized extends Error {}

export type Identify = (headers: Headers) => Promise<{ email: string | null }>;

const readCookie = (header: string | null, name: string) =>
  (header ?? '')
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`))
    ?.slice(name.length + 1);

/**
 * `teamDomain` is the Zero Trust team hostname, `audience` the Access
 * application's AUD tag. The audience check is not optional: without it any
 * token Cloudflare ever issued for any application of this team would pass.
 */
export function accessVerifier(opts: {
  teamDomain?: string;
  audience?: string;
  devAccount?: string;
  /** Test seam; production always fetches Cloudflare's key set. */
  keySet?: JWTVerifyGetKey;
}): Identify {
  const { teamDomain, audience, devAccount, keySet } = opts;
  if (devAccount) {
    // Deliberately loud: a silent auth bypass ships to production once.
    console.warn(
      `[auth] DEV_ACCOUNT is set: no token is checked. Never run this where anyone else can reach it.`,
    );
    return async () => ({ email: `${devAccount}@localhost` });
  }
  if (!teamDomain || !audience) {
    throw new Error('ACCESS_TEAM_DOMAIN and ACCESS_AUD must be set, or DEV_ACCOUNT for local work');
  }

  // The dashboard shows the team domain as a URL; accept it either way.
  const issuer = `https://${teamDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`;
  const jwks = keySet ?? createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`));

  return async (headers) => {
    const token = headers.get(HEADER) ?? readCookie(headers.get('cookie'), COOKIE);
    if (!token) throw new Unauthorized('not signed in');
    try {
      const { payload } = await jwtVerify(token, jwks, { issuer, audience });
      return { email: typeof payload.email === 'string' ? payload.email : null };
    } catch (e) {
      // Expired, wrong audience, bad signature: all the same to the caller,
      // but the reason goes to the log so a misconfiguration is diagnosable.
      console.warn(`[auth] rejected token (issuer ${issuer}): ${(e as { code?: string }).code ?? e}`);
      throw new Unauthorized('could not verify that sign-in');
    }
  };
}
