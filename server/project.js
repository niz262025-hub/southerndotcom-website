// Server-owned allowlist. Never derive project selection from headers or request bodies.
export const PRODUCTION_PROJECT = 'https://uhuukcztdifvpjuopdea.supabase.co';
export const STAGING_PROJECT = 'https://wengxxiqwtosirealghx.supabase.co';
export function projectForEnvironment(env) {
  const nonProduction = ['preview', 'staging', 'uat'].includes(String(env.VERCEL_ENV || '').trim().toLowerCase())
    || ['preview', 'staging', 'uat'].includes(String(env.MYOPS_ENVIRONMENT || '').trim().toLowerCase())
    || String(env.MYOPS_USE_ISOLATED_STAGING || '').trim().toLowerCase() === 'true';
  if (!nonProduction) return PRODUCTION_PROJECT;
  return env.VERCEL_ENV === 'preview' && env.MYOPS_ENVIRONMENT === 'staging'
    && env.MYOPS_USE_ISOLATED_STAGING === 'true' && env.VITE_SUPABASE_URL === STAGING_PROJECT
    ? STAGING_PROJECT : null;
}
