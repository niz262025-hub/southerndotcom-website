import { createHash, randomBytes, timingSafeEqual } from 'node:crypto';
import { PKCE } from '../src/mobileAuthorization.js';
export { mobileClient, validAuthorizeRequest } from '../src/mobileAuthorization.js';
const CODE = /^[A-Za-z0-9_-]{32,256}$/;
const sha256 = (value) => createHash('sha256').update(value).digest('base64url');
export function issueAuthorizationCode() { return randomBytes(32).toString('base64url'); }
export function hashCode(code) { return sha256(code); }
export function verifyCodeChallenge(verifier, challenge) {
  if (!PKCE.test(verifier || '') || !PKCE.test(challenge || '')) return false;
  const actual = Buffer.from(sha256(verifier));
  const expected = Buffer.from(challenge);
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export function validCode(code) { return CODE.test(code || ''); }
// The production implementation MUST use a durable transactional single-use code
// store with expiry, verified browser login binding and refresh token rotation.
