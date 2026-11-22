import { PRODUCTION_PROJECT } from './project.js';
import { serverServiceKey } from './service-key.js';

// Checks configuration only. Never return credential values or certify live UAT.
const REQUIRED_PRODUCTION_APP_URLS = [
  ['MYOPS_APP_URL_MASTER', 'https://www.myops.com.my'],
  ['MYOPS_APP_URL_OPSFINANCE', 'https://app.myops.com.my'],
  ['MYOPS_APP_URL_OPSFLOW', 'https://opsflow.myops.com.my'],
  ['MYOPS_APP_URL_OPSP', 'https://opsps.myops.com.my'],
  ['MYOPS_APP_URL_OPSHR', 'https://opshr.myops.com.my'],
  ['MYOPS_APP_URL_OPSRENTAL', 'https://opsrental.myops.com.my'],
];

export function productionSsoPreflight(env) {
  if (env.VERCEL_ENV !== 'production' || env.MYOPS_ENABLE_PRODUCTION_APP_ACCESS !== 'true') {
    return { enabled: false, errors: [] };
  }
  const errors = [];
  if (env.MYOPS_ENVIRONMENT !== 'production') errors.push('MYOPS_ENVIRONMENT');
  if (env.MYOPS_ENABLE_PRODUCTION_AUTH !== 'true') errors.push('MYOPS_ENABLE_PRODUCTION_AUTH');
  if (env.VITE_SUPABASE_URL !== PRODUCTION_PROJECT) errors.push('VITE_SUPABASE_URL');
  if (!/^sb_publishable_[A-Za-z0-9_-]+$/.test(env.VITE_SUPABASE_PUBLISHABLE_KEY || '')) errors.push('VITE_SUPABASE_PUBLISHABLE_KEY');
  if (!serverServiceKey(env.MYOPS_SERVICE_ROLE_KEY, PRODUCTION_PROJECT)) errors.push('MYOPS_SERVICE_ROLE_KEY');
  for (const key of ['MYOPS_SESSION_SECRET', 'MYOPS_APP_USER_REF_SECRET']) {
    if (typeof env[key] !== 'string' || env[key].length < 32) errors.push(key);
  }
  for (const [key, expectedOrigin] of REQUIRED_PRODUCTION_APP_URLS) {
    let destinationValid = false;
    try {
      const destination = new URL(env[key]);
      destinationValid = destination.origin === expectedOrigin
        && destination.pathname === '/' && !destination.search && !destination.hash
        && !destination.username && !destination.password;
    } catch { /* Missing/malformed destination fails closed. */ }
    if (!destinationValid) errors.push(key);
  }
  return { enabled: true, errors };
}
