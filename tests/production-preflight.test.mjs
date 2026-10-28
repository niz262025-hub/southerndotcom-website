import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { productionSsoPreflight } from '../server/production-preflight.js';

const configured = {
  VERCEL_ENV: 'production', MYOPS_ENVIRONMENT: 'production',
  MYOPS_ENABLE_PRODUCTION_AUTH: 'true', MYOPS_ENABLE_PRODUCTION_APP_ACCESS: 'true',
  VITE_SUPABASE_URL: 'https://uhuukcztdifvpjuopdea.supabase.co',
  VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_fixture',
  MYOPS_SERVICE_ROLE_KEY: 'sb_secret_fixture',
  MYOPS_SESSION_SECRET: 's'.repeat(40), MYOPS_APP_USER_REF_SECRET: 'u'.repeat(40),
  MYOPS_APP_URL_OPSFINANCE: 'https://app.myops.com.my/',
};

test('production SSO requires aligned auth, project, server credential and exact Finance destination', () => {
  assert.deepEqual(productionSsoPreflight(configured), {enabled:true,errors:[]});
  for (const key of Object.keys(configured).filter(key => !['VERCEL_ENV','MYOPS_ENABLE_PRODUCTION_APP_ACCESS'].includes(key))) {
    assert.ok(productionSsoPreflight({...configured,[key]:''}).errors.includes(key),key);
  }
  for (const target of ['https://other.example','https://app.myops.com.my/path','https://app.myops.com.my/?x=1','https://app.myops.com.my/#ticket','https://user:password@app.myops.com.my/']) {
    assert.ok(productionSsoPreflight({...configured,MYOPS_APP_URL_OPSFINANCE:target}).errors.includes('MYOPS_APP_URL_OPSFINANCE'));
  }
});

test('preview and explicitly disabled production remain buildable without SSO credentials', () => {
  assert.deepEqual(productionSsoPreflight({VERCEL_ENV:'preview',MYOPS_ENABLE_PRODUCTION_APP_ACCESS:'true'}),{enabled:false,errors:[]});
  assert.deepEqual(productionSsoPreflight({VERCEL_ENV:'production'}),{enabled:false,errors:[]});
});

test('production build rejects incomplete SSO before generating assets without printing secrets', () => {
  const env = {...process.env,...configured,MYOPS_ENABLE_PRODUCTION_AUTH:'false'};
  const result = spawnSync(process.execPath,['scripts/build.mjs'],{env,encoding:'utf8'});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/MYOPS_ENABLE_PRODUCTION_AUTH/);
  for (const key of ['MYOPS_SESSION_SECRET','MYOPS_APP_USER_REF_SECRET','MYOPS_SERVICE_ROLE_KEY']) {
    assert.ok(!`${result.stdout}${result.stderr}`.includes(env[key]));
  }
  assert.ok(!result.stdout.includes('building for production'));
});
