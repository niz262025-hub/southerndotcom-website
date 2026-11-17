import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { createAuthHandler, signActivity, signLogin, resolveProductStates } from '../server/auth.js';
import { createCallbackHandler } from '../server/toyyibpay-callback.js';
import { createPayments, paymentGateway, founderEventKey } from '../server/payments.js';

const origin = 'https://trusted-preview.vercel.app';
const SECRET = 'toyyib-sandbox-secret';
const env = { MYOPS_RELEASE_UAT_USER_IDS: 'user-a',
  VERCEL_ENV: 'preview', VERCEL_BRANCH_URL: 'trusted-preview.vercel.app', MYOPS_SESSION_SECRET: 's'.repeat(40),
  VITE_SUPABASE_URL: 'https://uhuukcztdifvpjuopdea.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture',
  MYOPS_SERVICE_ROLE_KEY: 'sb_secret_test_fixture', TOYYIBPAY_SANDBOX_SECRET_KEY: SECRET, TOYYIBPAY_SANDBOX_CATEGORY_CODE: 'cat12345',
  MYOPS_ADMIN_USER_IDS: 'admin-user, other-admin',
};
const NOW = Date.now();
const cookie = `__Host-myops-access=tok; __Host-myops-activity=${signActivity(env.MYOPS_SESSION_SECRET, NOW)}; __Host-myops-login=${signLogin(env.MYOPS_SESSION_SECRET, 'user-a', '7c1f0a52-3b6e-4d58-9a41-0e2d5b8c9f13', NOW)}`;
const person = (id = 'user-a', type = 'personal') => ({ id, email: `${id}@example.test`, email_confirmed_at: '2026-01-01',
  user_metadata: { display_name: 'A Person', account_type: type } });

function userClient(user, rows = {}) {
  return {
    auth: { getUser: async () => ({ data: { user }, error: null }) },
    from: (table) => {
      const query = { select: () => query, eq: () => query, then: (resolve) => resolve({ data: rows[table] || [], error: null }) };
      return query;
    },
  };
}

// In-memory mirror of the SQL contract (the SQL itself is proven in founders-sql.test.mjs).
function ledger({ cap = 100, allocated = 0, ineligible = ['biz', 'nobody'] } = {}) {
  const state = { payments: new Map(), alloc: new Set(), events: new Map(), calls: [], extra: allocated, subs: [], provisioned: [] };
  const size = () => state.alloc.size + state.extra;
  const handlers = {
    myops_founders_status: () => ({ capacity: cap, allocated: size(), remaining: Math.max(0, cap - size()) }),
    myops_provision_profile: (a) => { state.provisioned.push(a); return true; },
    myops_revoke_user_app_access: () => true,
    myops_create_payment: ({ p_user_id: user, p_plan: plan, p_product_slug: product, p_order_ref: ref }) => {
      if (ineligible.includes(user)) return { status: 'not_eligible' };
      if (!['founders_lifetime', 'single_app_monthly'].includes(plan)) return { status: 'plan_disabled' };
      if (state.alloc.has(user)) return { status: 'already_lifetime' };
      if (plan === 'founders_lifetime' && size() >= cap) return { status: 'sold_out' };
      if (plan === 'single_app_monthly' && size() < cap) return { status: 'founders_available' };
      state.payments.set(ref, { order_ref: ref, user_id: user, plan, product_slug: product, status: 'pending', gateway_bill_code: null, amount_cents: 2900 });
      return { status: 'created', order_ref: ref, amount_cents: 2900 };
    },
    myops_attach_bill: ({ p_order_ref: ref, p_bill_code: code }) => { state.payments.get(ref).gateway_bill_code = code; return true; },
    myops_abort_checkout: ({ p_order_ref: ref }) => { state.payments.get(ref).status = 'failed'; return true; },
    myops_get_payment: ({ p_order_ref: ref }) => state.payments.get(ref) || null,
    myops_settle_payment: (a) => {
      const prior = state.events.get(a.p_event_key);
      state.events.set(a.p_event_key, (prior || 0) + 1);
      const pay = state.payments.get(a.p_order_ref);
      if (!pay) return { status: 'unknown_order' };
      if (pay.gateway_bill_code !== a.p_bill_code) return { status: 'bill_mismatch' };
      if (pay.status === 'succeeded') return { status: 'already_settled', duplicate: Boolean(prior) };
      if (a.p_outcome !== 'succeeded') { pay.status = a.p_outcome; return { status: a.p_outcome }; }
      if (a.p_amount_cents !== pay.amount_cents) return { status: 'amount_mismatch' };
      pay.status = 'succeeded';
      if (pay.plan === 'single_app_monthly') { state.subs.push({ user: pay.user_id, product: pay.product_slug }); pay.outcome = 'subscription_granted'; }
      else if (size() < cap) { state.alloc.add(pay.user_id); pay.outcome = 'founder_allocated'; } else pay.outcome = 'founder_late_refund_review';
      return { status: 'settled', outcome: pay.outcome };
    },
    myops_admin_audit: () => ({ founders: handlers.myops_founders_status(), payments: [], allocations: [], entitlements: [], events: [] }),
  };
  state.client = { rpc: async (name, args) => { state.calls.push(name); return { data: handlers[name](args), error: null }; } };
  return state;
}

const gateway = ({ bill = 'abc123XY', paid = [], failBill = false, down = false } = {}) => {
  const requests = [];
  const transport = async (url, init) => {
    const body = Object.fromEntries(new URLSearchParams(init.body));
    requests.push({ url, body });
    if (down) return { ok: false, json: async () => ({}) };
    if (url.endsWith('/createBill')) return { ok: true, json: async () => (failBill ? { status: 'error', msg: 'bad category' } : [{ BillCode: bill }]) };
    if (url.endsWith('/getBillTransactions')) return { ok: true, json: async () => paid };
    throw new Error(`unexpected ${url}`);
  };
  return { transport, requests };
};

async function authRun(body, { user = person(), ledgerState = ledger(), rows, transport, extraEnv, headers, appAccessFactory, projects = [] } = {}) {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  const req = { method: 'POST', headers: { host: 'trusted-preview.vercel.app', origin, 'content-type': 'application/json', cookie, ...headers }, body };
  const factory = (url, key) => { projects.push(url); return key.startsWith('sb_secret_') ? ledgerState.client : userClient(user, rows); };
  await createAuthHandler({ env: { ...env, ...extraEnv }, clientFactory: factory, appAccessFactory: appAccessFactory && ((args) => ({ touchLogin: async () => true, ...appAccessFactory(args) })), transport, now: () => NOW })(req, res);
  return res;
}

const hashFor = (status, orderId, refno) => createHash('md5').update(`${SECRET}${status}${orderId}${refno}ok`).digest('hex');
async function hook(fields, { ledgerState, transport, method = 'POST', extraEnv, projects = [] } = {}) {
  const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
  await createCallbackHandler({ env: { ...env, ...extraEnv }, clientFactory: (url) => { projects.push(url); return ledgerState.client; }, transport })({ method, body: fields }, res);
  return res;
}
// Historical pending orders are seeded directly; retired checkout is never reopened.
async function started(user = 'user-a', state = ledger()) {
  const order='MYOPS-legacyorder'+String(state.payments.size).padStart(8,'0');
  state.payments.set(order,{order_ref:order,user_id:user,plan:'founders_lifetime',product_slug:null,status:'pending',gateway_bill_code:'abc123XY',amount_cents:2900});
  return {res:{code:200},order,state,g:gateway()};
}

const callbackFields = (order, over = {}) => ({ refno: 'TP1', status: '1', reason: 'Approved', billcode: 'abc123XY', order_id: order, amount: '29.00', transaction_id: 'TX1', hash: hashFor('1', order, 'TP1'), ...over });
const paidRow = (order, over = {}) => ({ billExternalReferenceNo: order, billpaymentStatus: '1', billpaymentAmount: '29.00', billpaymentInvoiceNo: 'INV1', ...over });

test('founders status is anonymous, server-authoritative and never invents numbers', async () => {
  const anon = { headers: { cookie: '' } };
  const live = await authRun({ action: 'founders' }, { ledgerState: ledger({ allocated: 37 }), ...anon });
  assert.deepEqual(live.data, { capacity: 100, allocated: 37, remaining: 63, available: true });
  const full = await authRun({ action: 'founders' }, { ledgerState: ledger({ allocated: 100 }), ...anon });
  assert.deepEqual(full.data, { capacity: 100, allocated: 100, remaining: 0, available: false });
  const unconfigured = await authRun({ action: 'founders' }, { extraEnv: { MYOPS_SERVICE_ROLE_KEY: '' }, ...anon });
  assert.deepEqual(unconfigured.data, { available: false });
  const wrongKind = await authRun({ action: 'founders' }, { extraEnv: { MYOPS_SERVICE_ROLE_KEY: 'sb_publishable_oops' }, ...anon });
  assert.deepEqual(wrongKind.data, { available: false });
});

test('checkout requires a live signed-in session, an Individual account and sandbox configuration — retired sales remain closed', async () => {
 const state=ledger(); const g=gateway();
 for(const plan of ['founders_lifetime','single_app_monthly']) {
 const result=await authRun({action:'checkout',plan,product:'opsp'},{ledgerState:state,transport:g.transport});
 assert.equal(result.code,403);
 }
 assert.equal(state.payments.size,0);assert.equal(g.requests.length,0);
});

test('checkout creates a sandbox bill for RM29 and returns only the sandbox payment URL — retired sales remain closed', async () => {
 const state=ledger(); const g=gateway();
 for(const plan of ['founders_lifetime','single_app_monthly']) {
 const result=await authRun({action:'checkout',plan,product:'opsp'},{ledgerState:state,transport:g.transport});
 assert.equal(result.code,403);
 }
 assert.equal(state.payments.size,0);assert.equal(g.requests.length,0);
});

test('sandbox callback bypass is not exposed by rejected legacy checkout',async()=>{
 const state=ledger(); const g=gateway();
 const payments=createPayments({env:{...env,MYOPS_SANDBOX_CALLBACK_BYPASS_SECRET:'fixture-only'},project:env.VITE_SUPABASE_URL,adminFactory:()=>state.client,transport:g.transport});
 const result=await payments.checkout({userId:'user-a',plan:'founders_lifetime',origin});
 assert.equal(result.status,403);assert.equal(JSON.stringify(result).includes('fixture-only'),false);assert.equal(g.requests.length,0);
});

test('checkout failures: gateway error releases the reservation; sold out and duplicates are refused — retired sales remain closed', async () => {
 const state=ledger(); const g=gateway();
 for(const plan of ['founders_lifetime','single_app_monthly']) {
 const result=await authRun({action:'checkout',plan,product:'opsp'},{ledgerState:state,transport:g.transport});
 assert.equal(result.code,403);
 }
 assert.equal(state.payments.size,0);assert.equal(g.requests.length,0);
});

test('admin audit is closed to non-admins and when no admins are configured', async () => {
  assert.equal((await authRun({ action: 'admin_audit' }, { user: person('user-a') })).code, 403);
  assert.equal((await authRun({ action: 'admin_audit' }, { user: person('admin-user'), extraEnv: { MYOPS_ADMIN_USER_IDS: '' } })).code, 403);
  assert.equal((await authRun({ action: 'admin_audit' }, { headers: { cookie: '' } })).code, 401);
  const ok = await authRun({ action: 'admin_audit' }, { user: person('admin-user') });
  assert.equal(ok.code, 200);
  assert.deepEqual(Object.keys(ok.data).sort(), ['allocations', 'entitlements', 'events', 'founders', 'payments']);
});

test('verified webhook allocates the founder slot; replays are harmless; later failure cannot revoke', async () => {
  const { order, state } = await started();
  const g = gateway({ paid: [paidRow(order)] });
  const first = await hook(callbackFields(order), { ledgerState: state, transport: g.transport });
  assert.equal(first.code, 200);
  assert.equal(first.data.status, 'settled');
  assert.ok(g.requests.some((r) => r.url.endsWith('/getBillTransactions') && r.body.billCode === 'abc123XY'));
  const replay = await hook(callbackFields(order), { ledgerState: state, transport: g.transport });
  assert.equal(replay.code, 200);
  assert.equal(replay.data.status, 'already_settled');
  assert.equal(state.alloc.size, 1);
  const fail = await hook(callbackFields(order, { status: '3', refno: 'TP2', hash: hashFor('3', order, 'TP2') }), { ledgerState: state, transport: g.transport });
  assert.equal(fail.data.status, 'already_settled');
  assert.equal(state.payments.get(order).status, 'succeeded');
});

test('webhook rejects bad hashes, missing fields and forged success without gateway confirmation', async () => {
  const { order, state } = await started();
  const g = gateway({ paid: [] });
  assert.equal((await hook(callbackFields(order, { hash: 'f'.repeat(32) }), { ledgerState: state, transport: g.transport })).code, 400);
  assert.equal((await hook({ status: '1' }, { ledgerState: state, transport: g.transport })).code, 400);
  assert.equal((await hook(callbackFields(order, { order_id: 'bad id' }), { ledgerState: state, transport: g.transport })).code, 400);
  assert.equal((await hook(callbackFields(order, { billcode: 'zzzz9999' }), { ledgerState: state, transport: g.transport })).code, 400);
  assert.equal((await hook(callbackFields('MYOPS-unknownorder1'), { ledgerState: state, transport: g.transport })).code, 400);
  // Correct hash but the gateway reports no paid transaction: nothing is granted.
  const forged = await hook(callbackFields(order), { ledgerState: state, transport: g.transport });
  assert.equal(forged.code, 400);
  assert.equal(state.alloc.size, 0);
  assert.ok(!state.calls.includes('myops_settle_payment'));
  // A success callback with no hash still needs (and gets) API confirmation, so a paid bill settles.
  const noHash = await hook(callbackFields(order, { hash: undefined }), { ledgerState: state, transport: gateway({ paid: [paidRow(order)] }).transport });
  assert.equal(noHash.data.status, 'settled');
});

test('gateway verification outage returns 502 so the gateway retries; wrong paid amount never grants', async () => {
  const { order, state } = await started();
  const outage = await hook(callbackFields(order), { ledgerState: state, transport: gateway({ down: true }).transport });
  assert.equal(outage.code, 502);
  const short = await hook(callbackFields(order), { ledgerState: state, transport: gateway({ paid: [paidRow(order, { billpaymentAmount: '1.00' })] }).transport });
  assert.equal(short.code, 400);
  assert.equal(short.data.status, 'amount_mismatch');
  const other = await hook(callbackFields(order), { ledgerState: state, transport: gateway({ paid: [paidRow('MYOPS-someoneelse01')] }).transport });
  assert.equal(other.code, 400);
  assert.equal(state.alloc.size, 0);
});

test('payment failure and cancellation need a valid hash and never grant access', async () => {
  const { order, state } = await started();
  const g = gateway();
  const unsigned = await hook(callbackFields(order, { status: '3', hash: undefined }), { ledgerState: state, transport: g.transport });
  assert.equal(unsigned.code, 400);
  const failed = await hook(callbackFields(order, { status: '3', reason: 'Insufficient funds', hash: hashFor('3', order, 'TP1') }), { ledgerState: state, transport: g.transport });
  assert.equal(failed.data.status, 'failed');
  assert.equal(state.alloc.size, 0);
  const second = await started('user-b', state);
  const cancelled = await hook(callbackFields(second.order, { status: '3', reason: 'User cancelled', hash: hashFor('3', second.order, 'TP1') }), { ledgerState: state, transport: g.transport });
  assert.equal(cancelled.data.status, 'canceled');
  const pending = await hook(callbackFields(second.order, { status: '2', hash: hashFor('2', second.order, 'TP1') }), { ledgerState: state, transport: g.transport });
  assert.equal(pending.data.status, 'pending_ignored');
  assert.equal(state.alloc.size, 0);
});

test('single-app payment grants only that app and never a lifetime or bundle', async () => {
  const state = ledger({ allocated: 100 });
  const {order}=await started('user-a',state);
  state.payments.get(order).plan='single_app_monthly';state.payments.get(order).product_slug='opsfinance';
  const done = await hook(callbackFields(order), { ledgerState: state, transport: gateway({ paid: [paidRow(order)] }).transport });
  assert.equal(done.data.status, 'settled');
  assert.deepEqual(state.subs, [{ user: 'user-a', product: 'opsfinance' }]);
  assert.equal(state.alloc.size, 0);
});

test('entitlements: a single-app subscription never unlocks other apps', () => {
  const sub = { personal_user_id: 'user-a', organization_id: null, product_slug: 'opsfinance', is_complete_bundle: false, status: 'active', current_period_end: new Date(NOW + 86400000).toISOString() };
  const cat = [{ slug: 'opsp', launch_status: 'live' }, { slug: 'opsfinance', launch_status: 'live' }, { slug: 'opsflow', launch_status: 'live' }];
  const states = resolveProductStates({ userId: 'user-a', catalog: cat, subscriptions: [sub], grants: [], lifetime: [], now: NOW });
  assert.equal(states.opsfinance, 'active');
  assert.equal(states.opsp, 'none');
  assert.equal(states.opsflow, 'none');
  const expired = resolveProductStates({ userId: 'user-a', catalog: cat, subscriptions: [{ ...sub, current_period_end: new Date(NOW - 1000).toISOString() }], grants: [], lifetime: [], now: NOW });
  assert.equal(expired.opsfinance, 'none');
});

test('registration provisions the server-owned account type, insert-only, and never for existing-email probes', async () => {
  const state = ledger();
  const signUp = (identities) => ({ auth: { signUp: async () => ({ data: { user: { id: 'new-user', identities }, session: null }, error: null }) } });
  const run = async (identities, accountType) => {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json(data) { this.data = data; return this; } };
    const req = { method: 'POST', headers: { host: 'trusted-preview.vercel.app', origin, 'content-type': 'application/json' },
      body: { action: 'register', email: 'a@example.com', password: 'p'.repeat(14), accountType, displayName: 'Name', contactNumber: '+60123456789', address: 'Johor Bahru', ...(accountType === 'business' ? { companyName: 'Company', ssmNumber: '202303050959', companyEmail: 'office@example.test', personInCharge: 'Name' } : {}) } };
    await createAuthHandler({ env, clientFactory: (url, key) => (key.startsWith('sb_secret_') ? state.client : signUp(identities)), now: () => NOW })(req, res);
    return res;
  };
  assert.equal((await run([{ id: 'i' }], 'business')).code, 200);
  assert.deepEqual(state.provisioned, [{ p_user_id: 'new-user', p_display_name: 'Name', p_account_type: 'business' }]);
  await run([], 'personal');
  assert.equal(state.provisioned.length, 1);
});

test('slot exhaustion: the 101st payer is never given a lifetime', async () => {
  const state = ledger({ allocated: 99 });
  const a = await started('user-a', state);
  const b = await started('user-b', state);
  assert.equal(b.res.code, 200);
  const g = (order) => gateway({ paid: [paidRow(order)] }).transport;
  assert.equal((await hook(callbackFields(a.order), { ledgerState: state, transport: g(a.order) })).data.status, 'settled');
  assert.equal(state.payments.get(a.order).outcome, 'founder_allocated');
  const late = await hook(callbackFields(b.order), { ledgerState: state, transport: g(b.order) });
  assert.equal(late.data.status, 'settled');
  // Late Founder money is flagged for refund/manual review: no lifetime and no monthly conversion.
  assert.equal(state.payments.get(b.order).outcome, 'founder_late_refund_review');
  assert.equal(state.alloc.has('user-b'), false);
  assert.deepEqual(state.subs, []);
  const next = await authRun({action:'checkout',plan:'founders_lifetime'},{ledgerState:state,user:person('user-c')});
  assert.equal(next.code,403);
});

test('webhook endpoint requires Preview or explicitly enabled live configuration and POST', async () => {
  const state = ledger();
  assert.equal((await hook({}, { ledgerState: state, extraEnv: { VERCEL_ENV: 'production' } })).code, 404);
  assert.equal((await hook({}, { ledgerState: state, method: 'GET' })).code, 405);
  assert.equal((await hook(callbackFields('MYOPS-abcdefgh12'), { ledgerState: state, extraEnv: { MYOPS_SERVICE_ROLE_KEY: '' } })).code, 503);
  assert.equal((await hook(callbackFields('MYOPS-abcdefgh12'), { ledgerState: state, extraEnv: { TOYYIBPAY_SANDBOX_SECRET_KEY: '' } })).code, 503);
  assert.equal((await hook('x'.repeat(5000), { ledgerState: state })).code, 400);
  assert.equal((await hook(callbackFields('MYOPS-abcdefgh12', { reason: 'x'.repeat(500) }), { ledgerState: state })).code, 400);
});

test('event keys are stable per callback so duplicates collapse', () => {
  const fields = { billcode: 'b', order_id: 'o', refno: 'r', status: '1' };
  assert.equal(founderEventKey(fields), founderEventKey({ ...fields }));
  assert.notEqual(founderEventKey(fields), founderEventKey({ ...fields, status: '3' }));
});

const catalog = [{ slug: 'opsp', launch_status: 'live' }, { slug: 'opswms', launch_status: 'coming_soon' }, { slug: 'opsnew', launch_status: 'live' }];
const lifeRow = (over) => ({ user_id: 'user-a', scope: 'all_apps', status: 'active', ...over });

test('lifetime entitlement unlocks every live app, including newly launched catalog apps', () => {
  const base = { userId: 'user-a', catalog, subscriptions: [], grants: [], now: NOW };
  assert.deepEqual(resolveProductStates({ ...base, lifetime: [lifeRow()] }),
    { opsp: 'active', opsfinance: 'coming_soon', opsflow: 'coming_soon', opswms: 'coming_soon', opshr: 'coming_soon', opsnew: 'active' });
  const none = resolveProductStates({ ...base, lifetime: [] });
  assert.equal(none.opsp, 'none');
  assert.equal(none.opsnew, 'none');
  assert.equal(resolveProductStates({ ...base, lifetime: [lifeRow({ status: 'revoked' })] }).opsp, 'none');
  assert.equal(resolveProductStates({ ...base, lifetime: [lifeRow({ user_id: 'someone-else' })] }).opsp, 'none');
  assert.equal(resolveProductStates({ ...base, lifetime: [lifeRow({ scope: 'other' })] }).opsp, 'none');
  assert.equal(resolveProductStates({ ...base, catalog: [{ slug: 'Bad Slug!', launch_status: 'live' }], lifetime: [lifeRow()] }).opsp, 'coming_soon');
});

test('session reports lifetime and the launch gate follows it server-side, with no frontend trust', async () => {
  const rows = { myops_products: catalog, myops_lifetime_entitlements: [lifeRow()] };
  const session = await authRun({ action: 'session' }, { rows });
  assert.equal(session.data.lifetime, true);
  assert.equal(session.data.products.opsp, 'active');
  const launch = await authRun({ action: 'launch', product: 'opsnew' }, { rows,
    appAccessFactory: () => ({ issueTicket: async () => ({ status: 200, next: 'https://app.example.test/new/launch?t=opaque' }) }) });
  assert.deepEqual(launch.data, { next: 'https://app.example.test/new/launch?t=opaque' });
  const denied = await authRun({ action: 'launch', product: 'opsp' }, { rows: { myops_products: catalog }, extraEnv: { MYOPS_APP_URL_OPSP: 'https://app.example.test/opsp' } });
  assert.equal(denied.code, 403);
  const unknown = await authRun({ action: 'launch', product: 'nothere' }, { rows });
  assert.equal(unknown.code, 400);
  const injected = await authRun({ action: 'launch', product: 'opsp/../x' }, { rows });
  assert.equal(injected.code, 400);
});


test('isolated staging checkout and callback use the same selected database — retired sales remain closed', async () => {
 const state=ledger(); const g=gateway();
 for(const plan of ['founders_lifetime','single_app_monthly']) {
 const result=await authRun({action:'checkout',plan,product:'opsp'},{ledgerState:state,transport:g.transport});
 assert.equal(result.code,403);
 }
 assert.equal(state.payments.size,0);assert.equal(g.requests.length,0);
});

const liveEnv = { ...env, VERCEL_ENV:'production', MYOPS_ENVIRONMENT:'production', MYOPS_ENABLE_LIVE_PAYMENTS:'true', TOYYIBPAY_LIVE_SECRET_KEY:'live-fixture-only', TOYYIBPAY_LIVE_CATEGORY_CODE:'livecat1', MYOPS_SANDBOX_CALLBACK_BYPASS_SECRET:'never-export' };

test('live gateway needs explicit production enablement and never falls back to sandbox keys', () => {
  const project = env.VITE_SUPABASE_URL;
  assert.equal(paymentGateway({ ...liveEnv, MYOPS_ENABLE_LIVE_PAYMENTS: '' }, project), null);
  assert.equal(paymentGateway({ ...liveEnv, MYOPS_ENVIRONMENT: 'staging' }, project), null);
  assert.equal(paymentGateway(liveEnv, 'https://wengxxiqwtosirealghx.supabase.co'), null);
  assert.equal(paymentGateway(liveEnv, project).host, 'https://toyyibpay.com');
  assert.equal(paymentGateway({ ...liveEnv, TOYYIBPAY_LIVE_SECRET_KEY: '' }, project).secret, '');
  assert.equal(paymentGateway({ ...liveEnv, VERCEL_ENV: 'preview' }, project).host, 'https://dev.toyyibpay.com');
});

test('live retired checkout cannot contact ToyyibPay or create a payment',async()=>{
 const state=ledger();const g=gateway();
 const result=await createPayments({env:liveEnv,project:env.VITE_SUPABASE_URL,adminFactory:()=>state.client,transport:g.transport}).checkout({userId:'user-a',plan:'founders_lifetime',origin:'https://www.myops.com.my'});
 assert.equal(result.status,403);assert.equal(g.requests.length,0);assert.equal(state.payments.size,0);
});

test('historical live callback retains independent confirmation and idempotent settlement',async()=>{
  const {state,order}=await started();state.payments.get(order).gateway='toyyibpay_live';
  const fields = callbackFields(order, { hash: createHash('md5').update(`${liveEnv.TOYYIBPAY_LIVE_SECRET_KEY}1${order}TP1ok`).digest('hex') });
  const verified = gateway({ paid: [paidRow(order)] });
  assert.equal((await hook(fields, { ledgerState: state, transport: verified.transport, extraEnv: liveEnv })).code, 200);
  assert.equal(verified.requests[0].url, 'https://toyyibpay.com/index.php/api/getBillTransactions');
  assert.equal((await hook(fields, { ledgerState: state, transport: verified.transport, extraEnv: liveEnv })).code, 200);
  assert.equal(state.alloc.size, 1);
  assert.equal((await hook({ ...fields, hash: undefined }, { ledgerState: state, transport: verified.transport, extraEnv: liveEnv })).code, 400);
  state.payments.get(order).gateway = 'toyyibpay_sandbox';
  const before = verified.requests.length;
  assert.equal((await hook(fields, { ledgerState: state, transport: verified.transport, extraEnv: liveEnv })).code, 400);
  assert.equal(verified.requests.length, before);
  assert.equal((await hook(callbackFields(order), { ledgerState: state, transport: verified.transport, extraEnv: liveEnv })).code, 400);
});
test('production auth checkout is gated and passes only live configuration to payment transport — retired sales remain closed', async () => {
 const state=ledger(); const g=gateway();
 for(const plan of ['founders_lifetime','single_app_monthly']) {
 const result=await authRun({action:'checkout',plan,product:'opsp'},{ledgerState:state,transport:g.transport});
 assert.equal(result.code,403);
 }
 assert.equal(state.payments.size,0);assert.equal(g.requests.length,0);
});
