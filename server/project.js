// Server-owned allowlist. Never derive project selection from headers or request bodies.
export const PRODUCTION_PROJECT = 'https://uhuukcztdifvpjuopdea.supabase.co';
export const STAGING_PROJECT = 'https://wengxxiqwtosirealghx.supabase.co';
export function projectForEnvironment(env) {
  return env.VERCEL_ENV === 'preview' && env.MYOPS_ENVIRONMENT === 'staging'
    && env.MYOPS_USE_ISOLATED_STAGING === 'true' ? STAGING_PROJECT : PRODUCTION_PROJECT;
}
