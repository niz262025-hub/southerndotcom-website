# MYOPS Native Authorization Code — staging implementation gate

The authorize and token routes intentionally return HTTP 503 until the durable
backend and central identity binding are implemented. They are not production SSO.

Requirements before activation:
1. Authenticate the browser with the existing server/auth.js verified session and
   server-side login-session revocation checks, never by trusting userId from input.
2. Require exact client ID, redirect URI and PKCE S256 challenge. Bind state and
   authenticated user to a 60-second authorization code; do not expose session tokens
   or personal data in redirect parameters.
3. Use a durable Supabase table and an atomic SECURITY DEFINER redemption function
   that checks expiry, unused status, client and redirect, then consumes exactly once.
   Apply least-privilege grants, audited RLS, per-client rate limits and cleanup.
4. Issue independently scoped mobile credentials with hashed, rotating refresh tokens,
   reuse detection, expiry, revocation and logout. Never return the browser's cookies.
5. Verify signed-in user, active membership and entitlements for every mobile API call.
6. Test invalid redirect, bad PKCE, state mismatch, replay, expiry, concurrent exchange,
   logout, suspended tenant, role changes, cross-tenant and lost-device revocation.
7. Deploy staging and complete real-device UAT before production.

No migration, live session, token or production configuration was changed here.
