import test from 'node:test';
import assert from 'node:assert/strict';
import { projectForEnvironment,PRODUCTION_PROJECT,STAGING_PROJECT } from '../server/project.js';
test('isolated staging requires all server flags and never changes production',()=>{
 const staging={VERCEL_ENV:'preview',MYOPS_ENVIRONMENT:'staging',MYOPS_USE_ISOLATED_STAGING:'true'};
 assert.equal(projectForEnvironment(staging),STAGING_PROJECT);
 for(const env of [{},{...staging,VERCEL_ENV:'production'},{...staging,MYOPS_ENVIRONMENT:'production'},{...staging,MYOPS_USE_ISOLATED_STAGING:'false'},{...staging,MYOPS_USE_ISOLATED_STAGING:undefined}])assert.equal(projectForEnvironment(env),PRODUCTION_PROJECT);
 assert.equal(projectForEnvironment({...staging,VITE_SUPABASE_URL:'https://attacker.example'}),STAGING_PROJECT);
});
