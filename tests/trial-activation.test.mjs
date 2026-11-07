import test from 'node:test';
import assert from 'node:assert/strict';
import {trialAction} from '../server/trial-activation.js';
const env={VERCEL_ENV:'preview',MYOPS_ENVIRONMENT:'staging',MYOPS_USE_ISOLATED_STAGING:'true',VITE_SUPABASE_URL:'https://wengxxiqwtosirealghx.supabase.co',MYOPS_ENABLE_STAGING_TRIAL_ACCESS:'true',MYOPS_TRIAL_READY_APPS:'opsflow'};
function setup({paid=false,status='not_started',orgs=[],failure=false}={}) {
 const calls=[];let state={status};
 const client={from:table=>{const data=table==='myops_products'?[{slug:'opsflow',launch_status:'live'}]:table==='myops_subscriptions'&&paid?[{personal_user_id:'verified-user',status:'active',product_slug:'opsflow'}]:table==='myops_organizations'?orgs:[];
 const q={select:()=>q,eq:()=>q,in:()=>q,limit:async()=>({data,error:null}),then:resolve=>resolve({data,error:null})};return q;},rpc:async(name,args)=>{calls.push([name,args]);if(failure)return {error:{message:'private upstream'}};if(name==='myops_start_trial'&&state.status==='not_started')state={status:'active',id:'trial',expires_at:'2099-01-01T00:00:00Z'};return {data:state,error:null};}};
 const call=(action,body={action},overrides={})=>trialAction({client,userId:'verified-user',loginSessionId:'bound-login',action,body,env,now:Date.now(),...overrides});return {calls,call};
}
test('activation binds user/login/company to server identity and retry retains original trial',async()=>{
 const {call,calls}=setup({orgs:[{id:'owned-company'}]});
 const result=await call('trial_start',{action:'trial_start',confirm:true});assert.equal(result.status,200);assert.equal(result.body.trial.status,'active');
 const args=calls.find(c=>c[0]==='myops_start_trial')[1];assert.deepEqual(args,{p_user_id:'verified-user',p_login_session_id:'bound-login',p_organization_id:'owned-company'});
 const again=await call('trial_start',{action:'trial_start',confirm:true});assert.deepEqual(again.body.trial,result.body.trial);
});
test('no trial starts for paid access, missing login, forged identity or multi-company',async()=>{
 for(const opts of [{paid:true},{orgs:[{id:'one'},{id:'two'}]}]){const {call,calls}=setup(opts);assert.equal((await call('trial_start',{action:'trial_start',confirm:true})).status,409);assert.equal(calls.some(c=>c[0]==='myops_start_trial'),false);}
 const {call,calls}=setup();assert.equal((await call('trial_start',{action:'trial_start',confirm:true},{loginSessionId:null})).status,401);
 assert.equal((await call('trial_start',{action:'trial_start',confirm:true,user_id:'forged'})).status,400);assert.equal(calls.some(c=>c[0]==='myops_start_trial'),false);
});
test('status is passive, expired trial cannot restart, production and wrong project are disabled',async()=>{
 const {call,calls}=setup({status:'expired'});assert.equal((await call('trial_status')).body.canStart,false);assert.equal(calls.some(c=>c[0]==='myops_start_trial'),false);
 assert.equal((await call('trial_start',{action:'trial_start',confirm:true})).body.trial.status,'expired');
 for(const extra of [{VERCEL_ENV:'production'},{MYOPS_USE_ISOLATED_STAGING:'false'}]) assert.equal((await call('trial_status',{action:'trial_status'},{env:{...env,...extra}})).status,404);
 assert.equal((await setup({failure:true}).call('trial_status')).status,503);
});
