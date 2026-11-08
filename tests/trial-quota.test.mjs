import test from 'node:test';
import assert from 'node:assert/strict';
import {consumeVerifiedTrialQuota} from '../server/trial-quota.js';
const userId='10000000-0000-4000-8000-000000000001',loginSessionId='20000000-0000-4000-8000-000000000001',op='30000000-0000-4000-8000-000000000001';
const identity={active:true,userId,loginSessionId,product:'opsp'};
test('trial adapter binds quota to verified identity and stable operation, returns only bounded metadata',async()=>{
 let args;const client={rpc:async(name,input)=>{assert.equal(name,'myops_consume_trial_quota');args=input;return {data:{allowed:true,used:2,limit:2,replayed:true,private:'never return'}};}};
 assert.deepEqual(await consumeVerifiedTrialQuota(client,identity,'projects',op),{allowed:true,used:2,limit:2,replayed:true});
 assert.deepEqual(args,{p_user_id:userId,p_login_session_id:loginSessionId,p_app_id:'opsp',p_feature:'projects',p_operation_id:op});
});
test('invalid identities, premium and unknown apps never call database',async()=>{
 const client={rpc:()=>assert.fail('must not consume')};
 for(const i of [{...identity,active:false},{...identity,userId:'bad'},{...identity,loginSessionId:null}]) assert.equal((await consumeVerifiedTrialQuota(client,i,'projects',op)).allowed,false);
 for(const product of ['__proto__','opswms','opshub']) assert.equal((await consumeVerifiedTrialQuota(client,{...identity,product},'projects',op)).allowed,false);
 assert.equal((await consumeVerifiedTrialQuota(client,identity,'export_pdf',op)).allowed,false);
});
test('expiry, exhausted limits, upstream failure and malformed response all fail closed',async()=>{
 for(const reason of ['trial_inactive','trial_membership_changed','trial_limit_reached']) assert.deepEqual(await consumeVerifiedTrialQuota({rpc:async()=>({data:{allowed:false,reason}})},identity,'projects',op),{allowed:false,reason});
 for(const reply of [{error:{message:'secret'}},{data:{allowed:true,used:3,limit:2,replayed:false}},{data:null}]) assert.deepEqual(await consumeVerifiedTrialQuota({rpc:async()=>reply},identity,'projects',op),{allowed:false,reason:'unavailable'});
 assert.equal((await consumeVerifiedTrialQuota({rpc:async()=>{throw Error('secret');}},identity,'projects',op)).reason,'unavailable');
});

test('OpsHR transaction and employee quotas use verified identity with the same central RPC',async()=>{
 for(const feature of ['transactions','employees']) {
  let args;
  const result=await consumeVerifiedTrialQuota({rpc:async(_name,input)=>{args=input;return {data:{allowed:true,used:30,limit:30,replayed:false}};}},{...identity,product:'opshr'},feature,op);
  assert.equal(result.allowed,true);assert.equal(args.p_app_id,'opshr');assert.equal(args.p_feature,feature);
 }
});
