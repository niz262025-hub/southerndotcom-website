// Server-owned allowlist. Never derive project selection from headers or request bodies.
export const PRODUCTION_PROJECT = 'https://uhuukcztdifvpjuopdea.supabase.co';
export const STAGING_PROJECT = 'https://wengxxiqwtosirealghx.supabase.co';

export function flagEnabled(value) {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return ['true', '1', 'yes', 'on'].includes(value.trim().toLowerCase());
  return false;
}

export function projectForEnvironment(env) {
  return env.VERCEL_ENV === 'preview' && env.MYOPS_ENVIRONMENT === 'staging'
    && flagEnabled(env.MYOPS_USE_ISOLATED_STAGING) ? STAGING_PROJECT : PRODUCTION_PROJECT;
}
