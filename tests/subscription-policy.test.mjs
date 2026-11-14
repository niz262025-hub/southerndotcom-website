import test from 'node:test';
import assert from 'node:assert/strict';
import {SUBSCRIPTION_OPTIONS,TRIAL_DURATION_MS,trialFeaturePolicy,effectiveTrialState,validateSelectedApps} from '../server/subscription-plans.js';
test('central catalog contains published monthly options and free trial never renews or requires a card',()=>{
 assert.equal(SUBSCRIPTION_OPTIONS.length,5);assert.equal(new Set(SUBSCRIPTION_OPTIONS.map(p=>p.id)).size,5);
 assert.deepEqual(SUBSCRIPTION_OPTIONS[0],{id:'free_trial',name:'Free Trial',amountCents:0,durationDays:7,cardRequired:false,autoRenew:false});
 assert.equal(TRIAL_DURATION_MS,604800000);
});
test('trial feature contracts match app-specific evaluation limits and fail closed for unavailable apps',()=>{
 assert.equal(trialFeaturePolicy('opsfinance').bankStatements,2);assert.equal(trialFeaturePolicy('opsfinance').invoiceReceiptDocuments,5);
 assert.equal(trialFeaturePolicy('opsfinance').reconciliation,'preview');assert.equal(trialFeaturePolicy('opsfinance').exportExcel,false);
 assert.equal(trialFeaturePolicy('opsflow').workflows,2);assert.equal(trialFeaturePolicy('opsflow').automation,false);
 assert.equal(trialFeaturePolicy('opsp').projects,2);assert.equal(trialFeaturePolicy('opsp').multiUser,false);
 for(const app of ['opsfinance','opsflow','opsp']) assert.equal(trialFeaturePolicy(app).transactions,30);
 for(const app of ['opswms','opshr','unknown','__proto__']) assert.equal(trialFeaturePolicy(app),null);
});
test('trial is invalid at exact expiry even if the persisted status remains active',()=>{
 const start=Date.parse('2026-11-01T04:00:00Z'),trial={status:'active',started_at:new Date(start).toISOString(),expires_at:new Date(start+TRIAL_DURATION_MS).toISOString()};
 assert.equal(effectiveTrialState(trial,start+TRIAL_DURATION_MS-1),'active');assert.equal(effectiveTrialState(trial,start+TRIAL_DURATION_MS),'expired');
 assert.equal(effectiveTrialState({...trial,status:'upgraded'},start+TRIAL_DURATION_MS),'upgraded');
 assert.equal(effectiveTrialState({...trial,expires_at:new Date(start+TRIAL_DURATION_MS+1).toISOString()},start),'invalid');
 assert.equal(effectiveTrialState(trial,start-1),'invalid');
});
test('two-app plan requires exactly two distinct available apps',()=>{
 const available=['opsfinance','opsflow','opsp'];
 assert.equal(validateSelectedApps('two_apps_monthly',['opsflow','opsp'],available),true);
 for(const apps of [['opsp'],['opsp','opsp'],['opsp','opshr'],['opsp','opsflow','opsfinance']]) assert.equal(validateSelectedApps('two_apps_monthly',apps,available),false);
});

test('published prices replace legacy offers without enabling unvalidated checkout',()=>{
 const paid=SUBSCRIPTION_OPTIONS.slice(1);
 assert.deepEqual(paid.map(({name,amountCents})=>[name,amountCents]),[['Starter',990],['Single',1990],['Duo',2990],['Complete',3990]]);
 for(const plan of paid) {
  assert.equal(plan.billingCycle,'monthly');
  assert.equal(plan.checkoutEnabled,false);
  assert.equal(Object.isFrozen(plan),true);
 }
 assert.equal(SUBSCRIPTION_OPTIONS.some(p=>['founders_lifetime','two_apps_monthly','all_apps_monthly'].includes(p.id)),false);
});
