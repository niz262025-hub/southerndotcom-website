import test from 'node:test';
import assert from 'node:assert/strict';
import { APP_RELEASES, isAppLive, liveApps } from '../src/appRelease.js';
import { releasedCatalog, canPurchaseApps, isReleaseTester } from '../server/release-policy.js';
import { resolveProductStates } from '../server/entitlements.js';
import { createPayments } from '../server/payments.js';
const accepted = {status:'live',acceptance:{commit:'accepted-sha',deployment:'accepted-deployment',evidence:'authenticated-production-uat'}};
test('all nine apps default closed; READY, missing evidence, unknown and inherited entries never release',()=>{
 assert.equal(Object.keys(APP_RELEASES).length,9); assert.deepEqual(liveApps(),[]);
 for(const slug of Object.keys(APP_RELEASES)) assert.equal(isAppLive(slug),false);
 for(const entry of [{status:'READY'},{status:'live'},{status:'live',acceptance:{deployment:'READY'}}]) assert.equal(isAppLive('opsflow',{opsflow:entry}),false);
 assert.equal(isAppLive('__proto__'),false);assert.equal(isAppLive('opshub'),false);
 assert.deepEqual(liveApps({opsflow:accepted,opsp:APP_RELEASES.opsp}),['opsflow']);
});
test('customer lifetime, single and bundle grants cannot override a Coming Soon release',()=>{
 const catalog=Object.keys(APP_RELEASES).map(slug=>({slug,launch_status:'live'}));
 const states=resolveProductStates({userId:'customer',catalog:releasedCatalog(catalog,'customer',{}),subscriptions:[{personal_user_id:'customer',status:'active',is_complete_bundle:true}],grants:[],lifetime:[{user_id:'customer',status:'active',scope:'all_apps'}],now:Date.now()});
 assert.ok(Object.values(states).every(state=>state==='coming_soon'));
 const changed={...APP_RELEASES,opsflow:accepted};
 const gated=releasedCatalog(catalog,'customer',{},changed);
 assert.equal(gated.find(x=>x.slug==='opsflow').launch_status,'live');
 assert.equal(gated.find(x=>x.slug==='opsp').launch_status,'coming_soon');
});
test('explicit admin/UAT access keeps existing entitlement checks and never permits purchase',()=>{
 assert.equal(isReleaseTester('admin',{MYOPS_ADMIN_USER_IDS:'admin'}),true);
 assert.equal(isReleaseTester('test',{MYOPS_RELEASE_UAT_USER_IDS:'test'}),true);
 assert.equal(isReleaseTester('customer',{MYOPS_RELEASE_UAT_USER_IDS:'test'}),false);
 assert.equal(isReleaseTester('',{}),false);
 const catalog=releasedCatalog([{slug:'opsflow',launch_status:'live'}],'test',{MYOPS_RELEASE_UAT_USER_IDS:'test'});
 assert.equal(resolveProductStates({userId:'test',catalog,subscriptions:[],grants:[],now:Date.now()}).opsflow,'none');
 assert.equal(canPurchaseApps(['opsflow']),false);
});
test('direct checkout rejects every unreleased app, mixed bundles and legacy plans before any side effect',async()=>{
 for(const environment of ['preview','production']) for(const app of Object.keys(APP_RELEASES)) {
  const payments=createPayments({env:{VERCEL_ENV:environment,MYOPS_ADMIN_USER_IDS:'customer'},project:'fixture',adminFactory:()=>assert.fail('no database access'),transport:()=>assert.fail('no payment request')});
  for(const request of [{plan:'single_monthly',products:[app]},{plan:'duo_monthly',products:['opsflow',app]},{plan:'complete_monthly',products:['opsflow','opsfinance','opsp']},{plan:'founders_lifetime'},{plan:'single_app_monthly',product:app}]) {
   const result=await payments.checkout({userId:'customer',origin:'https://www.myops.com.my',...request});assert.equal(result.status,403);
  }
 }
 const partial={opsflow:accepted,opsp:APP_RELEASES.opsp};
 assert.equal(canPurchaseApps(['opsflow'],partial),true);
 assert.equal(canPurchaseApps(['opsflow','opsp'],partial),false);
 assert.equal(canPurchaseApps([],partial),false);
});
