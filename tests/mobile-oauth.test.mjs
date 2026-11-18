import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { validAuthorizeRequest, verifyCodeChallenge, issueAuthorizationCode, hashCode } from '../server/mobile-oauth.js';
const verifier = 'A'.repeat(43);
const challenge = createHash('sha256').update(verifier).digest('base64url');
test('accepts exact native client with S256', () => {
 assert.equal(validAuthorizeRequest({client_id:'myopsmobile',redirect_uri:'myops://auth/callback',response_type:'code',code_challenge_method:'S256',code_challenge:challenge,state:'B'.repeat(43)}),true);
});
test('rejects arbitrary redirect and weaker challenge method', () => {
 const base={client_id:'myopsmobile',redirect_uri:'myops://auth/callback',response_type:'code',code_challenge_method:'S256',code_challenge:challenge,state:'B'.repeat(43)};
 assert.equal(validAuthorizeRequest({...base,redirect_uri:'https://evil.example'}),false);
 assert.equal(validAuthorizeRequest({...base,code_challenge_method:'plain'}),false);
});
test('PKCE verifier matches only its challenge', () => {
 assert.equal(verifyCodeChallenge(verifier,challenge),true);
 assert.equal(verifyCodeChallenge('C'.repeat(43),challenge),false);
});
test('random codes are distinct and hashed', () => {
 const a=issueAuthorizationCode(), b=issueAuthorizationCode();
 assert.notEqual(a,b);assert.notEqual(hashCode(a),a);
});
