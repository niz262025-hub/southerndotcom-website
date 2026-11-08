import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { effectiveBuildEnvironment } from '../scripts/build-environment.js';
import { previewIsolationErrors, PRODUCTION_PROJECT, STAGING_PROJECT } from '../server/project.js';

test('build isolation validates effective mode-specific Vite env after process overrides', () => {
  const root = mkdtempSync(join(tmpdir(), 'myops-build-env-'));
  try {
    writeFileSync(join(root, '.env.preview-auth.local'), [
      'MYOPS_ENVIRONMENT=staging',
      'MYOPS_USE_ISOLATED_STAGING=true',
      `VITE_SUPABASE_URL=${STAGING_PROJECT}`,
    ].join('\n'));

    const processEnv = { VERCEL_ENV: 'preview' };
    const effective = effectiveBuildEnvironment('preview-auth', root, processEnv);
    assert.equal(effective.VITE_SUPABASE_URL, STAGING_PROJECT);
    assert.deepEqual(previewIsolationErrors(effective), []);

    const overridden = effectiveBuildEnvironment('preview-auth', root, {
      ...processEnv,
      VITE_SUPABASE_URL: PRODUCTION_PROJECT,
    });
    assert.equal(overridden.VITE_SUPABASE_URL, PRODUCTION_PROJECT);
    assert.ok(previewIsolationErrors(overridden).includes('VITE_SUPABASE_URL'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('mode-specific public service secrets are rejected before the Vite build', () => {
  const root = mkdtempSync(join(tmpdir(), 'myops-build-env-'));
  try {
    writeFileSync(join(root, '.env.preview-auth.local'), [
      'MYOPS_ENVIRONMENT=staging',
      'MYOPS_USE_ISOLATED_STAGING=true',
      `VITE_SUPABASE_URL=${STAGING_PROJECT}`,
      'VITE_SUPABASE_SERVICE_ROLE_KEY=synthetic-secret-fixture',
    ].join('\n'));
    const effective = effectiveBuildEnvironment('preview-auth', root, { VERCEL_ENV: 'preview' });
    assert.ok(previewIsolationErrors(effective).includes('VITE_SUPABASE_SERVICE_ROLE_KEY'));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
