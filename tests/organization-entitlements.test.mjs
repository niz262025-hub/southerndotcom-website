import test from 'node:test';
import assert from 'node:assert/strict';
import {loadGrantedOrganizationSubscriptions} from '../server/organization-entitlements.js';
import {resolveProductStates} from '../server/entitlements.js';
const userId='verified-manager';
const env={VERCEL_ENV:'production',MYOPS_ENVIRONMENT:'production',MYOPS_SERVICE_ROLE_KEY:'sb_secret_test_fixture'};
const grant={organization_id:'business-b',product_slug:'opsflow'};
const member={organization_id:'business-b',user_id:userId,status:'active'};
const sub={organization_id:'business-b',personal_user_id:null,product_slug:'opsflow',status:'active',current_period_end:'2099-01-01T00:00:00Z'};
function setup({members=[member],grants=[grant],subscriptions=[sub],membershipError=false,subscriptionError=false,config=env}={}){
 const calls=[];
 const client={from:table=>{assert.equal(table,'myops_memberships');const q={select:()=>q,eq:(key,value)=>{calls.push([key,value]);return q;},then:resolve=>resolve({data:members,error:membershipError?{}:null})};return q;}};
 const clientFactory=(project,key,options)=>{assert.equal(project,'https://uhuukcztdifvpjuopdea.supabase.co');assert.equal(key,'sb_secret_test_fixture');assert.equal(options.auth.persistSession,false);calls.push(['server']);return {from:table=>{assert.equal(table,'myops_subscriptions');return {select:()=>({in:async(key,ids)=>{calls.push([key,ids]);return {data:subscriptions,error:subscriptionError?{}:null};}})};}};};
 return {calls,run:()=>loadGrantedOrganizationSubscriptions({client,userId,grants,env:config,clientFactory})};
}
test('manager receives only subscriptions backed by active membership plus explicit grant, without billing RLS changes',async()=>{
 const {calls,run}=setup();const rows=await run();assert.deepEqual(rows,[sub]);
 assert.ok(calls.some(([key,value])=>key==='user_id'&&value===userId));
 assert.ok(calls.some(([key,value])=>key==='organization_id'&&value.length===1&&value[0]==='business-b'));
 const states=resolveProductStates({userId,catalog:[{slug:'opsflow',launch_status:'live'}],subscriptions:rows,grants:[grant],now:Date.now()});assert.equal(states.opsflow,'active');assert.equal(states.opsfinance,'coming_soon');
});
test('missing, inactive, foreign-user and unmatched memberships cannot trigger privileged billing reads',async()=>{
 for(const members of [[],[{...member,status:'inactive'}],[{...member,user_id:'foreign'}],[{...member,organization_id:'business-a'}]]){const {calls,run}=setup({members});assert.deepEqual(await run(),[]);assert.equal(calls.some(([key])=>key==='server'),false);}
 const noGrant=setup({grants:[]});assert.deepEqual(await noGrant.run(),[]);assert.equal(noGrant.calls.length,0);
});
test('upstream errors or unavailable server configuration fail closed',async()=>{
 for(const options of [{membershipError:true},{subscriptionError:true},{config:{...env,MYOPS_SERVICE_ROLE_KEY:''}}]) assert.equal(await setup(options).run(),null);
});
test('foreign tenant and personal subscription rows cannot enter the organization result',async()=>{
 const rows=await setup({subscriptions:[sub,{...sub,organization_id:'business-a'},{...sub,personal_user_id:'foreign'}]}).run();assert.deepEqual(rows,[sub]);
});
test('expired and revoked company subscriptions still do not unlock apps',async()=>{
 for(const extra of [{status:'revoked'},{current_period_end:'2000-01-01T00:00:00Z'}]){const subscriptions=await setup({subscriptions:[{...sub,...extra}]}).run();assert.equal(resolveProductStates({userId,catalog:[{slug:'opsflow',launch_status:'live'}],subscriptions,grants:[grant],now:Date.now()}).opsflow,'none');}
});
