import { projectForEnvironment, STAGING_PROJECT, PRODUCTION_PROJECT } from './project.js';
import { effectiveTrialState, LIVE_TRIAL_APPS } from './subscription-plans.js';
export function withoutTrialAccess(env={}) {
 return {...env,MYOPS_ENABLE_STAGING_TRIAL_ACCESS:'false',MYOPS_ENABLE_PRODUCTION_TRIAL_ACCESS:'false'};
}
export function trialAppsForEnvironment(env={}) {
 const staging=projectForEnvironment(env)===STAGING_PROJECT&&env.VITE_SUPABASE_URL===STAGING_PROJECT&&env.VERCEL_ENV==='preview'&&env.MYOPS_ENVIRONMENT==='staging'&&env.MYOPS_ENABLE_STAGING_TRIAL_ACCESS==='true';
 const production=env.VERCEL_ENV==='production'&&env.MYOPS_ENVIRONMENT==='production'&&env.VITE_SUPABASE_URL===PRODUCTION_PROJECT&&env.MYOPS_ENABLE_PRODUCTION_APP_ACCESS==='true'&&env.MYOPS_ENABLE_PRODUCTION_TRIAL_ACCESS==='true';
 if(!staging&&!production) return [];
 // Readiness is supplied by reviewed server configuration, never by the browser.
 const gates={opsfinance:'MYOPS_FINANCE_TRIAL_UAT_READY',opsflow:'MYOPS_OPSFLOW_TRIAL_UAT_READY',opsp:'MYOPS_OPSPS_TRIAL_UAT_READY',opshr:'MYOPS_OPSHR_TRIAL_UAT_READY'};
 const apps=[...new Set(String(env.MYOPS_TRIAL_READY_APPS||'').split(',').map(x=>x.trim()))]
  .filter(x=>LIVE_TRIAL_APPS.includes(x)&&((staging&&x==='opsflow')||env[gates[x]]==='true'));
 // Production launches the complete four-app trial together, after all adapters pass UAT.
 if(production&&!LIVE_TRIAL_APPS.every(app=>apps.includes(app)))return [];
 return apps;
}
export async function loadEligibleTrial(client,userId,now,env={}) {
 if(!trialAppsForEnvironment(env).length) return null;
 const result=await client.from('myops_trials').select('id,user_id,organization_id,started_at,expires_at,status,policy_version').eq('user_id',userId).maybeSingle();
 if(result.error) throw new Error('Trial access unavailable');
 const trial=result.data;
 if(!trial||trial.user_id!==userId||trial.policy_version!==1||effectiveTrialState(trial,now)!=='active') return null;
 if(trial.organization_id) {
  const [org,members]=await Promise.all([
   client.from('myops_organizations').select('id').eq('id',trial.organization_id).eq('owner_user_id',userId).maybeSingle(),
   client.from('myops_memberships').select('user_id,role').eq('organization_id',trial.organization_id).eq('status','active')]);
  if(org.error||members.error) throw new Error('Trial company unavailable');
  if(!org.data||members.data?.length!==1||members.data[0].user_id!==userId||members.data[0].role!=='admin') return null;
 }
 return trial;
}
