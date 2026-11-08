import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign, verify } from 'node:crypto';

const verifyPublicKeyOnly = (key, signature, message) => verify(null, Buffer.from(message), key, Buffer.from(signature, 'base64url'));
import {
  canonicalJson, canonicalRequest, createAppAccess, hashTicket, loadCurrentEntitlements, verifyAppSignature,
} from '../server/app-access.js';

const NOW = 1_900_000_000_000;
const appId = 'opsp';
const userId = '2bc79d9a-e917-4bab-bf29-b318a4f5542c';
const loginSessionId = '7c1f0a52-3b6e-4d58-9a41-0e2d5b8c9f13';
const sessionId = '3bc79d9a-e917-4bab-bf29-b318a4f5542c';
const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const publicPem = publicKey.export({ type: 'spki', format: 'pem' });
const baseEnv = {
  VERCEL_ENV: 'preview',
  MYOPS_ENVIRONMENT: 'staging',
  VERCEL_BRANCH_URL: 'myops-preview.vercel.app',
  VITE_SUPABASE_URL: 'https://uhuukcztdifvpjuopdea.supabase.co',
  MYOPS_SERVICE_ROLE_KEY: 'sb_secret_fixture',
  MYOPS_APP_USER_REF_SECRET: 'u'.repeat(40),
  MYOPS_APP_URL_OPSP: 'https://opsp.example.test/',
};

function make({ entitlement = 'active', nonceAccepted = true, redeemStatus = 'redeemed',
  sessionActive = true, service = true, rate = true, env = baseEnv, product = 'opsp' } = {}) {
  const calls = [];
  const clientData = {
    app_id: appId, product_slug: product, enabled: true,
    public_key_current: publicPem, public_key_next: null,
  };
  const admin = { rpc: async (name, args) => {
    calls.push([name, args]);
    if (name === 'myops_check_app_rate_limit') return { data: rate, error: null };
    if (name === 'myops_get_app_client') return { data: clientData, error: null };
    if (name === 'myops_record_app_nonce') return { data: nonceAccepted, error: null };
    if (name === 'myops_issue_app_ticket') return { data: { status: 'issued' }, error: null };
    if (name === 'myops_redeem_app_ticket') return { data: {
      status: redeemStatus, user_id: userId, session_id: sessionId, product_slug: product,
    }, error: null };
    if (name === 'myops_validate_app_session') return { data: sessionActive
      ? { active: true, user_id: userId } : { active: false }, error: null };
    return { data: true, error: null };
  } };
  const serviceFactory = () => service ? admin : null;
  const handler = createAppAccess({
    env, adminFactory: serviceFactory, now: () => NOW,
    entitlementResolver: async () => entitlement === 'error' ? null : { [product]: entitlement },
  });
  return { handler, calls, admin, clientData };
}

function signedRequest({ path, body, timestamp = String(NOW), nonce = 'nonce-value-1234567890',
  signatureKey = privateKey, headers = {} } = {}) {
  const message = canonicalRequest('POST', path, appId, 'current', timestamp, nonce, body);
  const signature = sign(null, Buffer.from(message), signatureKey).toString('base64url');
  return {
    method: 'POST',
    headers: {
      host: 'myops-preview.vercel.app',
      'content-type': 'application/json',
      'x-myops-app-id': appId,
      'x-myops-key-version': 'current',
      'x-myops-timestamp': timestamp,
      'x-myops-nonce': nonce,
      'x-myops-signature': signature,
      ...headers,
    },
    body,
  };
}

async function call(handler, req) {
  const responseHeaders = {};
  const res = {
    setHeader(name, value) { responseHeaders[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(body) { this.body = body; return this; },
  };
  await handler(req, res);
  return { ...res, headers: responseHeaders };
}

test('app requests use Ed25519 signatures and the canonical request binds method, path, nonce and body', () => {
  const body = { ticket: 'x'.repeat(43) };
  const message = canonicalRequest('POST', '/api/app/redeem', appId, 'current', String(NOW), 'nonce-value-1234567890', body);
  const signature = sign(null, Buffer.from(message), privateKey).toString('base64url');
  assert.equal(verifyAppSignature(publicPem, signature, message), true);
  assert.equal(verifyAppSignature(publicPem, signature, `${message}x`), false);
  assert.equal(verifyAppSignature('not a key', signature, message), false);
});

test('launch ticket is 256-bit, delivered only in the registered app URL, while only its SHA-256 hash is stored', async () => {
  const { handler, calls } = make();
  const result = await handler.issueTicket({ userId, product: 'opsp', loginSessionId });
  assert.equal(result.status, 200);
  const url = new URL(result.next);
  assert.equal(url.origin, 'https://opsp.example.test');
  assert.equal(url.pathname, '/launch');
  assert.equal(url.search, '');
  const rawTicket = new URLSearchParams(url.hash.slice(1)).get('t');
  assert.equal(rawTicket.length, 43);
  const issueCall = calls.find(([name]) => name === 'myops_issue_app_ticket');
  assert.equal(issueCall[1].p_ticket_hash, hashTicket(rawTicket));
  assert.equal(issueCall[1].p_login_session_id, loginSessionId);
  assert.notEqual(issueCall[1].p_ticket_hash, rawTicket);

  let storedHash;
  const issued = createAppAccess({
    env: baseEnv,
    adminFactory: () => ({ rpc: async (name, args) => {
      if (name === 'myops_check_app_rate_limit') return { data: true, error: null };
      if (name === 'myops_issue_app_ticket') { storedHash = args.p_ticket_hash; return { data: { status: 'issued' }, error: null }; }
      return { data: null, error: null };
    } }),
    now: () => NOW,
  });
  const launch = await issued.issueTicket({ userId, product: 'opsp', loginSessionId });
  const secondRawTicket = new URLSearchParams(new URL(launch.next).hash.slice(1)).get('t');
  assert.equal(secondRawTicket.length, 43);
  assert.equal(storedHash, hashTicket(secondRawTicket));
  assert.notEqual(storedHash, secondRawTicket);
});

test('redemption revalidates entitlement and returns only an app-scoped opaque user reference', async () => {
  const { handler } = make();
  const body = { ticket: Buffer.alloc(32, 9).toString('base64url') };
  const req = signedRequest({ path: '/api/app/redeem', body });
  const result = await call(handler.redeem, req);
  assert.equal(result.statusCode, 200);
  assert.deepEqual(Object.keys(result.body).sort(), ['idle_seconds', 'max_session_seconds', 'product', 'session_id', 'user_ref']);
  assert.notEqual(result.body.user_ref, userId);
  assert.equal(result.body.idle_seconds, 900);
  assert.equal(result.body.product, 'opsp');
});

test('invalid signatures, browser origins, stale timestamps, replayed nonces and rate limits fail closed', async () => {
  const body = { ticket: Buffer.alloc(32, 9).toString('base64url') };
  for (const { handler, request, status } of [
    { handler: make().handler, request: signedRequest({ path: '/api/app/redeem', body, signatureKey: generateKeyPairSync('ed25519').privateKey }), status: 401 },
    { handler: make().handler, request: signedRequest({ path: '/api/app/redeem', body, headers: { origin: 'https://evil.example' } }), status: 403 },
    { handler: make().handler, request: signedRequest({ path: '/api/app/redeem', body, timestamp: String(NOW - 6 * 60 * 1000) }), status: 401 },
    { handler: make({ nonceAccepted: false }).handler, request: signedRequest({ path: '/api/app/redeem', body }), status: 401 },
    { handler: make({ rate: false }).handler, request: signedRequest({ path: '/api/app/redeem', body }), status: 429 },
  ]) {
    const response = await call(handler.redeem, request);
    assert.equal(response.statusCode, status);
  }
});

test('wrong-app ticket, revoked entitlement and database failures never grant an app session', async () => {
  const body = { ticket: Buffer.alloc(32, 9).toString('base64url') };
  const wrongApp = make({ redeemStatus: 'denied' });
  assert.equal((await call(wrongApp.handler.redeem, signedRequest({ path: '/api/app/redeem', body }))).statusCode, 401);
  const revoked = make({ entitlement: 'none' });
  const denied = await call(revoked.handler.redeem, signedRequest({ path: '/api/app/redeem', body }));
  assert.equal(denied.statusCode, 403);
  assert.ok(revoked.calls.some(([name]) => name === 'myops_revoke_app_session'));
  const unavailable = make({ entitlement: 'error' });
  assert.equal((await call(unavailable.handler.redeem, signedRequest({ path: '/api/app/redeem', body }))).statusCode, 503);
  assert.ok(unavailable.calls.some(([name]) => name === 'myops_revoke_app_session'), 'unverified new session is closed');
});

test('entitlement verification is fresh and revoked or idle sessions are denied', async () => {
  const body = { session_id: sessionId, product: 'opsp', sensitive: true, activity: true };
  const active = make();
  const accepted = await call(active.handler.entitlement,
    signedRequest({ path: '/api/app/entitlement', body, nonce: 'nonce-second-1234567890' }));
  assert.equal(accepted.statusCode, 200);
  assert.deepEqual(accepted.body, { entitled: true, session_active: true, access_mode: 'paid', checked_at: new Date(NOW).toISOString() });
  assert.ok(active.calls.some(([name]) => name === 'myops_validate_app_session'));

  const idle = make({ sessionActive: false });
  const expired = await call(idle.handler.entitlement,
    signedRequest({ path: '/api/app/entitlement', body, nonce: 'nonce-third-1234567890' }));
  assert.equal(expired.statusCode, 403);
  assert.equal(expired.body.session_active, false);
});

test('current subscription expiry, revocation and Founder lifetime use the central resolver', async () => {
  const now = NOW;
  const tables = {
    myops_products: [
      { slug: 'opsp', launch_status: 'live' },
      { slug: 'opsfinance', launch_status: 'live' },
      { slug: 'opsfuture', launch_status: 'live' },
    ],
    myops_subscriptions: [
      { personal_user_id: userId, organization_id: null, product_slug: 'opsp', is_complete_bundle: false, status: 'active', current_period_end: null },
      { personal_user_id: userId, organization_id: null, product_slug: 'opsfinance', is_complete_bundle: false, status: 'active', current_period_end: new Date(now - 1).toISOString() },
    ],
    myops_memberships: [],
    myops_app_grants: [],
    myops_lifetime_entitlements: [{ user_id: userId, scope: 'all_apps', status: 'revoked' }],
  };
  const client = { from(table) {
    const filters = [];
    const query = {
      select() { return query; },
      eq(key, value) { filters.push((row) => row[key] === value); return query; },
      in(key, values) { filters.push((row) => values.includes(row[key])); return query; },
      then(resolve) { return resolve({ data: (tables[table] || []).filter((row) => filters.every((filter) => filter(row))), error: null }); },
    };
    return query;
  } };
  const denied = await loadCurrentEntitlements(client, userId, now);
  assert.equal(denied.opsp, 'active');
  assert.equal(denied.opsfinance, 'none');
  assert.equal(denied.opsfuture, 'none');
  tables.myops_lifetime_entitlements = [{ user_id: userId, scope: 'all_apps', status: 'active' }];
  const lifetime = await loadCurrentEntitlements(client, userId, now);
  assert.deepEqual(lifetime, { opsp: 'active', opsfinance: 'active', opsfuture: 'active', opsflow: 'coming_soon', opswms: 'coming_soon', opshr: 'coming_soon' });
});

test('requests require Preview configuration and do not use a service role in the browser', async () => {
  const body = { ticket: Buffer.alloc(32, 9).toString('base64url') };
  const req = signedRequest({ path: '/api/app/redeem', body });
  assert.equal((await call(make({ service: false }).handler.redeem, req)).statusCode, 503);
  const production = createAppAccess({ env: { ...baseEnv, VERCEL_ENV: 'production' } });
  assert.equal((await call(production.redeem, req)).statusCode, 404);
});

test('production app access needs explicit opt-in and accepts only the official MYOPS host', async () => {
  const body = { ticket: Buffer.alloc(32, 9).toString('base64url') };
  const productionEnv = {
    ...baseEnv,
    VERCEL_ENV: 'production',
    MYOPS_ENVIRONMENT: 'production',
    MYOPS_ENABLE_PRODUCTION_APP_ACCESS: 'true',
  };
  const disabled = createAppAccess({ env: { ...productionEnv, MYOPS_ENABLE_PRODUCTION_APP_ACCESS: 'false' } });
  assert.equal((await call(disabled.redeem, signedRequest({ path: '/api/app/redeem', body,
    headers: { host: 'www.myops.com.my' } }))).statusCode, 404);

  const { handler } = make({ env: productionEnv });
  const accepted = await call(handler.redeem, signedRequest({ path: '/api/app/redeem', body,
    headers: { host: 'www.myops.com.my' } }));
  assert.equal(accepted.statusCode, 200);
  for (const host of ['myops.com.my', 'attacker.example', 'myops-preview.vercel.app']) {
    const rejected = await call(handler.redeem, signedRequest({ path: '/api/app/redeem', body, headers: { host } }));
    assert.equal(rejected.statusCode, 403, host);
  }
});

test('regression S1-B review: only Ed25519 public keys are accepted', () => {
  const message = 'signed message';
  // A 512-bit RSA key produces a 64-byte signature that matches the Ed25519 signature format.
  const rsa = generateKeyPairSync('rsa', { modulusLength: 512 });
  const rsaPem = rsa.publicKey.export({ type: 'spki', format: 'pem' });
  const rsaSignature = sign(null, Buffer.from(message), rsa.privateKey).toString('base64url');
  assert.equal(rsaSignature.length, 86);
  assert.equal(verifyPublicKeyOnly(rsa.publicKey, rsaSignature, message), true, 'precondition: RSA passes a bare verify');
  assert.equal(verifyAppSignature(rsaPem, rsaSignature, message), false);
  const good = sign(null, Buffer.from(message), privateKey).toString('base64url');
  assert.equal(verifyAppSignature(publicPem, good, message), true);
});

test('regression S1-B review: nested, extra or reordered body fields cannot bypass the signature', async () => {
  assert.notEqual(canonicalJson({ a: { x: 1 } }), canonicalJson({ a: { x: 2 } }));
  assert.equal(canonicalJson({ b: [1, { z: 1, y: 2 }], a: null }), canonicalJson({ a: null, b: [1, { y: 2, z: 1 }] }));
  assert.notEqual(canonicalRequest('POST', '/p', 'opsp', 'current', '1', 'n', {}),
    canonicalRequest('POST', '/p', 'opsp', 'next', '1', 'n', {}));
  assert.notEqual(canonicalRequest('POST', '/p', 'opsp', 'current', '1', 'n', {}),
    canonicalRequest('POST', '/p', 'opsfinance', 'current', '1', 'n', {}));
  const signedBody = { session_id: sessionId, product: 'opsp' };
  const request = signedRequest({ path: '/api/app/entitlement', body: signedBody });
  const tampered = [
    { ...signedBody, sensitive: true, activity: true },
    { ...signedBody, extra: { admin: true } },
    { ...signedBody, product: 'opsfinance' },
  ];
  for (const body of tampered) {
    const { handler } = make();
    const response = await call(handler.entitlement, { ...request, body });
    assert.equal(response.statusCode === 401 || response.statusCode === 400, true);
    assert.notEqual(response.statusCode, 200);
  }
  const wrongVersion = make();
  assert.equal((await call(wrongVersion.handler.entitlement, {
    ...request, headers: { ...request.headers, 'x-myops-key-version': 'next' } })).statusCode, 401);
});

test('regression S1-B review: polling does not extend the session; only asserted activity does', async () => {
  const poll = make();
  await call(poll.handler.entitlement, signedRequest({ path: '/api/app/entitlement',
    body: { session_id: sessionId, product: 'opsp' }, nonce: 'nonce-poll-1234567890' }));
  assert.equal(poll.calls.find(([name]) => name === 'myops_validate_app_session')[1].p_touch, false);
  const active = make();
  await call(active.handler.entitlement, signedRequest({ path: '/api/app/entitlement',
    body: { session_id: sessionId, product: 'opsp', activity: true }, nonce: 'nonce-active-1234567890' }));
  assert.equal(active.calls.find(([name]) => name === 'myops_validate_app_session')[1].p_touch, true);
  const sensitive = make();
  const rejected = await call(sensitive.handler.entitlement, signedRequest({ path: '/api/app/entitlement',
    body: { session_id: sessionId, product: 'opsp', sensitive: true }, nonce: 'nonce-sens-1234567890' }));
  assert.equal(rejected.statusCode, 400);
});

test('regression S1-B review: a transient lookup failure keeps the session and returns 503', async () => {
  const flaky = make({ entitlement: 'error' });
  const response = await call(flaky.handler.entitlement, signedRequest({ path: '/api/app/entitlement',
    body: { session_id: sessionId, product: 'opsp' }, nonce: 'nonce-flaky-1234567890' }));
  assert.equal(response.statusCode, 503);
  assert.equal(response.body.entitled, false);
  assert.equal(flaky.calls.some(([name]) => name === 'myops_revoke_app_session'), false);
});

test('regression S1-B review: an unconfigured preview stays disabled and revocation fails closed', async () => {
  const body = { ticket: Buffer.alloc(32, 9).toString('base64url') };
  const notStaging = createAppAccess({ env: { ...baseEnv, MYOPS_ENVIRONMENT: undefined }, adminFactory: () => ({}), now: () => NOW });
  assert.equal((await call(notStaging.redeem, signedRequest({ path: '/api/app/redeem', body }))).statusCode, 404);
  assert.equal(await notStaging.revokeUserSessions(userId), false);
  const noService = createAppAccess({ env: baseEnv, adminFactory: () => null, now: () => NOW });
  await assert.rejects(noService.revokeUserSessions(userId));
  const dbDown = createAppAccess({ env: baseEnv, now: () => NOW,
    adminFactory: () => ({ rpc: async () => ({ data: null, error: { code: 'x' } }) }) });
  await assert.rejects(dbDown.revokeUserSessions(userId));
  await assert.rejects(dbDown.revokeUserSessions('not-a-uuid'));
});

test('login-session binding: ticket issuance requires a login id; start/touch/end map to server-side RPCs and fail safely', async () => {
  const { handler } = make();
  assert.equal(await handler.issueTicket({ userId, product: 'opsp' }), null, 'no login session, no ticket');
  assert.equal(await handler.issueTicket({ userId, product: 'opsp', loginSessionId: 'not-a-uuid' }), null);

  const calls = [];
  const rpcs = (answers) => createAppAccess({ env: baseEnv, now: () => NOW,
    adminFactory: () => ({ rpc: async (name, args) => { calls.push([name, args]); return answers(name); } }) });
  const ok = rpcs((name) => ({ data: name === 'myops_login_start' ? loginSessionId : name === 'myops_login_touch' ? true : true, error: null }));
  assert.equal(await ok.startLogin(userId), loginSessionId);
  assert.equal(await ok.touchLogin(userId, loginSessionId), true);
  await ok.revokeUserSessions(userId, { loginSessionId, reason: 'logout' });
  await ok.revokeUserSessions(userId, { reason: 'password_reset' });
  await ok.revokeUserSessions(userId, { loginSessionId, reason: 'anything-else' });
  assert.deepEqual(calls.map(([name]) => name), ['myops_login_start', 'myops_login_touch', 'myops_login_end', 'myops_login_end_all', 'myops_login_end']);
  assert.deepEqual(calls[2][1], { p_id: loginSessionId, p_user_id: userId, p_reason: 'logout' });
  assert.deepEqual(calls[3][1], { p_user_id: userId, p_reason: 'password_reset' });
  assert.equal(calls[4][1].p_reason, 'admin', 'unknown reasons are normalised');

  const down = rpcs(() => ({ data: null, error: { code: 'x' } }));
  assert.equal(await down.startLogin(userId), null, 'start failure yields no login id (launch fails closed)');
  assert.equal(await down.touchLogin(userId, loginSessionId), null, 'unknown liveness is not treated as revoked');
  await assert.rejects(down.revokeUserSessions(userId, { loginSessionId }), 'failed revocation is never reported as success');
  const denied = rpcs(() => ({ data: false, error: null }));
  assert.equal(await denied.touchLogin(userId, loginSessionId), false);
  const notStaging = createAppAccess({ env: { ...baseEnv, MYOPS_ENVIRONMENT: undefined }, adminFactory: () => ({}), now: () => NOW });
  assert.equal(await notStaging.startLogin(userId), null);
  assert.equal(await notStaging.touchLogin(userId, loginSessionId), null);
});

test('Finance and OpsPS staging provisioning receive only central labels behind their own readiness gates', async () => {
  for(const product of ['opsfinance','opsp']) for(const ready of [false,true]) {
    const flag=product==='opsfinance'?'MYOPS_FINANCE_PROVISIONING_READY':'MYOPS_OPSPS_PROVISIONING_READY';
    const {handler,admin}=make({product,env:{...baseEnv,[flag]:String(ready)}});
    let lookups=0;
    admin.auth={admin:{getUserById:async id=>{lookups++;return {data:{user:{id,user_metadata:{display_name:'Central owner',company_name:'Registered company',role:'admin'}}}};}}};
    const body={ticket:Buffer.alloc(32,9).toString('base64url')};
    const invalid=await call(handler.redeem,signedRequest({path:'/api/app/redeem',body,headers:{'x-myops-signature':'invalid'}}));
    assert.equal(invalid.statusCode,401);assert.equal(lookups,0);
    const result=await call(handler.redeem,signedRequest({path:'/api/app/redeem',body}));
    assert.equal(result.statusCode,200);
    assert.deepEqual(result.body.onboarding_profile,ready?{display_name:'Central owner',company_name:'Registered company'}:undefined);
  }
});

test('OpsFlow receives central labels only after signature, ticket, session and entitlement verification', async () => {
  const {handler,admin}=make({product:'opsflow'});
  let lookups=0;
  admin.auth={admin:{getUserById:async id=>{lookups++;assert.equal(id,userId);return {data:{user:{id,user_metadata:{display_name:'Central owner',company_name:'Registered company',role:'admin',company_id:'victim'}}}};}}};
  const body={ticket:Buffer.alloc(32,9).toString('base64url')};
  const invalid=await call(handler.redeem,signedRequest({path:'/api/app/redeem',body,headers:{'x-myops-signature':'invalid'}}));
  assert.equal(invalid.statusCode,401);assert.equal(lookups,0);
  const result=await call(handler.redeem,signedRequest({path:'/api/app/redeem',body}));
  assert.equal(result.statusCode,200);
  assert.deepEqual(result.body.onboarding_profile,{display_name:'Central owner',company_name:'Registered company'});
  const passive=await call(handler.entitlement,signedRequest({path:'/api/app/entitlement',body:{session_id:sessionId,product:'opsflow',activity:false}}));
  assert.equal(passive.statusCode,200);assert.equal(passive.body.onboarding_profile,undefined);assert.equal(lookups,1);
  const retry=await call(handler.entitlement,signedRequest({path:'/api/app/entitlement',body:{session_id:sessionId,product:'opsflow',activity:true,sensitive:true}}));
  assert.equal(retry.statusCode,200);assert.deepEqual(retry.body.onboarding_profile,result.body.onboarding_profile);
});
test('durable login liveness is a read-only, user-bound lookup and fails closed on outage', async () => {
  for (const expected of [true, false, null]) {
    const calls = [];
    const handler = createAppAccess({ env: baseEnv, now: () => NOW, adminFactory: () => ({ rpc: async (name, args) => {
      calls.push([name, args]); return expected === null ? { error: { code: 'outage' } } : { data: expected, error: null };
    } }) });
    assert.equal(await handler.loginLive(userId, loginSessionId), expected);
    assert.deepEqual(calls, [['myops_login_live', { p_id: loginSessionId, p_user_id: userId }]]);
  }
});

test('central profile is released only on signed, active entitled sessions and never trusts body identity', async () => {
 const f = make();
 let reads=0;
 f.admin.auth={admin:{getUserById:async id=>{reads++;assert.equal(id,userId);return {data:{user:{id,user_metadata:{display_name:'Owner',account_type:'personal',contact_number:'+60123456789',role:'admin',organization_id:'victim'},updated_at:'2026-11-07T00:00:00Z'}}};}}};
 const body={session_id:sessionId,product:'opsp',profile:true};
 const result=await call(f.handler.entitlement,signedRequest({path:'/api/app/entitlement',body}));
 assert.equal(result.statusCode,200);assert.equal(reads,1);
 assert.deepEqual(result.body.central_profile,{display_name:'Owner',account_type:'personal',contact_number:'+60123456789',logo_url:null,updated_at:'2026-11-07T00:00:00Z'});
 const denied=make({entitlement:'none'});denied.admin.auth={admin:{getUserById:()=>assert.fail('denied session cannot load a profile')}};
 assert.equal((await call(denied.handler.entitlement,signedRequest({path:'/api/app/entitlement',body}))).statusCode,403);
 assert.equal((await call(f.handler.entitlement,signedRequest({path:'/api/app/entitlement',body:{...body,user_id:'victim'}}))).statusCode,400);
 const tampered=signedRequest({path:'/api/app/entitlement',body:{...body,profile:false}});tampered.body.profile=true;
 assert.equal((await call(f.handler.entitlement,tampered)).statusCode,401);
 });

const quotaEnv={...baseEnv,MYOPS_USE_ISOLATED_STAGING:'true',VITE_SUPABASE_URL:'https://wengxxiqwtosirealghx.supabase.co',MYOPS_ENABLE_STAGING_TRIAL_ACCESS:'true',MYOPS_TRIAL_READY_APPS:'opsp',MYOPS_OPSPS_TRIAL_UAT_READY:'true'};
test('trial quota requires a signed matching app/session and never touches activity',async()=>{
 const {handler,admin,calls}=make({env:quotaEnv});
 admin.from=table=>{assert.equal(table,'myops_app_sessions');const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{user_id:userId,login_session_id:loginSessionId},error:null})};return q;};
 const original=admin.rpc;admin.rpc=async(name,args)=>name==='myops_consume_trial_quota'?{data:{allowed:true,used:1,limit:2,replayed:false}}:original(name,args);
 const body={session_id:sessionId,product:'opsp',feature:'projects',operation_id:loginSessionId};
 const result=await call(handler.trialQuota,signedRequest({path:'/api/app/trial-quota',body}));
 assert.equal(result.statusCode,200);assert.equal(result.body.allowed,true);
 assert.equal(calls.find(c=>c[0]==='myops_validate_app_session')[1].p_touch,false);
 const wrong=await call(handler.trialQuota,signedRequest({path:'/api/app/entitlement',body}));assert.equal(wrong.statusCode,401);
 const extra=await call(handler.trialQuota,signedRequest({path:'/api/app/trial-quota',body:{...body,user_id:userId}}));assert.equal(extra.statusCode,400);
});
test('trial quota endpoint is unavailable in production and rejects expired sessions',async()=>{
 const body={session_id:sessionId,product:'opsp',feature:'projects',operation_id:loginSessionId};
 const denied=await call(make({sessionActive:false,env:quotaEnv}).handler.trialQuota,signedRequest({path:'/api/app/trial-quota',body}));assert.equal(denied.statusCode,403);
 const prod=await call(make({env:{...baseEnv,VERCEL_ENV:'production'}}).handler.trialQuota,{headers:{},body});assert.equal(prod.statusCode,404);
});

 test('central entitlement explicitly identifies existing paid access without granting trial',async()=>{
 const {handler}=make();
 const result=await call(handler.entitlement,signedRequest({path:'/api/app/entitlement',body:{session_id:sessionId,product:'opsp'}}));
 assert.equal(result.statusCode,200);assert.equal(result.body.access_mode,'paid');
 const denied=await call(make({entitlement:'none'}).handler.entitlement,signedRequest({path:'/api/app/entitlement',body:{session_id:sessionId,product:'opsp'}}));
 assert.equal(denied.statusCode,403);assert.equal(denied.body.access_mode,undefined);
 });
test('signed entitlement returns server-owned trial metadata and keeps paid mode distinct',async()=>{
 const {admin}=make({product:'opsflow'});
 const trial={id:loginSessionId,user_id:userId,organization_id:null,policy_version:1,status:'active',started_at:new Date(NOW-1000).toISOString(),expires_at:new Date(NOW-1000+604800000).toISOString()};
 admin.from=()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:trial,error:null})};return q;};
 const env={...baseEnv,MYOPS_USE_ISOLATED_STAGING:'true',VITE_SUPABASE_URL:'https://wengxxiqwtosirealghx.supabase.co',MYOPS_ENABLE_STAGING_TRIAL_ACCESS:'true',MYOPS_TRIAL_READY_APPS:'opsflow'};
 const handler=createAppAccess({env,adminFactory:()=>admin,now:()=>NOW,entitlementResolver:async(c,u,n,e)=>({opsflow:e.MYOPS_ENABLE_STAGING_TRIAL_ACCESS==='true'?'active':'none'})});
 const body={session_id:sessionId,product:'opsflow'};
 const result=await call(handler.entitlement,signedRequest({path:'/api/app/entitlement',body}));
 assert.equal(result.statusCode,200);assert.equal(result.body.access_mode,'trial');
 assert.deepEqual(result.body.trial,{id:loginSessionId,expires_at:trial.expires_at,policy_version:1});
 assert.equal(JSON.stringify(result.body).includes(userId),false);
});


function snapshotFixture() {
  const { admin, calls } = make({ product: 'opsflow' });
  const reads = [];
  const trial = { id: loginSessionId, user_id: userId, organization_id: null,
    policy_version: 1, status: 'active', started_at: new Date(NOW - 1000).toISOString(),
    expires_at: new Date(NOW + 604799000).toISOString() };
  const tables = {
    myops_products: [{ slug: 'opsflow', launch_status: 'live' }, { slug: 'opswms', launch_status: 'coming_soon' }],
    myops_subscriptions: [], myops_memberships: [], myops_app_grants: [],
    myops_lifetime_entitlements: [], myops_trials: [trial],
  };
  const state = { errorTable: null };
  admin.from = (table) => {
    const filters = [];
    const result = () => {
      reads.push(table);
      return { data: (tables[table] || []).filter(row => filters.every(filter => filter(row))),
        error: state.errorTable === table ? { message: 'fixture failure' } : null };
    };
    const query = {
      select() { return query; },
      eq(key, value) { filters.push(row => row[key] === value); return query; },
      in(key, values) { filters.push(row => values.includes(row[key])); return query; },
      maybeSingle() { const response = result(); return Promise.resolve({ ...response, data: response.data[0] || null }); },
      then(resolve, reject) { return Promise.resolve(result()).then(resolve, reject); },
    };
    return query;
  };
  const env = { ...baseEnv, MYOPS_USE_ISOLATED_STAGING: 'true',
    VITE_SUPABASE_URL: 'https://wengxxiqwtosirealghx.supabase.co',
    MYOPS_ENABLE_STAGING_TRIAL_ACCESS: 'true', MYOPS_TRIAL_READY_APPS: 'opsflow' };
  const handler = createAppAccess({ env, adminFactory: () => admin, now: () => NOW });
  const request = () => signedRequest({ path: '/api/app/entitlement', body: { session_id: sessionId, product: 'opsflow' } });
  return { handler, request, tables, reads, calls, state, trial };
}

test('default signed entitlement reads one fresh snapshot and distinguishes trial from paid access', async () => {
  const f = snapshotFixture();
  const trialResult = await call(f.handler.entitlement, f.request());
  assert.equal(trialResult.statusCode, 200);
  assert.equal(trialResult.body.access_mode, 'trial');
  assert.deepEqual(trialResult.body.trial, { id: f.trial.id, expires_at: f.trial.expires_at, policy_version: 1 });
  for (const table of Object.keys(f.tables)) assert.equal(f.reads.filter(name => name === table).length, 1, table);
  f.tables.myops_subscriptions.push({ personal_user_id: userId, product_slug: 'opsflow', status: 'active', current_period_end: null });
  const paidResult = await call(f.handler.entitlement, f.request());
  assert.equal(paidResult.statusCode, 200);
  assert.equal(paidResult.body.access_mode, 'paid');
  assert.equal(paidResult.body.trial, undefined);
  for (const table of Object.keys(f.tables)) assert.equal(f.reads.filter(name => name === table).length, 2, table);
  f.tables.myops_subscriptions = [];
  f.trial.status = 'expired';
  const expiredResult = await call(f.handler.entitlement, f.request());
  assert.equal(expiredResult.statusCode, 403);
  assert.ok(f.calls.some(([name]) => name === 'myops_revoke_app_session'));
});

test('snapshot lookup failures fail closed without revoking a valid session', async () => {
  for (const table of ['myops_subscriptions', 'myops_trials']) {
    const f = snapshotFixture();
    f.state.errorTable = table;
    const result = await call(f.handler.entitlement, f.request());
    assert.equal(result.statusCode, 503, table);
    assert.equal(result.body.entitled, table === 'myops_trials' ? undefined : false);
    assert.equal(f.calls.some(([name]) => name === 'myops_revoke_app_session'), false);
  }
});

test('snapshot retains company trial isolation and never grants Coming Soon applications', async () => {
  const f = snapshotFixture();
  f.trial.organization_id = loginSessionId;
  f.tables.myops_organizations = [{ id: loginSessionId, owner_user_id: userId }];
  f.tables.myops_memberships = [{ organization_id: loginSessionId, user_id: userId, role: 'admin', status: 'active' },
    { organization_id: loginSessionId, user_id: sessionId, role: 'member', status: 'active' }];
  assert.equal((await call(f.handler.entitlement, f.request())).statusCode, 403);
  f.trial.organization_id = null;
  f.tables.myops_products[0].launch_status = 'coming_soon';
  assert.equal((await call(f.handler.entitlement, f.request())).statusCode, 403);
});

test('production quota requires explicit release gates and verified signed identity',async()=>{
 const env={...baseEnv,VERCEL_ENV:'production',MYOPS_ENVIRONMENT:'production',MYOPS_ENABLE_PRODUCTION_APP_ACCESS:'true',MYOPS_ENABLE_PRODUCTION_TRIAL_ACCESS:'true',MYOPS_TRIAL_READY_APPS:'opsfinance,opsflow,opsp,opshr',MYOPS_FINANCE_TRIAL_UAT_READY:'true',MYOPS_OPSFLOW_TRIAL_UAT_READY:'true',MYOPS_OPSPS_TRIAL_UAT_READY:'true',MYOPS_OPSHR_TRIAL_UAT_READY:'true'};
 const {handler,admin,calls}=make({env});
 admin.from=()=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:{user_id:userId,login_session_id:loginSessionId},error:null})};return q;};
 const original=admin.rpc;admin.rpc=async(name,args)=>name==='myops_consume_trial_quota'?{data:{allowed:true,used:30,limit:30,replayed:false}}:original(name,args);
 const body={session_id:sessionId,product:'opsp',feature:'transactions',operation_id:loginSessionId};
 assert.equal((await call(handler.trialQuota,signedRequest({path:'/api/app/trial-quota',body,headers:{host:'www.myops.com.my'}}))).statusCode,200);
 assert.equal(calls.find(c=>c[0]==='myops_validate_app_session')[1].p_touch,false);
 assert.equal((await call(make({env:{...env,MYOPS_OPSPS_TRIAL_UAT_READY:'false'}}).handler.trialQuota,{headers:{},body})).statusCode,404);
});
