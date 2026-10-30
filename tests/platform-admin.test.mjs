import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlatformAdmin, resolveProductStates } from '../server/entitlements.js';
import { createPayments } from '../server/payments.js';
import { createAuthHandler } from '../server/auth.js';

const input = { userId: 'owner-id', catalog: [{ slug: 'opsfinance', launch_status: 'live' }, { slug: 'opsflow', launch_status: 'live' }, { slug: 'opshr', launch_status: 'coming_soon' }], subscriptions: [], grants: [], lifetime: [], now: Date.now() };
test('platform admin requires the exact server allowlisted identity', () => {
  assert.equal(isPlatformAdmin('owner-id', { MYOPS_ADMIN_USER_IDS: ' owner-id ' }), true);
  assert.equal(isPlatformAdmin('other-user', { MYOPS_ADMIN_USER_IDS: 'owner-id' }), false);
  assert.equal(isPlatformAdmin('', { MYOPS_ADMIN_USER_IDS: ',' }), false);
  assert.equal(isPlatformAdmin('owner-id', { role: 'admin' }), false);
});
test('admin access needs no paid subscription and preserves coming-soon locks', () => {
  const state = resolveProductStates({ ...input, platformAdmin: true });
  assert.equal(state.opsfinance, 'active');
  assert.equal(state.opsflow, 'active');
  assert.equal(state.opshr, 'coming_soon');
});
test('ordinary accounts remain denied without valid subscription', () => {
  assert.equal(resolveProductStates(input).opsfinance, 'none');
  assert.equal(resolveProductStates({ ...input, platformAdmin: 'true' }).opsfinance, 'none');
});
test('revoking server admin configuration removes complimentary access', () => {
  const state = resolveProductStates({ ...input, platformAdmin: isPlatformAdmin('owner-id', {}) });
  assert.equal(state.opsfinance, 'none');
});

test('production audit reads existing payment and subscription tables only', async () => {
  const reads = [];
  const client = { from(table) {
    reads.push(table);
    const query = { select: () => query, order: () => query, limit: async () => ({ data: [{ id: table }], error: null }) };
    return query;
  } };
  const payments = createPayments({ env: { VERCEL_ENV: 'production', MYOPS_ADMIN_USER_IDS: 'owner-id', MYOPS_SERVICE_ROLE_KEY: 'sb_secret_test_fixture' }, adminFactory: () => client, project: 'https://uhuukcztdifvpjuopdea.supabase.co', transport: () => assert.fail('no payment gateway request') });
  assert.equal((await payments.audit({ userId: 'ordinary-user' })).status, 403);
  assert.deepEqual(reads, []);
  const result = await payments.audit({ userId: 'owner-id' });
  assert.equal(result.status, 200);
  assert.equal(result.body.environment, 'production');
  assert.deepEqual(reads.sort(), ['myops_payments', 'myops_subscriptions']);
});

test('production audit database error fails closed', async () => {
  const query = { select: () => query, order: () => query, limit: async () => ({ error: {} }) };
  const payments = createPayments({ env: { VERCEL_ENV: 'production', MYOPS_ADMIN_USER_IDS: 'owner-id', MYOPS_SERVICE_ROLE_KEY: 'sb_secret_test_fixture' }, adminFactory: () => ({ from: () => query }), project: 'https://uhuukcztdifvpjuopdea.supabase.co' });
  assert.equal((await payments.audit({ userId: 'owner-id' })).status, 503);
});

test('production admin audit requires explicit flag and authenticated session; checkout stays off', async () => {
  const env = { VERCEL_ENV: 'production', MYOPS_ENABLE_PRODUCTION_AUTH: 'true', MYOPS_SESSION_SECRET: 's'.repeat(40), VITE_SUPABASE_URL: 'https://uhuukcztdifvpjuopdea.supabase.co', VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_test_fixture' };
  async function run(action, enabled) {
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
    await createAuthHandler({ env: { ...env, MYOPS_ENABLE_PLATFORM_ADMIN: enabled ? 'true' : 'false' } })({ method: 'POST', headers: { host: 'www.myops.com.my', origin: 'https://www.myops.com.my', 'content-type': 'application/json' }, body: { action } }, res);
    return res.code;
  }
  assert.equal(await run('admin_audit', false), 404);
  assert.equal(await run('admin_audit', true), 401);
  assert.equal(await run('checkout', true), 404);
});
