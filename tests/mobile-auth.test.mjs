import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';

import { createMobileAuthHandler } from '../server/mobile-auth.js';
import { createMemoryMobileAuthStore } from '../server/mobile-auth-store.js';
import { verifyPkceS256 } from '../server/mobile-auth-crypto.js';

const env = {
  MYOPS_ENABLE_MOBILE_AUTH: 'true',
  VITE_SUPABASE_URL: 'https://project.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_key',
};

function makeResponse() {
  const headers = {};
  return {
    headers,
    code: 200,
    setHeader(name, value) {
      headers[name] = value;
    },
    status(code) {
      this.code = code;
      return this;
    },
    json(body) {
      this.body = body;
      return this;
    },
  };
}

const VALID_CHALLENGE = createHash('sha256').update('test-code-verifier-1234567890abc').digest('base64url');

function handle(route, body, opts = {}) {
  const store = opts.store || createMemoryMobileAuthStore();
  const user = opts.user ?? { id: '11111111-1111-4111-9111-111111111111', email: 'mobile@example.test', email_confirmed_at: '2026-01-01T00:00:00Z' };
  const handler = createMobileAuthHandler({
    env: { ...env, ...opts.env },
    route,
    store,
    userResolver: opts.userResolver ?? (async () => ({ ok: true, user })),
    clock: () => opts.now ?? Date.now(),
  });
  const res = makeResponse();
  const req = {
    method: opts.method || 'POST',
    headers: {
      'content-type': 'application/json',
      cookie: opts.cookie || '__Host-myops-access=test-token',
      ...(opts.headers || {}),
    },
    body: typeof body === 'string' ? body : JSON.stringify(body ?? {}),
  };
  return handler(req, res).then(() => ({ code: res.code, body: res.body, headers: res.headers }));
}

test('mobile auth is disabled by default', async () => {
  const req = { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ client_id: 'myops-mobile', redirect_uri: 'myops://auth/callback' }) };
  const res = makeResponse();
  await createMobileAuthHandler({ route: 'authorize', env: {} })(req, res);
  assert.equal(res.code, 404);
  assert.equal(res.body.error, 'Mobile auth is disabled.');
});

test('authorize accepts valid PKCE S256 and binds session user', async () => {
  const store = createMemoryMobileAuthStore();
  const result = await handle('authorize', {
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code_challenge: VALID_CHALLENGE,
    code_challenge_method: 'S256',
    state: 'state-1234567890abc',
    nonce: 'nonce-1234567890abc',
  }, { store });

  assert.equal(result.code, 200);
  assert.ok(result.body.code);
  assert.equal(result.body.state, 'state-1234567890abc');
  assert.equal(result.body.expires_in, 60);
  assert.equal(result.headers['Cache-Control'], 'private, no-store');
  assert.ok(verifyPkceS256('test-code-verifier-1234567890abc', VALID_CHALLENGE));
});

test('authorize rejects invalid client, redirect, PKCE, state and nonce', async () => {
  const tests = [
    { body: { client_id: 'bogus', redirect_uri: 'myops://auth/callback', code_challenge: VALID_CHALLENGE, code_challenge_method: 'S256', state: 'state-1234567890abc', nonce: 'nonce-1234567890abc' }, code: 400 },
    { body: { client_id: 'myops-mobile', redirect_uri: 'https://evil.example', code_challenge: VALID_CHALLENGE, code_challenge_method: 'S256', state: 'state-1234567890abc', nonce: 'nonce-1234567890abc' }, code: 400 },
    { body: { client_id: 'myops-mobile', redirect_uri: 'myops://auth/callback', code_challenge: 'abc', code_challenge_method: 'S256', state: 'state-1234567890abc', nonce: 'nonce-1234567890abc' }, code: 400 },
    { body: { client_id: 'myops-mobile', redirect_uri: 'myops://auth/callback', code_challenge: VALID_CHALLENGE, code_challenge_method: 'plain', state: 'state-1234567890abc', nonce: 'nonce-1234567890abc' }, code: 400 },
    { body: { client_id: 'myops-mobile', redirect_uri: 'myops://auth/callback', code_challenge: VALID_CHALLENGE, code_challenge_method: 'S256', state: 'bad', nonce: 'nonce-1234567890abc' }, code: 400 },
    { body: { client_id: 'myops-mobile', redirect_uri: 'myops://auth/callback', code_challenge: VALID_CHALLENGE, code_challenge_method: 'S256', state: 'state-1234567890abc', nonce: 'bad' }, code: 400 },
  ];
  for (const item of tests) {
    const result = await handle('authorize', item.body);
    assert.equal(result.code, item.code);
  }
});

test('authorize rejects unauthenticated and unverified users', async () => {
  const unauth = await handle('authorize', {
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code_challenge: VALID_CHALLENGE,
    code_challenge_method: 'S256',
    state: 'state-1234567890abc',
    nonce: 'nonce-1234567890abc',
  }, { user: null, userResolver: async () => ({ ok: false, reason: 'invalid_session' }) });
  assert.equal(unauth.code, 401);

  const unverified = await handle('authorize', {
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code_challenge: VALID_CHALLENGE,
    code_challenge_method: 'S256',
    state: 'state-1234567890abc',
    nonce: 'nonce-1234567890abc',
  }, { user: { id: '11111111-1111-4111-9111-111111111111', email: 'mobile@example.test', email_confirmed_at: null } });
  assert.equal(unverified.code, 403);
});

test('token exchange succeeds with PKCE and rejects replay and verifier mismatch', async () => {
  const store = createMemoryMobileAuthStore();
  const codeVerifier = 'test-code-verifier-1234567890abc';
  const authorize = await handle('authorize', {
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code_challenge: VALID_CHALLENGE,
    code_challenge_method: 'S256',
    state: 'state-1234567890abc',
    nonce: 'nonce-1234567890abc',
  }, { store });

  const exact = await handle('token', {
    grant_type: 'authorization_code',
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code: authorize.body.code,
    code_verifier: codeVerifier,
  }, { store });
  assert.equal(exact.code, 200);
  assert.equal(exact.body.token_type, 'Bearer');
  assert.ok(exact.body.access_token);
  assert.ok(exact.body.refresh_token);
  assert.equal(exact.body.expires_in, 900);

  const replay = await handle('token', {
    grant_type: 'authorization_code',
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code: authorize.body.code,
    code_verifier: codeVerifier,
  }, { store });
  assert.equal(replay.code, 400);

  const badVerifier = await handle('token', {
    grant_type: 'authorization_code',
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code: authorize.body.code,
    code_verifier: 'wrong-verifier',
  }, { store });
  assert.equal(badVerifier.code, 400);
});

test('refresh rotation succeeds and old refresh token is rejected', async () => {
  const store = createMemoryMobileAuthStore();
  const codeVerifier = 'test-code-verifier-1234567890abc';
  const authorize = await handle('authorize', {
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code_challenge: VALID_CHALLENGE,
    code_challenge_method: 'S256',
    state: 'state-1234567890abc',
    nonce: 'nonce-1234567890abc',
  }, { store });
  const token = await handle('token', {
    grant_type: 'authorization_code',
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code: authorize.body.code,
    code_verifier: codeVerifier,
  }, { store });

  const ref = await handle('refresh', {
    client_id: 'myops-mobile',
    refresh_token: token.body.refresh_token,
  }, { store });
  assert.equal(ref.code, 200);
  assert.ok(ref.body.refresh_token !== token.body.refresh_token);

  const replay = await handle('refresh', {
    client_id: 'myops-mobile',
    refresh_token: token.body.refresh_token,
  }, { store });
  assert.equal(replay.code, 401);
});

test('me endpoint validates access tokens and rejects invalid authorization header', async () => {
  const store = createMemoryMobileAuthStore();
  const codeVerifier = 'test-code-verifier-1234567890abc';
  const auth = await handle('authorize', {
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code_challenge: VALID_CHALLENGE,
    code_challenge_method: 'S256',
    state: 'state-1234567890abc',
    nonce: 'nonce-1234567890abc',
  }, { store });
  const token = await handle('token', {
    grant_type: 'authorization_code',
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code: auth.body.code,
    code_verifier: codeVerifier,
  }, { store });

  const me = await handle('me', {}, { store, headers: { authorization: `Bearer ${token.body.access_token}` } });
  assert.equal(me.code, 200);
  assert.equal(me.body.user_id, '11111111-1111-4111-9111-111111111111');
  assert.equal(me.body.email_verified, true);

  const badHeader = await handle('me', {}, { store, headers: { authorization: 'Basic abc' } });
  assert.equal(badHeader.code, 401);
});

test('logout invalidates session and subsequent refresh and me calls fail', async () => {
  const store = createMemoryMobileAuthStore();
  const codeVerifier = 'test-code-verifier-1234567890abc';
  const auth = await handle('authorize', {
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code_challenge: VALID_CHALLENGE,
    code_challenge_method: 'S256',
    state: 'state-1234567890abc',
    nonce: 'nonce-1234567890abc',
  }, { store });
  const token = await handle('token', {
    grant_type: 'authorization_code',
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code: auth.body.code,
    code_verifier: codeVerifier,
  }, { store });

  const loggedOut = await handle('logout', {}, { store, headers: { authorization: `Bearer ${token.body.access_token}` } });
  assert.equal(loggedOut.code, 200);

  const meAfter = await handle('me', {}, { store, headers: { authorization: `Bearer ${token.body.access_token}` } });
  assert.equal(meAfter.code, 401);

  const refreshAfter = await handle('refresh', {
    client_id: 'myops-mobile',
    refresh_token: token.body.refresh_token,
  }, { store });
  assert.equal(refreshAfter.code, 401);
});

test('security controls reject non-JSON and non-POST and set no-store headers', async () => {
  const handler = createMobileAuthHandler({ env, route: 'authorize', store: createMemoryMobileAuthStore() });
  const jsonReq = { method: 'POST', headers: { 'content-type': 'text/plain' }, body: 'plain text' };
  const jsonRes = makeResponse();
  await handler(jsonReq, jsonRes);
  assert.equal(jsonRes.code, 400);

  const nonPostRes = makeResponse();
  await handler({ method: 'GET', headers: { 'content-type': 'application/json' }, body: '{}' }, nonPostRes);
  assert.equal(nonPostRes.code, 405);

  const ok = await handle('authorize', {
    client_id: 'myops-mobile',
    redirect_uri: 'myops://auth/callback',
    code_challenge: 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',
    code_challenge_method: 'S256',
    state: 'state-1234567890abc',
    nonce: 'nonce-1234567890abc',
  });
  assert.equal(ok.headers['Cache-Control'], 'private, no-store');
});
