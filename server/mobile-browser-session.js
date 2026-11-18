import { createClient } from '@supabase/supabase-js';
import { verifiedLogin } from './auth.js';
import { createAppAccess } from './app-access.js';
import { projectForEnvironment } from './project.js';

// Read-only bridge to the existing MYOPS web session. A signed cookie is NOT
// sufficient authentication: Supabase must verify the access JWT as well.
export async function verifyMobileBrowserSession(req, { env = process.env, clientFactory = createClient, appAccessFactory = createAppAccess, now = Date.now } = {}) {
  const expectedOrigin = env.VERCEL_ENV === 'production'
    ? 'https://www.myops.com.my'
    : env.VERCEL_ENV === 'preview' && env.VERCEL_BRANCH_URL
      ? 'https://' + env.VERCEL_BRANCH_URL : null;
  if (!expectedOrigin || req.headers.host !== new URL(expectedOrigin).host) return null;
  const cookies = Object.fromEntries(String(req.headers.cookie || '').split(';').map(v => {
    const i = v.indexOf('=');
    return i < 0 ? ['', ''] : [v.slice(0, i).trim(), v.slice(i + 1)];
  }));
  const secret = env.MYOPS_SESSION_SECRET;
  if (typeof secret !== 'string' || secret.length < 32) return null;
  const login = verifiedLogin(secret, cookies['__Host-myops-login'], now());
  const token = cookies['__Host-myops-access'];
  if (!login || !token || token.length > 3500) return null;
  const url = projectForEnvironment(env);
  const key = env.VITE_SUPABASE_PUBLISHABLE_KEY;
  if (!url || !key) return null;
  try {
    const client = clientFactory(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data?.user?.email_confirmed_at || data.user.id !== login.userId) return null;
    const appAccess = appAccessFactory({ env, now });
    const live = await appAccess.loginLive(login.userId, login.loginSessionId);
    if (live !== true) return null;
    return { userId: login.userId, loginSessionId: login.loginSessionId, verifiedJwt: true, durableLoginVerified: true };
  } catch { return null; }
}
