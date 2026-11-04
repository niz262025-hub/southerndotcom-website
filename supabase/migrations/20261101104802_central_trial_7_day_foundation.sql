-- Central MYOPS staging foundation only. No app grant, billing or payment is created.
-- Activation is not exposed until application-side server limits are certified.
BEGIN;
CREATE TABLE public.myops_trials (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id),
 organization_id uuid UNIQUE REFERENCES public.myops_organizations(id),
 started_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL,
 status text NOT NULL DEFAULT 'active' CHECK(status IN('active','expired','upgraded')),
 policy_version integer NOT NULL DEFAULT 1 CHECK(policy_version=1),
 CHECK(expires_at=started_at+interval '168 hours')
);
ALTER TABLE public.myops_trials ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.myops_trials FROM PUBLIC,anon,authenticated;
GRANT SELECT ON public.myops_trials TO authenticated;
GRANT SELECT,INSERT,UPDATE ON public.myops_trials TO service_role;
CREATE POLICY myops_trial_self_read ON public.myops_trials FOR SELECT TO authenticated USING(user_id=(SELECT auth.uid()));
CREATE FUNCTION public.myops_trial_immutable() RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
BEGIN
 IF ROW(NEW.id,NEW.user_id,NEW.organization_id,NEW.started_at,NEW.expires_at,NEW.policy_version)
 IS DISTINCT FROM ROW(OLD.id,OLD.user_id,OLD.organization_id,OLD.started_at,OLD.expires_at,OLD.policy_version)
 OR (OLD.status='upgraded' AND NEW.status<>'upgraded')
 OR (OLD.status='expired' AND NEW.status='active') THEN RAISE EXCEPTION 'Trial identity, duration and terminal state are immutable'; END IF;
 RETURN NEW;
END; $$;
REVOKE ALL ON FUNCTION public.myops_trial_immutable() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER myops_trial_immutable BEFORE UPDATE ON public.myops_trials FOR EACH ROW EXECUTE FUNCTION public.myops_trial_immutable();
CREATE FUNCTION public.myops_trial_state(p_user_id uuid) RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE t public.myops_trials%rowtype;
BEGIN
 SELECT * INTO t FROM public.myops_trials WHERE user_id=p_user_id;
 IF NOT FOUND THEN RETURN jsonb_build_object('status','not_started'); END IF;
 RETURN jsonb_build_object('id',t.id,'status',CASE WHEN t.status='upgraded' THEN 'upgraded' WHEN t.status='expired' OR t.expires_at<=now() THEN 'expired' ELSE 'active' END,
 'started_at',t.started_at,'expires_at',t.expires_at,'policy_version',t.policy_version,'amount_cents',0,'auto_renew',false,'card_required',false,'users',1,'companies',1);
END; $$;
CREATE FUNCTION public.myops_start_trial(p_user_id uuid,p_login_session_id uuid,p_organization_id uuid DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE t public.myops_trials%rowtype; v_started timestamptz;
BEGIN
 -- Reuse the existing verified central login and passive 15-minute / 12-hour checks.
 IF p_user_id IS NULL OR NOT public.myops_login_live(p_login_session_id,p_user_id) THEN RAISE EXCEPTION 'Active verified MYOPS login required' USING ERRCODE='42501'; END IF;
 PERFORM pg_advisory_xact_lock(hashtextextended('myops_trial:'||p_user_id::text,0));
 SELECT * INTO t FROM public.myops_trials WHERE user_id=p_user_id;
 IF FOUND THEN RETURN public.myops_trial_state(p_user_id); END IF;
 IF NOT EXISTS(SELECT 1 FROM public.myops_profiles WHERE user_id=p_user_id) THEN RAISE EXCEPTION 'Server-owned profile required'; END IF;
 IF p_organization_id IS NOT NULL THEN
   PERFORM id FROM public.myops_organizations WHERE id=p_organization_id AND owner_user_id=p_user_id FOR UPDATE;
   IF NOT FOUND OR NOT EXISTS(SELECT 1 FROM public.myops_memberships WHERE organization_id=p_organization_id AND user_id=p_user_id AND status='active' AND role='admin')
   OR (SELECT count(*) FROM public.myops_memberships WHERE organization_id=p_organization_id AND status='active')<>1 THEN RAISE EXCEPTION 'Trial requires one authorized user in one company'; END IF;
   IF EXISTS(SELECT 1 FROM public.myops_trials WHERE organization_id=p_organization_id) THEN RAISE EXCEPTION 'Company trial already used'; END IF;
 END IF;
 IF EXISTS(SELECT 1 FROM public.myops_subscriptions WHERE status='active' AND (current_period_end IS NULL OR current_period_end>now()) AND (personal_user_id=p_user_id OR (p_organization_id IS NOT NULL AND organization_id=p_organization_id)))
 OR EXISTS(SELECT 1 FROM public.myops_lifetime_entitlements WHERE user_id=p_user_id AND status='active') THEN RAISE EXCEPTION 'Existing paid access is preserved; trial is not eligible'; END IF;
 v_started:=clock_timestamp();
 INSERT INTO public.myops_trials(user_id,organization_id,started_at,expires_at) VALUES(p_user_id,p_organization_id,v_started,v_started+interval '168 hours');
 RETURN public.myops_trial_state(p_user_id);
END; $$;
REVOKE ALL ON FUNCTION public.myops_trial_state(uuid),public.myops_start_trial(uuid,uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.myops_trial_state(uuid),public.myops_start_trial(uuid,uuid,uuid) TO service_role;
COMMIT;
