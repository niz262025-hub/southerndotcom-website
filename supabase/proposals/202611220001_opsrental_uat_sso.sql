-- Apply only to the isolated MYOPS staging database.
-- Grant revocation deletes the grant row (the grant table has no revoked_at column).
create or replace function public.myops_opsrental_uat_membership(p_user_id uuid)
returns jsonb language sql stable security invoker set search_path = '' as $$
  select case when count(*) = 1 then (jsonb_agg(jsonb_build_object(
    'organization_id', m.organization_id, 'role', m.role))->0) end
  from public.myops_memberships m
  join public.myops_app_grants g using (organization_id, user_id)
  join public.myops_products p on p.slug = g.product_slug
  where m.user_id = p_user_id and m.status = 'active'
    and g.product_slug = 'opsrental' and p.launch_status = 'live';
$$;
revoke all on function public.myops_opsrental_uat_membership(uuid) from public, anon, authenticated;
grant execute on function public.myops_opsrental_uat_membership(uuid) to service_role;

CREATE OR REPLACE FUNCTION public.myops_issue_app_ticket(p_user_id uuid, p_product_slug text, p_ticket_hash text, p_login_session_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
begin
  if p_ticket_hash !~ '^[a-f0-9]{64}$' then
    raise exception 'invalid ticket hash' using errcode = '22023';
  end if;
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));
  if p_login_session_id is null or not public.myops_login_live(p_login_session_id, p_user_id) then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if not exists (
    select 1 from public.myops_app_clients c
    join public.myops_products p on p.slug = c.product_slug
    where c.product_slug = p_product_slug and c.enabled and p.launch_status = 'live'
  ) then
    return jsonb_build_object('status', 'unavailable');
  end if;
  if p_product_slug = 'opsrental' and public.myops_opsrental_uat_membership(p_user_id) is null then
    return jsonb_build_object('status', 'unavailable');
  end if;
  insert into public.myops_app_tickets (ticket_hash, user_id, product_slug, expires_at, login_session_id)
  values (p_ticket_hash, p_user_id, p_product_slug, now() + interval '60 seconds', p_login_session_id);
  insert into public.myops_app_audit (app_id, event, reason_code)
  select c.app_id, 'ticket_issued', 'issued' from public.myops_app_clients c where c.product_slug = p_product_slug;
  return jsonb_build_object('status', 'issued');
end $function$;
