// Shared display/server contract. This module does not activate billing or grant access.
export const LIVE_TRIAL_APPS = Object.freeze(['opsfinance', 'opsflow', 'opsp', 'opshr']);
export const APP_LABELS = Object.freeze({ opsfinance:'OpsFinance', opsflow:'OpsFlow', opsp:'OpsPS', opshr:'OpsHR' });
export const TRIAL_DAYS = 7;
export const TRIAL_TRANSACTION_LIMIT = 30;
export const TRIAL_DURATION_MS = TRIAL_DAYS * 24 * 60 * 60 * 1000;
export const SUBSCRIPTION_OPTIONS = Object.freeze([
  Object.freeze({ id:'free_trial', name:'Free Trial', amountCents:0, durationDays:TRIAL_DAYS, cardRequired:false, autoRenew:false }),
  Object.freeze({ id:'founders_lifetime', name:'First 100 Subscribers', amountCents:2900, billingCycle:'lifetime', capacity:100 }),
  Object.freeze({ id:'two_apps_monthly', name:'Normal Subscription', amountCents:4900, billingCycle:'monthly', selectedApps:2 }),
  Object.freeze({ id:'all_apps_monthly', name:'All Apps', amountCents:7900, billingCycle:'monthly', allAvailableApps:true }),
]);
export const PUBLIC_PAID_PLANS = Object.freeze(SUBSCRIPTION_OPTIONS.filter(plan=>plan.id!=='free_trial').map(plan=>Object.freeze({
  ...plan,
  price:`RM${(plan.amountCents/100).toFixed(2)}`,
  period:plan.billingCycle==='lifetime'?'once':'/ month',
  description:plan.id==='founders_lifetime'?'Limited to the first 100 eligible subscribers. Lifetime access to MYOPS apps.':plan.selectedApps===2?'Choose any two available MYOPS apps.':'Access all available MYOPS apps.',
  featured:plan.id==='all_apps_monthly',
})));
