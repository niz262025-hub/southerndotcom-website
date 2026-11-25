-- MYOPS Mobile SSO staging migration
-- Matches production RPC signatures; backend-only tables and RPCs.
BEGIN;
CREATE TABLE IF NOT EXISTS public.myops_mobile_authorization_codes (
 code_hash text PRIMARY KEY, user_id uuid NOT NULL, login_session_id uuid NOT NULL,
 client_id text NOT NULL, redirect_uri text NOT NULL, code_challenge text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '1 minute'),
 consumed_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.myops_mobile_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(), user_id uuid NOT NULL,
 login_session_id uuid NOT NULL, access_token_hash text NOT NULL UNIQUE,
 refresh_token_hash text NOT NULL UNIQUE, created_at timestamptz NOT NULL DEFAULT now(),
 access_expires_at timestamptz NOT NULL, refresh_expires_at timestamptz NOT NULL,
 revoked_at timestamptz
);
CREATE TABLE IF NOT EXISTS public.myops_mobile_used_refresh (
 refresh_token_hash text PRIMARY KEY, mobile_session_id uuid NOT NULL,
 used_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS myops_mobile_code_expiry_idx ON public.myops_mobile_authorization_codes(expires_at);
CREATE INDEX IF NOT EXISTS myops_mobile_sessions_user_idx ON public.myops_mobile_sessions(user_id);
CREATE INDEX IF NOT EXISTS mobile_used_refresh_session_idx ON public.myops_mobile_used_refresh(mobile_session_id);
ALTER TABLE public.myops_mobile_authorization_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.myops_mobile_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.myops_mobile_used_refresh ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.myops_mobile_authorization_codes, public.myops_mobile_sessions, public.myops_mobile_used_refresh FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,UPDATE,DELETE ON public.myops_mobile_authorization_codes, public.myops_mobile_sessions, public.myops_mobile_used_refresh TO service_role;

COMMIT;
