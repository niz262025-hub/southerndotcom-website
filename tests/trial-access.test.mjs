import test from 'node:test';
import assert from 'node:assert/strict';
import {trialAppsForEnvironment,loadEligibleTrial,withoutTrialAccess} from '../server/trial-access.js';
import {resolveProductStates} from '../server/entitlements.js';
const env={VERCEL_ENV:'preview',MYOPS_ENVIRONMENT:'staging',MYOPS_USE_ISOLATED_STAGING:'true',VITE_SUPABASE_URL:'https://wengxxiqwtosirealghx.supabase.co',MYOPS_ENABLE_STAGING_TRIAL_ACCESS:'true',MYOPS_TRIAL_READY_APPS:'opsflow,opsfinance,opsp,opshr'};
const now=Date.now();const trial={id:'id',user_id:'user',organization_id:null,status:'active',policy_version:1,started_at:new Date(now-1000).toISOString(),expires_at:new Date(now-1000+604800000).toISOString()};
const catalog=['opsflow','opsfinance','opsp','opshr','opswms','opshub'].map(slug=>({slug,launch_status:'live'}));
const states=(t,apps=['opsflow'])=>resolveProductStates({userId:'user',catalog,subscriptions:[],grants:[],trial:t,trialApps:apps,now});
test('trial grants only certified app and never grants production or implicit access',()=>{
 assert.deepEqual(trialAppsForEnvironment(env),['opsflow']);
 assert.deepEqual(trialAppsForEnvironment({...env,MYOPS_FINANCE_TRIAL_UAT_READY:'true'}),['opsflow','opsfinance']);
 assert.deepEqual(trialAppsForEnvironment({...env,MYOPS_FINANCE_TRIAL_UAT_READY:'true',MYOPS_OPSPS_TRIAL_UAT_READY:'true'}),['opsflow','opsfinance','opsp']);
 assert.equal(states(trial,['opsp']).opsp,'active');
 assert.equal(states(trial,['opsflow','opsfinance']).opsfinance,'active');
 for(const x of [{...env,VERCEL_ENV:'production'},{...env,MYOPS_ENABLE_STAGING_TRIAL_ACCESS:'false'},{}]) assert.deepEqual(trialAppsForEnvironment(x),[]);
 assert.equal(states(trial).opsflow,'active');assert.equal(states(trial).opsfinance,'none');assert.equal(states(trial,[]).opsflow,'none');
 for(const t of [{...trial,user_id:'other'},{...trial,status:'expired'},{...trial,policy_version:2},{...trial,expires_at:new Date(now).toISOString()}]) assert.equal(states(t).opsflow,'none');
});
test('loader binds verified user and rechecks company ownership and single active member',async()=>{
 let error=false,members=[{user_id:'user',role:'admin'}],owner={id:'org'};
 const client={from:table=>{const q={select:()=>q,eq:()=>q,maybeSingle:async()=>({data:table==='myops_trials'?{...trial,organization_id:'org'}:owner,error}),then:resolve=>resolve({data:members,error})};return q;}};
 assert.equal((await loadEligibleTrial(client,'user',now,env)).id,'id');
 members.push({user_id:'other',role:'staff'});assert.equal(await loadEligibleTrial(client,'user',now,env),null);
 members=[{user_id:'user',role:'admin'}];owner=null;assert.equal(await loadEligibleTrial(client,'user',now,env),null);
 error=true;await assert.rejects(loadEligibleTrial(client,'user',now,env),/unavailable/);
});

test('one valid central trial can cover all four live apps, never WMS or OpsHub',()=>{
 const apps=['opsfinance','opsflow','opsp','opshr'];
 const gates={MYOPS_FINANCE_TRIAL_UAT_READY:'true',MYOPS_OPSFLOW_TRIAL_UAT_READY:'true',MYOPS_OPSPS_TRIAL_UAT_READY:'true',MYOPS_OPSHR_TRIAL_UAT_READY:'true'};
 const production={VERCEL_ENV:'production',MYOPS_ENVIRONMENT:'production',VITE_SUPABASE_URL:'https://uhuukcztdifvpjuopdea.supabase.co',MYOPS_ENABLE_PRODUCTION_APP_ACCESS:'true',MYOPS_ENABLE_PRODUCTION_TRIAL_ACCESS:'true',MYOPS_TRIAL_READY_APPS:apps.join(',')+',opswms,opshub,__proto__',...gates};
 assert.deepEqual(trialAppsForEnvironment(production),apps);
 assert.deepEqual(trialAppsForEnvironment({...env,...gates,MYOPS_TRIAL_READY_APPS:production.MYOPS_TRIAL_READY_APPS}),apps);
 const access=states(trial,[...apps,'opswms','opshub']);
 for(const app of apps)assert.equal(access[app],'active');
 for(const app of ['opswms','opshub'])assert.equal(access[app],'none');
 assert.deepEqual(trialAppsForEnvironment(withoutTrialAccess(production)),[]);
 for(const invalid of [{MYOPS_ENABLE_PRODUCTION_TRIAL_ACCESS:'false'},{MYOPS_ENABLE_PRODUCTION_APP_ACCESS:'false'},{VITE_SUPABASE_URL:env.VITE_SUPABASE_URL},{MYOPS_ENVIRONMENT:'staging'}])assert.deepEqual(trialAppsForEnvironment({...production,...invalid}),[]);
 assert.deepEqual(trialAppsForEnvironment({...production,MYOPS_OPSHR_TRIAL_UAT_READY:'false'}),[]);
 assert.deepEqual(trialAppsForEnvironment({...production,MYOPS_TRIAL_READY_APPS:'opshr'}),[]);
 const expired={...trial,expires_at:new Date(now).toISOString()};
 for(const app of apps)assert.equal(states(expired,apps)[app],'none');
});
