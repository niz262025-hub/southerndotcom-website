// Run locally or in CI before enabling MYOPS production app access.
// Checks presence and shape only; does not print or access secret values.
const required = ['MYOPS_SERVICE_ROLE_KEY','MYOPS_APP_USER_REF_SECRET','MYOPS_APP_URL_OPSFINANCE','MYOPS_SESSION_SECRET'];
const missing = required.filter(k => !process.env[k] || process.env[k].length < (k.endsWith('SECRET') ? 32 : 1));
const enabled = process.env.MYOPS_ENABLE_PRODUCTION_APP_ACCESS === 'true';
const prod = process.env.MYOPS_ENVIRONMENT === 'production';
let validUrl = false;
try { const u = new URL(process.env.MYOPS_APP_URL_OPSFINANCE || ''); validUrl = u.origin === 'https://app.myops.com.my' && u.pathname === '/' && !u.search && !u.hash; } catch {}
if (enabled && (!prod || missing.length || !validUrl)) {
  console.error('BLOCK: production launch configuration is incomplete. Missing keys:', missing.join(', ') || 'none'); process.exitCode = 1;
} else if (!enabled) {
  console.log('SAFE: production launch is disabled; no readiness claim.');
} else {
  console.log('Configuration presence passed. Database schema, keys and end-to-end SSO still require independent verification.');
}
