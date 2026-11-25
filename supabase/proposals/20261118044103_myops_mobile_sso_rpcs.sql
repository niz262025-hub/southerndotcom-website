-- Recorded staging RPC definitions. Apply after login-session foundation and mobile tables/constraints.
BEGIN;
CREATE OR REPLACE FUNCTION public.myops_mobile_issue_code(p_code_hash text, p_user_id uuid, p_login_session_id uuid, p_code_challenge text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_count integer;
BEGIN
 IF p_code_hash !~ '^[A-Za-z0-9_-]{43}$' OR p_code_challenge !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN false; END IF;
 INSERT INTO public.myops_mobile_authorization_codes(code_hash,user_id,login_session_id,client_id,redirect_uri,code_challenge)
 SELECT p_code_hash,l.user_id,l.id,'myopsmobile','myops://auth/callback',p_code_challenge
 FROM public.myops_login_sessions l
 WHERE l.id=p_login_session_id AND l.user_id=p_user_id AND l.revoked_at IS NULL
 AND l.created_at>now()-interval '12 hours' AND l.last_activity_at>now()-interval '15 minutes'
 ON CONFLICT DO NOTHING;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END $function$;
REVOKE ALL ON FUNCTION public.myops_mobile_issue_code(text,uuid,uuid,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.myops_mobile_issue_code(text,uuid,uuid,text) TO service_role;

CREATE OR REPLACE FUNCTION public.myops_mobile_redeem_and_issue(p_code_hash text, p_code_challenge text, p_client_id text, p_redirect_uri text, p_access_hash text, p_refresh_hash text)
 RETURNS TABLE(mobile_session_id uuid, mobile_user_id uuid, access_expires_at timestamp with time zone, refresh_expires_at timestamp with time zone)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_code record; v_session public.myops_mobile_sessions%rowtype;
BEGIN
 IF p_access_hash !~ '^[A-Za-z0-9_-]{43}$' OR p_refresh_hash !~ '^[A-Za-z0-9_-]{43}$' OR p_access_hash=p_refresh_hash THEN RETURN; END IF;
 UPDATE public.myops_mobile_authorization_codes c SET consumed_at=now()
 FROM public.myops_login_sessions l
 WHERE c.code_hash=p_code_hash AND c.code_challenge=p_code_challenge
 AND c.client_id='myopsmobile' AND p_client_id=c.client_id
 AND c.redirect_uri='myops://auth/callback' AND p_redirect_uri=c.redirect_uri
 AND c.consumed_at IS NULL AND c.expires_at>now()
 AND l.id=c.login_session_id AND l.user_id=c.user_id AND l.revoked_at IS NULL
 AND l.created_at>now()-interval '12 hours' AND l.last_activity_at>now()-interval '15 minutes'
 RETURNING c.user_id,c.login_session_id INTO v_code;
 IF NOT FOUND THEN RETURN; END IF;
 INSERT INTO public.myops_mobile_sessions(user_id,login_session_id,access_token_hash,refresh_token_hash,access_expires_at,refresh_expires_at)
 VALUES(v_code.user_id,v_code.login_session_id,p_access_hash,p_refresh_hash,now()+interval '15 minutes',now()+interval '30 days')
 RETURNING * INTO v_session;
 RETURN QUERY SELECT v_session.id,v_session.user_id,v_session.access_expires_at,v_session.refresh_expires_at;
END $function$;
REVOKE ALL ON FUNCTION public.myops_mobile_redeem_and_issue(text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.myops_mobile_redeem_and_issue(text,text,text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.myops_mobile_redeem_code(p_code_hash text, p_code_challenge text, p_client_id text, p_redirect_uri text)
 RETURNS TABLE(user_id uuid, login_session_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 WITH consumed AS (
 UPDATE public.myops_mobile_authorization_codes c SET consumed_at=now()
 FROM public.myops_login_sessions l
 WHERE c.code_hash=p_code_hash AND c.code_challenge=p_code_challenge
 AND c.client_id='myopsmobile' AND p_client_id=c.client_id
 AND c.redirect_uri='myops://auth/callback' AND p_redirect_uri=c.redirect_uri
 AND c.consumed_at IS NULL AND c.expires_at>now()
 AND l.id=c.login_session_id AND l.user_id=c.user_id AND l.revoked_at IS NULL
 AND l.created_at>now()-interval '12 hours' AND l.last_activity_at>now()-interval '15 minutes'
 RETURNING c.user_id,c.login_session_id)
 SELECT consumed.user_id,consumed.login_session_id FROM consumed
$function$;
REVOKE ALL ON FUNCTION public.myops_mobile_redeem_code(text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.myops_mobile_redeem_code(text,text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.myops_mobile_revoke_access(p_access_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_count integer;
BEGIN
 IF p_access_hash !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN false; END IF;
 UPDATE public.myops_mobile_sessions SET revoked_at=now()
 WHERE access_token_hash=p_access_hash AND revoked_at IS NULL;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END $function$;
REVOKE ALL ON FUNCTION public.myops_mobile_revoke_access(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.myops_mobile_revoke_access(text) TO service_role;

CREATE OR REPLACE FUNCTION public.myops_mobile_revoke_refresh(p_refresh_hash text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_count integer;
BEGIN
 IF p_refresh_hash !~ '^[A-Za-z0-9_-]{43}$' THEN RETURN false; END IF;
 UPDATE public.myops_mobile_sessions SET revoked_at=now()
 WHERE refresh_token_hash=p_refresh_hash AND revoked_at IS NULL;
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count=1;
END $function$;
REVOKE ALL ON FUNCTION public.myops_mobile_revoke_refresh(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.myops_mobile_revoke_refresh(text) TO service_role;

CREATE OR REPLACE FUNCTION public.myops_mobile_rotate_refresh(p_old_refresh_hash text, p_new_access_hash text, p_new_refresh_hash text)
 RETURNS TABLE(mobile_session_id uuid, mobile_user_id uuid)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
DECLARE v_session public.myops_mobile_sessions%rowtype; v_replay_session uuid;
BEGIN
 IF p_old_refresh_hash !~ '^[A-Za-z0-9_-]{43}$' OR p_new_access_hash !~ '^[A-Za-z0-9_-]{43}$'
 OR p_new_refresh_hash !~ '^[A-Za-z0-9_-]{43}$' OR p_new_access_hash=p_new_refresh_hash
 OR p_old_refresh_hash=p_new_refresh_hash THEN RETURN; END IF;
 SELECT u.mobile_session_id INTO v_replay_session FROM public.myops_mobile_used_refresh u WHERE u.refresh_token_hash=p_old_refresh_hash;
 IF FOUND THEN
 UPDATE public.myops_mobile_sessions SET revoked_at=coalesce(revoked_at,now()) WHERE id=v_replay_session;
 RETURN;
 END IF;
 UPDATE public.myops_mobile_sessions s SET access_token_hash=p_new_access_hash,refresh_token_hash=p_new_refresh_hash,
 access_expires_at=now()+interval '15 minutes'
 FROM public.myops_login_sessions l
 WHERE s.refresh_token_hash=p_old_refresh_hash AND s.revoked_at IS NULL AND s.refresh_expires_at>now()
 AND l.id=s.login_session_id AND l.user_id=s.user_id AND l.revoked_at IS NULL
 AND l.created_at>now()-interval '12 hours' AND l.last_activity_at>now()-interval '15 minutes'
 RETURNING s.* INTO v_session;
 IF NOT FOUND THEN
 SELECT u.mobile_session_id INTO v_replay_session FROM public.myops_mobile_used_refresh u WHERE u.refresh_token_hash=p_old_refresh_hash;
 IF FOUND THEN UPDATE public.myops_mobile_sessions SET revoked_at=coalesce(revoked_at,now()) WHERE id=v_replay_session; END IF;
 RETURN;
 END IF;
 INSERT INTO public.myops_mobile_used_refresh(refresh_token_hash,mobile_session_id) VALUES(p_old_refresh_hash,v_session.id);
 RETURN QUERY SELECT v_session.id,v_session.user_id;
END $function$;
REVOKE ALL ON FUNCTION public.myops_mobile_rotate_refresh(text,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.myops_mobile_rotate_refresh(text,text,text) TO service_role;

CREATE OR REPLACE FUNCTION public.myops_mobile_verify_access(p_access_hash text)
 RETURNS TABLE(mobile_session_id uuid, mobile_user_id uuid, login_session_id uuid)
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
 SELECT s.id,s.user_id,s.login_session_id FROM public.myops_mobile_sessions s
 JOIN public.myops_login_sessions l ON l.id=s.login_session_id AND l.user_id=s.user_id
 WHERE s.access_token_hash=p_access_hash AND s.revoked_at IS NULL
 AND s.access_expires_at>now() AND s.refresh_expires_at>now() AND l.revoked_at IS NULL
 AND l.created_at>now()-interval '12 hours' AND l.last_activity_at>now()-interval '15 minutes'
 LIMIT 1
$function$;
REVOKE ALL ON FUNCTION public.myops_mobile_verify_access(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.myops_mobile_verify_access(text) TO service_role;
COMMIT;
