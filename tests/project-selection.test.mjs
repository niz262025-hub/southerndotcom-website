import test from 'node:test';
import assert from 'node:assert/strict';
import { projectForEnvironment,PRODUCTION_PROJECT,STAGING_PROJECT } from '../server/project.js';
test('preview and explicitly staged environments fail closed unless fully isolated',()=>{
 const staging={VERCEL_ENV:'preview',MYOPS_ENVIRONMENT:'staging',MYOPS_USE_ISOLATED_STAGING:'true',VITE_SUPABASE_URL:STAGING_PROJECT};
 assert.equal(projectForEnvironment(staging),STAGING_PROJECT);
 for(const env of [
  {VERCEL_ENV:'preview'}, {...staging,VERCEL_ENV:'production'}, {...staging,VERCEL_ENV:undefined},
  {...staging,MYOPS_ENVIRONMENT:'production'}, {...staging,MYOPS_ENVIRONMENT:'uat'}, {...staging,MYOPS_ENVIRONMENT:undefined},
  {...staging,MYOPS_USE_ISOLATED_STAGING:'false'}, {...staging,MYOPS_USE_ISOLATED_STAGING:undefined},
  {...staging,VITE_SUPABASE_URL:PRODUCTION_PROJECT}, {...staging,VITE_SUPABASE_URL:undefined},
  {MYOPS_ENVIRONMENT:'uat'}, {MYOPS_ENVIRONMENT:'staging'}, {MYOPS_ENVIRONMENT:'Preview'}, {VERCEL_ENV:'UAT'},
  {VERCEL_ENV:'Preview'}, {MYOPS_USE_ISOLATED_STAGING:'true'}, {MYOPS_USE_ISOLATED_STAGING:'TRUE'},
 ]) assert.equal(projectForEnvironment(env),null);
 assert.equal(projectForEnvironment({VERCEL_ENV:'production',MYOPS_ENVIRONMENT:'production'}),PRODUCTION_PROJECT);
 assert.equal(projectForEnvironment({}),PRODUCTION_PROJECT);
});
