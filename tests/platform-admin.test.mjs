import test from 'node:test';
import assert from 'node:assert/strict';
import { isPlatformAdmin, resolveProductStates } from '../server/entitlements.js';

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
