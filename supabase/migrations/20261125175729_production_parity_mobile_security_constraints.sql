-- Staging parity repair; preserve existing production constraints.
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_authorization_codes'::regclass AND conname='mobile_code_expiry') THEN
 ALTER TABLE public.myops_mobile_authorization_codes ADD CONSTRAINT mobile_code_expiry CHECK (((expires_at > created_at) AND (expires_at <= (created_at + '00:02:00'::interval))));
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_authorization_codes'::regclass AND conname='myops_mobile_authorization_codes_client_id_check') THEN
 ALTER TABLE public.myops_mobile_authorization_codes ADD CONSTRAINT myops_mobile_authorization_codes_client_id_check CHECK ((client_id = 'myopsmobile'::text));
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_authorization_codes'::regclass AND conname='myops_mobile_authorization_codes_code_challenge_check') THEN
 ALTER TABLE public.myops_mobile_authorization_codes ADD CONSTRAINT myops_mobile_authorization_codes_code_challenge_check CHECK ((code_challenge ~ '^[A-Za-z0-9_-]{43}$'::text));
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_authorization_codes'::regclass AND conname='myops_mobile_authorization_codes_code_hash_check') THEN
 ALTER TABLE public.myops_mobile_authorization_codes ADD CONSTRAINT myops_mobile_authorization_codes_code_hash_check CHECK ((code_hash ~ '^[A-Za-z0-9_-]{43}$'::text));
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_authorization_codes'::regclass AND conname='myops_mobile_authorization_codes_login_session_id_fkey') THEN
 ALTER TABLE public.myops_mobile_authorization_codes ADD CONSTRAINT myops_mobile_authorization_codes_login_session_id_fkey FOREIGN KEY (login_session_id) REFERENCES public.myops_login_sessions(id) ON DELETE CASCADE;
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_authorization_codes'::regclass AND conname='myops_mobile_authorization_codes_redirect_uri_check') THEN
 ALTER TABLE public.myops_mobile_authorization_codes ADD CONSTRAINT myops_mobile_authorization_codes_redirect_uri_check CHECK ((redirect_uri = 'myops://auth/callback'::text));
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_authorization_codes'::regclass AND conname='myops_mobile_authorization_codes_user_id_fkey') THEN
 ALTER TABLE public.myops_mobile_authorization_codes ADD CONSTRAINT myops_mobile_authorization_codes_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_sessions'::regclass AND conname='mobile_token_lifetime') THEN
 ALTER TABLE public.myops_mobile_sessions ADD CONSTRAINT mobile_token_lifetime CHECK (((access_expires_at > created_at) AND (refresh_expires_at > access_expires_at)));
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_sessions'::regclass AND conname='myops_mobile_sessions_access_token_hash_check') THEN
 ALTER TABLE public.myops_mobile_sessions ADD CONSTRAINT myops_mobile_sessions_access_token_hash_check CHECK ((access_token_hash ~ '^[A-Za-z0-9_-]{43}$'::text));
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_sessions'::regclass AND conname='myops_mobile_sessions_login_session_id_fkey') THEN
 ALTER TABLE public.myops_mobile_sessions ADD CONSTRAINT myops_mobile_sessions_login_session_id_fkey FOREIGN KEY (login_session_id) REFERENCES public.myops_login_sessions(id) ON DELETE CASCADE;
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_sessions'::regclass AND conname='myops_mobile_sessions_refresh_token_hash_check') THEN
 ALTER TABLE public.myops_mobile_sessions ADD CONSTRAINT myops_mobile_sessions_refresh_token_hash_check CHECK ((refresh_token_hash ~ '^[A-Za-z0-9_-]{43}$'::text));
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_sessions'::regclass AND conname='myops_mobile_sessions_user_id_fkey') THEN
 ALTER TABLE public.myops_mobile_sessions ADD CONSTRAINT myops_mobile_sessions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_used_refresh'::regclass AND conname='myops_mobile_used_refresh_mobile_session_id_fkey') THEN
 ALTER TABLE public.myops_mobile_used_refresh ADD CONSTRAINT myops_mobile_used_refresh_mobile_session_id_fkey FOREIGN KEY (mobile_session_id) REFERENCES public.myops_mobile_sessions(id) ON DELETE CASCADE;
 END IF;
END $$;
DO $$ BEGIN
 IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='public.myops_mobile_used_refresh'::regclass AND conname='myops_mobile_used_refresh_refresh_token_hash_check') THEN
 ALTER TABLE public.myops_mobile_used_refresh ADD CONSTRAINT myops_mobile_used_refresh_refresh_token_hash_check CHECK ((refresh_token_hash ~ '^[A-Za-z0-9_-]{43}$'::text));
 END IF;
END $$;