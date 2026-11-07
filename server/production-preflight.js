import { PRODUCTION_PROJECT } from './project.js';
import { serverServiceKey } from './service-key.js';

// Checks configuration only. Never return credential values or certify live UAT.
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
  let destinationValid = false;
  try {
    const destination = new URL(env.MYOPS_APP_URL_OPSFINANCE);
    destinationValid = destination.origin === 'https://app.myops.com.my'
      && destination.pathname === '/' && !destination.search && !destination.hash
      && !destination.username && !destination.password;
  } catch { /* Missing/malformed destination fails closed. */ }
  if (!destinationValid) errors.push('MYOPS_APP_URL_OPSFINANCE');
  return { enabled: true, errors };
}
