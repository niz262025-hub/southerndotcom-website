// Central MYOPS policy contract. Apps must enforce these limits on their server before
// trial activation is exposed. This module never grants app access or creates billing.
import { TRIAL_DURATION_MS, TRIAL_TRANSACTION_LIMIT } from '../src/subscriptionPolicy.js';
export { TRIAL_DURATION_MS, SUBSCRIPTION_OPTIONS, LIVE_TRIAL_APPS } from '../src/subscriptionPolicy.js';
const COMMON = Object.freeze({transactions:TRIAL_TRANSACTION_LIMIT,users:1,companies:1});
const POLICY = Object.freeze({
  opsfinance:Object.freeze({ ...COMMON, bankStatements:2, invoiceReceiptDocuments:5, reconciliation:'preview', profitAndLoss:'preview', balanceSheet:'preview', exportPdf:false, exportExcel:false }),
  opsflow:Object.freeze({ ...COMMON, workflows:2, automation:false, advancedApproval:false }),
  opsp:Object.freeze({ ...COMMON, projects:2, advancedReporting:false, exportPdf:false, exportExcel:false, multiUser:false }),
  opshr:Object.freeze({ ...COMMON, employees:30 }),
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
