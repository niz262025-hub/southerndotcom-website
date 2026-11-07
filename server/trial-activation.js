import {loadCurrentEntitlements} from './app-access.js';
import {trialAppsForEnvironment} from './trial-access.js';
import {SUBSCRIPTION_OPTIONS} from './subscription-plans.js';
export async function trialAction({client,userId,loginSessionId,action,body,env,now}) {
 const apps=trialAppsForEnvironment(env);
 if(!apps.length) return {status:404,body:{error:'Trial is not enabled.'}};
 const allowed=action==='trial_start'?['action','confirm']:['action'];
 if(Object.keys(body).some(key=>!allowed.includes(key))||(action==='trial_start'&&body.confirm!==true)) return {status:400,body:{error:'Confirm trial activation.'}};
 const paid=await loadCurrentEntitlements(client,userId,now,{...env,MYOPS_ENABLE_STAGING_TRIAL_ACCESS:'false',MYOPS_ENABLE_PRODUCTION_TRIAL_ACCESS:'false'});
 if(!paid) return {status:503,body:{error:'Access status is unavailable.'}};
 const paidActive=Object.values(paid).includes('active');
 const current=await client.rpc('myops_trial_state',{p_user_id:userId});
 if(current.error||!current.data?.status) return {status:503,body:{error:'Trial status is unavailable.'}};
 let trial=current.data;
 if(action==='trial_start') {
  if(!loginSessionId) return {status:401,body:{error:'Sign in again to activate your trial.'}};
  if(paidActive) return {status:409,body:{error:'Existing paid or administrator access is active; a trial is not required.'}};
  // Derive company ownership server-side; caller cannot choose a company or user.
  const organizations=await client.from('myops_organizations').select('id').eq('owner_user_id',userId).limit(2);
  if(organizations.error) return {status:503,body:{error:'Company status is unavailable.'}};
  if(organizations.data?.length>1) return {status:409,body:{error:'Trial supports one company only.'}};
  const started=await client.rpc('myops_start_trial',{p_user_id:userId,p_login_session_id:loginSessionId,p_organization_id:organizations.data?.[0]?.id??null});
  if(started.error||!started.data?.status) return {status:409,body:{error:'Trial could not be activated. Verify eligibility and sign in again.'}};
  trial=started.data;
 }
 return {status:200,body:{trial,availableApps:apps,canStart:!paidActive&&trial.status==='not_started',plans:SUBSCRIPTION_OPTIONS,message:action==='trial_start'?(trial.status==='active'?'Your seven-day trial is active.':'This account has already used its trial.') : undefined}};
}
