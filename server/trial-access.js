import { effectiveTrialState } from './subscription-plans.js';
export function trialAppsForEnvironment(env={}) {
 if(env.VERCEL_ENV!=='preview'||env.MYOPS_ENVIRONMENT!=='staging'||env.MYOPS_ENABLE_STAGING_TRIAL_ACCESS!=='true') return [];
 // Only OpsFlow currently has an atomic app-side trial gateway.
 return String(env.MYOPS_TRIAL_READY_APPS||'').split(',').map(x=>x.trim()).filter(x=>x==='opsflow');
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
