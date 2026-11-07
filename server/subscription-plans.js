// Central MYOPS policy contract. Apps must enforce these limits on their server before
// trial activation is exposed. This module never grants app access or creates billing.
export const TRIAL_DURATION_MS = 7 * 24 * 60 * 60 * 1000;
export const SUBSCRIPTION_OPTIONS = Object.freeze([
  Object.freeze({ id:'free_trial', name:'Free Trial', amountCents:0, durationDays:7, cardRequired:false, autoRenew:false }),
  Object.freeze({ id:'founders_lifetime', name:'First 100 Subscribers', amountCents:2900, billingCycle:'lifetime', capacity:100 }),
  Object.freeze({ id:'two_apps_monthly', name:'Normal Subscription', amountCents:4900, billingCycle:'monthly', selectedApps:2 }),
  Object.freeze({ id:'all_apps_monthly', name:'All Apps', amountCents:7900, billingCycle:'monthly', allAvailableApps:true }),
]);
const POLICY = Object.freeze({
  opsfinance:Object.freeze({ transactions:30, users:1, companies:1, bankStatements:2, invoiceReceiptDocuments:5, reconciliation:'preview', profitAndLoss:'preview', balanceSheet:'preview', exportPdf:false, exportExcel:false }),
  opsflow:Object.freeze({ transactions:30, users:1, companies:1, workflows:2, automation:false, advancedApproval:false }),
  opsp:Object.freeze({ transactions:30, users:1, companies:1, projects:2, advancedReporting:false, exportPdf:false, exportExcel:false, multiUser:false }),
});
export function trialFeaturePolicy(app) { return Object.hasOwn(POLICY,app) ? POLICY[app] : null; }
export function effectiveTrialState(trial, now=Date.now()) {
  if (!trial) return 'not_started';
  const start=Date.parse(trial.started_at), end=Date.parse(trial.expires_at);
  if (!Number.isFinite(start)||!Number.isFinite(end)||end-start!==TRIAL_DURATION_MS||start>now) return 'invalid';
  if (trial.status==='upgraded') return 'upgraded';
  if (trial.status!=='active'||end<=now) return 'expired';
  return 'active';
}
export function validateSelectedApps(plan, apps, available) {
  if (plan!=='two_apps_monthly'||!Array.isArray(apps)||apps.length!==2||new Set(apps).size!==2) return false;
  return apps.every(app=>typeof app==='string'&&available.includes(app));
}
