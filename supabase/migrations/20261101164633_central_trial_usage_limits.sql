-- Staging foundation: no trial activation, app grant, billing or client quota writes.
BEGIN;
CREATE TABLE public.myops_trial_usage (
 trial_id uuid NOT NULL REFERENCES public.myops_trials(id),
 app_id text NOT NULL CHECK(app_id IN ('opsfinance','opsflow','opsp')),
 feature text NOT NULL,
 operation_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(trial_id,app_id,feature,operation_id),
 CHECK ((app_id='opsfinance' AND feature IN ('transactions','bank_statements','invoice_receipt_documents'))
  OR (app_id='opsflow' AND feature IN ('transactions','workflows'))
  OR (app_id='opsp' AND feature IN ('transactions','projects')))
);
ALTER TABLE public.myops_trial_usage ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.myops_trial_usage FROM PUBLIC,anon,authenticated,service_role;
GRANT SELECT,INSERT ON public.myops_trial_usage TO service_role;
CREATE FUNCTION public.myops_consume_trial_quota(p_user_id uuid,p_login_session_id uuid,p_app_id text,p_feature text,p_operation_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path=public,pg_temp AS $$
DECLARE t public.myops_trials%rowtype; v_limit integer; v_used integer;
BEGIN
 IF p_operation_id IS NULL OR p_user_id IS NULL OR NOT public.myops_login_live(p_login_session_id,p_user_id) THEN
  RAISE EXCEPTION 'Active verified MYOPS login and operation required' USING ERRCODE='42501';
 END IF;
 v_limit := CASE
  WHEN p_app_id IN ('opsfinance','opsflow','opsp') AND p_feature='transactions' THEN 30
  WHEN p_app_id='opsfinance' AND p_feature='bank_statements' THEN 2
  WHEN p_app_id='opsfinance' AND p_feature='invoice_receipt_documents' THEN 5
  WHEN p_app_id='opsflow' AND p_feature='workflows' THEN 2
  WHEN p_app_id='opsp' AND p_feature='projects' THEN 2
  ELSE NULL END;
 IF v_limit IS NULL THEN RETURN jsonb_build_object('allowed',false,'reason','premium_or_unavailable'); END IF;
 -- Serialize all quota checks for a trial; concurrent calls cannot overspend.
 SELECT * INTO t FROM public.myops_trials WHERE user_id=p_user_id FOR UPDATE;
 IF NOT FOUND OR t.status<>'active' OR t.started_at>now() OR t.expires_at<=now() THEN
  RETURN jsonb_build_object('allowed',false,'reason','trial_inactive');
 END IF;
 IF t.organization_id IS NOT NULL AND (
  NOT EXISTS(SELECT 1 FROM public.myops_organizations WHERE id=t.organization_id AND owner_user_id=p_user_id)
  OR NOT EXISTS(SELECT 1 FROM public.myops_memberships WHERE organization_id=t.organization_id AND user_id=p_user_id AND role='admin' AND status='active')
  OR (SELECT count(*) FROM public.myops_memberships WHERE organization_id=t.organization_id AND status='active')<>1
 ) THEN RETURN jsonb_build_object('allowed',false,'reason','trial_membership_changed'); END IF;
 SELECT count(*) INTO v_used FROM public.myops_trial_usage WHERE trial_id=t.id AND app_id=p_app_id AND feature=p_feature;
 -- Retrying one server-owned operation never consumes a second unit.
 IF EXISTS(SELECT 1 FROM public.myops_trial_usage WHERE trial_id=t.id AND app_id=p_app_id AND feature=p_feature AND operation_id=p_operation_id) THEN
  RETURN jsonb_build_object('allowed',true,'replayed',true,'used',v_used,'limit',v_limit);
 END IF;
 IF v_used>=v_limit THEN RETURN jsonb_build_object('allowed',false,'reason','trial_limit_reached','used',v_used,'limit',v_limit); END IF;
 INSERT INTO public.myops_trial_usage(trial_id,app_id,feature,operation_id) VALUES(t.id,p_app_id,p_feature,p_operation_id);
 RETURN jsonb_build_object('allowed',true,'replayed',false,'used',v_used+1,'limit',v_limit);
END; $$;
REVOKE ALL ON FUNCTION public.myops_consume_trial_quota(uuid,uuid,text,text,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.myops_consume_trial_quota(uuid,uuid,text,text,uuid) TO service_role;
COMMIT;
