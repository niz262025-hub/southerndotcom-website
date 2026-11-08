// Server-owned allowlist. Never derive project selection from headers or request bodies.
export const PRODUCTION_PROJECT = 'https://uhuukcztdifvpjuopdea.supabase.co';
export const STAGING_PROJECT = 'https://wengxxiqwtosirealghx.supabase.co';

export function flagEnabled(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  return false;
}

export function projectForEnvironment(env = {}) {
  if (env.VERCEL_ENV === 'production') return PRODUCTION_PROJECT;
  if (env.VERCEL_ENV === 'preview' && env.MYOPS_ENVIRONMENT === 'staging'
      && flagEnabled(env.MYOPS_USE_ISOLATED_STAGING)) return STAGING_PROJECT;
  // An incomplete or unknown deployment must never select production.
  return null;
}

// Reject unsafe build configuration before Vite can publish public environment values.
// Missing preview credentials may produce a static preview; handlers stay disabled.
export function previewIsolationErrors(env = {}) {
  const errors = [];
  const nonProduction = env.VERCEL_ENV !== 'production';
  if (nonProduction && env.VITE_SUPABASE_URL && (projectForEnvironment(env) !== STAGING_PROJECT
      || env.VITE_SUPABASE_URL !== STAGING_PROJECT)) errors.push('VITE_SUPABASE_URL');
  for (const key of ['TOYYIBPAY_LIVE_SECRET_KEY', 'TOYYIBPAY_LIVE_CATEGORY_CODE']) {
    if (nonProduction && env[key]) errors.push(key);
  }
  for (const key of Object.keys(env)) {
    if (!/^(VITE_|NEXT_PUBLIC_)/.test(key) || !env[key]) continue;
    let privilegedJwt = false;
    try { privilegedJwt = JSON.parse(Buffer.from(String(env[key]).split('.')[1], 'base64url').toString()).role === 'service_role'; } catch { /* Not a JWT. */ }
    if (/(SECRET|SERVICE_ROLE|PRIVATE_KEY)/i.test(key) || String(env[key]).startsWith('sb_secret_') || privilegedJwt) errors.push(key);
  }
  return errors;
}
