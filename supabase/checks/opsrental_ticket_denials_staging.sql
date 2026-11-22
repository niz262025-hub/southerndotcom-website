-- Isolated staging only. Synthetic hashes never become launchable browser tickets.
begin;
do $test$
declare
  v_user uuid;
  v_login uuid := gen_random_uuid();
  v_case record;
  v_hash text;
  v_result jsonb;
  v_before public.myops_app_tickets%rowtype;
  v_after public.myops_app_tickets%rowtype;
begin
  select a.user_id into strict v_user
  from public.myops_opsrental_uat_allowlist a
  join public.myops_organizations o on o.id = a.organization_id
  where o.name = 'OpsRental UAT A';

  insert into public.myops_login_sessions(id,user_id,created_at,last_activity_at)
  values (v_login,v_user,now(),now());

  for v_case in select * from (values
    ('used', now(), now()+interval '60 seconds', now(), null::timestamptz),
    ('expired', now()-interval '61 seconds', now()-interval '1 second', null, null),
    ('revoked', now(), now()+interval '60 seconds', null, now())
  ) cases(label, issued, expires, used, revoked)
  loop
    v_hash := replace(gen_random_uuid()::text,'-','') || replace(gen_random_uuid()::text,'-','');
    insert into public.myops_app_tickets(ticket_hash,user_id,product_slug,created_at,expires_at,login_session_id,used_at,revoked_at)
    values (v_hash,v_user,'opsrental',v_case.issued,v_case.expires,v_login,v_case.used,v_case.revoked)
    returning * into v_before;

    v_result := public.myops_redeem_app_ticket('opsrental',v_hash);
    select * into strict v_after from public.myops_app_tickets where ticket_hash=v_hash;
    if v_result is distinct from jsonb_build_object('status','denied')
       or v_after is distinct from v_before
       or exists (select 1 from public.myops_app_sessions where login_session_id=v_login) then
      raise exception 'Ticket denial regression: %', v_case.label;
    end if;
  end loop;
end $test$;
select '3 synthetic ticket denials passed with no ticket changes or app sessions' as result;
rollback;
