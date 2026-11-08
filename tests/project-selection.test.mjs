import test from 'node:test';
import assert from 'node:assert/strict';
import { flagEnabled, projectForEnvironment, previewIsolationErrors, restoreRehearsalDestinationAllowed, restoreRehearsalSafetyErrors, PRODUCTION_PROJECT, STAGING_PROJECT } from '../server/project.js';
import { createAuthHandler } from '../server/auth.js';
import { createAppAccess } from '../server/app-access.js';
import { paymentGateway } from '../server/payments.js';

const staging = { VERCEL_ENV: 'preview', MYOPS_ENVIRONMENT: 'staging', MYOPS_USE_ISOLATED_STAGING: 'true' };
const disabled = [false, 0, 1, NaN, Infinity, 'false', ' FALSE ', ' Off ', '0', 'off', 'no', '', '  ', undefined, null, {}, [], 'tru', 'true,false'];
test('flag parser accepts only explicit boolean/string opt-ins', () => {
  for (const value of [true, 'true', ' TRUE ', '1', 'yes', 'On']) assert.equal(flagEnabled(value), true);
  for (const value of disabled) assert.equal(flagEnabled(value), false);
});
test('missing, malformed or mismatched preview flags never select production', () => {
  assert.equal(projectForEnvironment(staging), STAGING_PROJECT);
  for (const value of disabled) assert.equal(projectForEnvironment({ ...staging, MYOPS_USE_ISOLATED_STAGING: value }), null);
  for (const env of [{}, { ...staging, MYOPS_ENVIRONMENT: undefined }, { ...staging, MYOPS_ENVIRONMENT: 'production' },
    { ...staging, VERCEL_ENV: 'development' }, { ...staging, VERCEL_ENV: 'prodution' }]) assert.equal(projectForEnvironment(env), null);
  assert.equal(projectForEnvironment({ ...staging, VERCEL_ENV: 'production' }), PRODUCTION_PROJECT);
  assert.equal(projectForEnvironment({ ...staging, VITE_SUPABASE_URL: 'https://attacker.example' }), STAGING_PROJECT);
});
test('unsafe preview build settings reject production URL, live keys and public secrets', () => {
  assert.deepEqual(previewIsolationErrors({}), []);
  assert.deepEqual(previewIsolationErrors({ ...staging, VITE_SUPABASE_URL: STAGING_PROJECT }), []);
  for (const env of [{ ...staging, VITE_SUPABASE_URL: PRODUCTION_PROJECT },
    { VERCEL_ENV: 'preview', VITE_SUPABASE_URL: STAGING_PROJECT },
    { ...staging, TOYYIBPAY_LIVE_SECRET_KEY: 'fixture' },
    { ...staging, VITE_MYOPS_SERVICE_ROLE_KEY: 'fixture' },
    { ...staging, VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_secret_fixture' },
    { VERCEL_ENV: 'production', VITE_API_KEY: 'sb_secret_fixture' }]) assert.ok(previewIsolationErrors(env).length);
});
test('preview with production credentials cannot construct an auth or SSO client', async () => {
  for (const value of disabled) {
    const env = { ...staging, MYOPS_USE_ISOLATED_STAGING: value, VITE_SUPABASE_URL: PRODUCTION_PROJECT,
      VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture', MYOPS_SESSION_SECRET: 's'.repeat(40),
      MYOPS_SERVICE_ROLE_KEY: 'sb_secret_fixture', MYOPS_APP_USER_REF_SECRET: 'u'.repeat(40), VERCEL_BRANCH_URL: 'preview.example' };
    const factory = () => assert.fail('blocked configuration must not contact Supabase');
    const res = { setHeader() {}, status(code) { this.code = code; return this; }, json() {} };
    await createAuthHandler({ env, clientFactory: factory })({ method: 'POST',
      headers: { host: 'preview.example', origin: 'https://preview.example', 'content-type': 'application/json' },
      body: { action: 'login', email: 'test@example.test', password: 'fixture-password' } }, res);
    assert.equal(res.code, 503);
    assert.equal(await createAppAccess({ env, adminFactory: factory }).issueTicket({ userId: 'user', product: 'opsp', loginSessionId: '7c1f0a52-3b6e-4d58-9a41-0e2d5b8c9f13' }), null);
    assert.equal(paymentGateway(env, PRODUCTION_PROJECT), null);
  }
});
test('preview sandbox selection ignores live credentials', () => {
  const gateway = paymentGateway({ ...staging, TOYYIBPAY_LIVE_SECRET_KEY: 'live-fixture' }, STAGING_PROJECT);
  assert.equal(gateway.host, 'https://dev.toyyibpay.com');
  assert.equal(gateway.secret, undefined);
});

test('restore rehearsal safety rejects remote destinations and Supabase secrets', () => {
  assert.equal(restoreRehearsalDestinationAllowed('postgresql://user@127.0.0.1:5432/rehearsal'), true);
  assert.equal(restoreRehearsalDestinationAllowed('postgresql://user@db.supabase.co:5432/postgres'), false);
  assert.equal(restoreRehearsalDestinationAllowed('https://example.com'), false);
  assert.deepEqual(restoreRehearsalSafetyErrors({ RESTORE_REHEARSAL_TARGET: 'postgresql://user@127.0.0.1:5432/rehearsal' }), []);
  assert.ok(restoreRehearsalSafetyErrors({ RESTORE_REHEARSAL_TARGET: 'postgresql://user@db.supabase.co:5432/postgres' }).length);
  assert.ok(restoreRehearsalSafetyErrors({ SUPABASE_URL: 'https://prod.supabase.co', MYOPS_SERVICE_ROLE_KEY: 'sb_secret_fixture' }).length);
});
