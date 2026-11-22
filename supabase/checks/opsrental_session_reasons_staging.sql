-- Run only against the verified isolated staging project. All fixtures are rolled back.
begin;
do $test$
declare
  v_user uuid;
  v_login uuid;
  v_app uuid;
  v_case record;
  v_result jsonb;
  v_before integer;
  v_after integer;
begin
  select user_id into strict v_user from public.myops_opsrental_uat_allowlist
    where organization_id = (select id from public.myops_organizations where name='OpsRental UAT A');
  for v_case in select * from (values
    ('parent_idle','1 hour','16 minutes','1 hour','1 minute',null,'idle_expired','idle_expired'),
    ('app_idle','1 hour','1 minute','1 hour','16 minutes',null,'idle_expired','idle_expired'),
    ('parent_absolute','13 hours','1 minute','1 hour','16 minutes',null,'absolute_expired','absolute_expired'),
    ('app_absolute','1 hour','1 minute','13 hours','1 minute',null,'absolute_expired','absolute_expired'),
    ('explicit_logout','13 hours','16 minutes','13 hours','16 minutes','logout','myops_logout','logout'),
    ('admin_revocation','13 hours','16 minutes','13 hours','16 minutes','admin','admin_revoked','entitlement_revoked'),
    ('active_touch','1 hour','1 minute','1 hour','1 minute',null,null,null)
  ) c(label,login_age,login_idle,app_age,app_idle,parent_end,expected_end,expected_audit)
  loop
    v_login := gen_random_uuid();
    v_app := gen_random_uuid();
    insert into public.myops_login_sessions(id,user_id,created_at,last_activity_at,revoked_at,ended_reason)
    values (v_login,v_user,now()-v_case.login_age::interval,now()-v_case.login_idle::interval,
      case when v_case.parent_end is not null then now() end,v_case.parent_end);
    insert into public.myops_app_sessions(id,user_id,app_id,product_slug,login_session_id,created_at,last_activity_at)
    values (v_app,v_user,'opsrental','opsrental',v_login,now()-v_case.app_age::interval,now()-v_case.app_idle::interval);
    select count(*) into v_before from public.myops_app_audit
      where app_id='opsrental' and event='session_revoked' and reason_code=v_case.expected_audit;
    v_result := public.myops_validate_app_session(v_app,'opsrental','opsrental',v_case.expected_end is null);
    if v_case.expected_end is null then
      if v_result->>'active' is distinct from 'true'
        or not exists(select 1 from public.myops_app_sessions where id=v_app and last_activity_at=now() and created_at=now()-v_case.app_age::interval)
        or not exists(select 1 from public.myops_login_sessions where id=v_login and last_activity_at=now())
      then raise exception 'Regression failed: %',v_case.label; end if;
    else
      select count(*) into v_after from public.myops_app_audit
        where app_id='opsrental' and event='session_revoked' and reason_code=v_case.expected_audit;
      if v_result->>'active' is distinct from 'false' or v_after <> v_before+1
        or not exists(select 1 from public.myops_app_sessions where id=v_app and revoked_at is not null and ended_reason=v_case.expected_end)
      then raise exception 'Regression failed: %',v_case.label; end if;
    end if;
  end loop;
end $test$;
select '7 isolated session reason and renewal cases passed' as result;
rollback;
