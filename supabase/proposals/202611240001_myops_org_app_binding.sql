-- Apply after the durable MYOPS login-session schema in the staging project.
-- Legacy RPCs stay available while application integrations are migrated.
begin;
alter table public.myops_app_tickets
  add column if not exists organization_id uuid references public.myops_organizations(id) on delete cascade;
alter table public.myops_app_sessions
  add column if not exists organization_id uuid references public.myops_organizations(id) on delete cascade;

create or replace function public.myops_issue_org_app_ticket(p_user_id uuid, p_product_slug text, p_ticket_hash text, p_login_session_id uuid, p_organization_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
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
  if p_organization_id is null or not exists (
    select 1 from public.myops_memberships m
    where m.user_id = p_user_id and m.organization_id = p_organization_id and m.status = 'active'
  ) then
    return jsonb_build_object('status', 'denied');
  end if;
  insert into public.myops_app_tickets (ticket_hash, user_id, product_slug, expires_at, login_session_id, organization_id)
  values (p_ticket_hash, p_user_id, p_product_slug, now() + interval '60 seconds', p_login_session_id, p_organization_id);
  insert into public.myops_app_audit (app_id, event, reason_code)
  select c.app_id, 'ticket_issued', 'issued' from public.myops_app_clients c where c.product_slug = p_product_slug;
  return jsonb_build_object('status', 'issued');
end $$;

create or replace function public.myops_redeem_org_app_ticket(p_app_id text, p_ticket_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_client public.myops_app_clients; v_ticket public.myops_app_tickets; v_session uuid;
begin
  select * into v_client from public.myops_app_clients where app_id = p_app_id and enabled;
  if not found then return jsonb_build_object('status', 'denied'); end if;
  select * into v_ticket from public.myops_app_tickets
    where ticket_hash = p_ticket_hash for update;
  if not found or v_ticket.used_at is not null or v_ticket.revoked_at is not null
     or v_ticket.expires_at <= now() or v_ticket.product_slug <> v_client.product_slug then
    return jsonb_build_object('status', 'denied');
  end if;
  if not exists (
       select 1 from public.myops_memberships m
       where m.user_id = v_ticket.user_id and m.organization_id = v_ticket.organization_id and m.status = 'active'
     )
     or v_ticket.login_session_id is null
     or not public.myops_login_live(v_ticket.login_session_id, v_ticket.user_id) then
    update public.myops_app_tickets set revoked_at = now() where ticket_hash = p_ticket_hash;
    return jsonb_build_object('status', 'denied');
  end if;
  update public.myops_app_tickets set used_at = now() where ticket_hash = p_ticket_hash;
  insert into public.myops_app_sessions (user_id, app_id, product_slug, login_session_id, organization_id)
    values (v_ticket.user_id, v_client.app_id, v_client.product_slug, v_ticket.login_session_id, v_ticket.organization_id)
    returning id into v_session;
  insert into public.myops_app_audit (app_id, event, reason_code)
    values (v_client.app_id, 'ticket_redeemed', 'redeemed');
  return jsonb_build_object('status', 'redeemed', 'user_id', v_ticket.user_id,
    'session_id', v_session, 'organization_id', v_ticket.organization_id, 'product_slug', v_ticket.product_slug);
end $$;

CREATE OR REPLACE FUNCTION public.myops_validate_org_app_session(p_session_id uuid, p_app_id text, p_product_slug text, p_touch boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session public.myops_app_sessions;
  v_login public.myops_login_sessions;
  v_reason text;
begin
  -- Match central logout's lock order: login first, app second.
  select l.* into v_login from public.myops_login_sessions l
    where l.id = (select s.login_session_id from public.myops_app_sessions s
      where s.id=p_session_id and s.app_id=p_app_id and s.product_slug=p_product_slug)
    for update;
  select * into v_session from public.myops_app_sessions
    where id = p_session_id and app_id = p_app_id and product_slug = p_product_slug for update;
  if not found or v_session.revoked_at is not null then
    return jsonb_build_object('active', false);
  end if;
  if v_login.id is null or v_login.user_id is distinct from v_session.user_id then
    v_reason := 'myops_logout';
  elsif v_login.revoked_at is not null then
    -- A recorded parent revocation takes precedence over elapsed time.
    v_reason := case v_login.ended_reason
      when 'admin' then 'admin_revoked'
      when 'absolute' then 'absolute_expired'
      when 'inactivity' then 'idle_expired'
      else 'myops_logout'
    end;
  elsif v_session.created_at <= now() - interval '12 hours'
     or v_login.created_at <= now() - interval '12 hours' then
    v_reason := 'absolute_expired';
  elsif v_session.last_activity_at <= now() - interval '15 minutes'
     or v_login.last_activity_at <= now() - interval '15 minutes' then
    v_reason := 'idle_expired';
  end if;
  if v_reason is not null then
    update public.myops_app_sessions set revoked_at = now(), ended_reason = v_reason where id = p_session_id;
    insert into public.myops_app_audit (app_id, event, reason_code)
      values (p_app_id, 'session_revoked',
        case v_reason when 'myops_logout' then 'logout'
          when 'admin_revoked' then 'entitlement_revoked' else v_reason end);
    return jsonb_build_object('active', false);
  end if;
  if not exists (
    select 1 from public.myops_memberships m
    where m.user_id = v_session.user_id and m.organization_id = v_session.organization_id
      and m.status = 'active'
  ) then
    update public.myops_app_sessions set revoked_at = now(), ended_reason = 'entitlement_denied'
      where id = p_session_id;
    return jsonb_build_object('active', false);
  end if;
  if coalesce(p_touch, false) then
    -- Only an already-live app/login may extend inactivity. Absolute expiry remains.
    if not public.myops_login_touch(v_session.login_session_id, v_session.user_id) then
      return jsonb_build_object('active', false);
    end if;
    update public.myops_app_sessions set last_activity_at = now() where id = p_session_id;
  end if;
  return jsonb_build_object('active', true, 'user_id', v_session.user_id, 'organization_id', v_session.organization_id);
end $function$;

-- Keep legacy sessions usable and prevent a bound ticket or session from dropping its scope.
create or replace function public.myops_redeem_app_ticket(p_app_id text, p_ticket_hash text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_client public.myops_app_clients; v_ticket public.myops_app_tickets; v_session uuid;
begin
  select * into v_client from public.myops_app_clients where app_id = p_app_id and enabled;
  if not found then return jsonb_build_object('status', 'denied'); end if;
  select * into v_ticket from public.myops_app_tickets
    where ticket_hash = p_ticket_hash for update;
  if not found or v_ticket.organization_id is not null or v_ticket.used_at is not null or v_ticket.revoked_at is not null
     or v_ticket.expires_at <= now() or v_ticket.product_slug <> v_client.product_slug then
    return jsonb_build_object('status', 'denied');
  end if;
  if v_ticket.login_session_id is null
     or not public.myops_login_live(v_ticket.login_session_id, v_ticket.user_id) then
    update public.myops_app_tickets set revoked_at = now() where ticket_hash = p_ticket_hash;
    return jsonb_build_object('status', 'denied');
  end if;
  update public.myops_app_tickets set used_at = now() where ticket_hash = p_ticket_hash;
  insert into public.myops_app_sessions (user_id, app_id, product_slug, login_session_id)
    values (v_ticket.user_id, v_client.app_id, v_client.product_slug, v_ticket.login_session_id)
    returning id into v_session;
  insert into public.myops_app_audit (app_id, event, reason_code)
    values (v_client.app_id, 'ticket_redeemed', 'redeemed');
  return jsonb_build_object('status', 'redeemed', 'user_id', v_ticket.user_id,
    'session_id', v_session, 'product_slug', v_ticket.product_slug);
end $$;

CREATE OR REPLACE FUNCTION public.myops_validate_app_session(p_session_id uuid, p_app_id text, p_product_slug text, p_touch boolean DEFAULT false)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO ''
AS $function$
declare
  v_session public.myops_app_sessions;
  v_login public.myops_login_sessions;
  v_reason text;
begin
  -- Match central logout's lock order: login first, app second.
  select l.* into v_login from public.myops_login_sessions l
    where l.id = (select s.login_session_id from public.myops_app_sessions s
      where s.id=p_session_id and s.app_id=p_app_id and s.product_slug=p_product_slug)
    for update;
  select * into v_session from public.myops_app_sessions
    where id = p_session_id and app_id = p_app_id and product_slug = p_product_slug for update;
  if not found or v_session.organization_id is not null or v_session.revoked_at is not null then
    return jsonb_build_object('active', false);
  end if;
  if v_login.id is null or v_login.user_id is distinct from v_session.user_id then
    v_reason := 'myops_logout';
  elsif v_login.revoked_at is not null then
    -- A recorded parent revocation takes precedence over elapsed time.
    v_reason := case v_login.ended_reason
      when 'admin' then 'admin_revoked'
      when 'absolute' then 'absolute_expired'
      when 'inactivity' then 'idle_expired'
      else 'myops_logout'
    end;
  elsif v_session.created_at <= now() - interval '12 hours'
     or v_login.created_at <= now() - interval '12 hours' then
    v_reason := 'absolute_expired';
  elsif v_session.last_activity_at <= now() - interval '15 minutes'
     or v_login.last_activity_at <= now() - interval '15 minutes' then
    v_reason := 'idle_expired';
  end if;
  if v_reason is not null then
    update public.myops_app_sessions set revoked_at = now(), ended_reason = v_reason where id = p_session_id;
    insert into public.myops_app_audit (app_id, event, reason_code)
      values (p_app_id, 'session_revoked',
        case v_reason when 'myops_logout' then 'logout'
          when 'admin_revoked' then 'entitlement_revoked' else v_reason end);
    return jsonb_build_object('active', false);
  end if;
  if coalesce(p_touch, false) then
    -- Only an already-live app/login may extend inactivity. Absolute expiry remains.
    if not public.myops_login_touch(v_session.login_session_id, v_session.user_id) then
      return jsonb_build_object('active', false);
    end if;
    update public.myops_app_sessions set last_activity_at = now() where id = p_session_id;
  end if;
  return jsonb_build_object('active', true, 'user_id', v_session.user_id);
end $function$;

revoke all on function public.myops_issue_org_app_ticket(uuid,text,text,uuid,uuid),
  public.myops_redeem_org_app_ticket(text,text), public.myops_validate_org_app_session(uuid,text,text,boolean)
  from public, anon, authenticated;
grant execute on function public.myops_issue_org_app_ticket(uuid,text,text,uuid,uuid),
  public.myops_redeem_org_app_ticket(text,text), public.myops_validate_org_app_session(uuid,text,text,boolean)
  to service_role;
commit;
