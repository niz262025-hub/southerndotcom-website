import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
const REDIRECT = 'myops://auth/callback';
const CLIENT = 'myopsmobile';
const PKCE = /^[A-Za-z0-9_-]{43,128}$/;
const CODE = /^[A-Za-z0-9_-]{32,256}$/;
const sha256 = (value) => createHash('sha256').update(value).digest('base64url');
export function validAuthorizeRequest(params) {
  return params?.client_id === CLIENT && params?.redirect_uri === REDIRECT &&
    params?.response_type === 'code' && params?.code_challenge_method === 'S256' &&
    PKCE.test(params?.code_challenge || '') && PKCE.test(params?.state || '');
}
export function issueAuthorizationCode() { return randomBytes(32).toString('base64url'); }
export function hashCode(code) { return sha256(code); }
export function verifyCodeChallenge(verifier, challenge) {
  if (!PKCE.test(verifier || '') || !PKCE.test(challenge || '')) return false;
  const actual = Buffer.from(sha256(verifier));
  const expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function validCode(code) { return CODE.test(code || ''); }
export const mobileClient = Object.freeze({ id: CLIENT, redirect: REDIRECT });
// The production implementation MUST use a durable transactional single-use code
// store with expiry, verified browser login binding and refresh token rotation.
