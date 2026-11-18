-- MYOPS mobile native auth contract proposal.
-- NOT EXECUTED.
-- STAGING REVIEW REQUIRED.
-- DO NOT APPLY TO PRODUCTION.
-- This proposal is server-side only. It deliberately does not grant browser or client app access.

begin;

create extension if not exists pgcrypto;

create table if not exists public.myops_mobile_authorization_codes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (client_id = 'myops-mobile'),
  redirect_uri text not null,
  code_hash text not null unique,
  code_challenge text not null,
  code_challenge_method text not null default 'S256' check (code_challenge_method = 'S256'),
  state text not null,
  nonce text not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_by_session_id uuid,
  constraint myops_mobile_auth_code_hash_valid check (code_hash ~ '^[a-f0-9]{64}$')
);

create table if not exists public.myops_mobile_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (client_id = 'myops-mobile'),
  created_at timestamptz not null default now(),
  last_accessed_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  ended_reason text check (ended_reason in ('logout','replay','expired','revoked','admin')),
  access_token_hash text,
  session_family_id uuid not null default gen_random_uuid()
);

create table if not exists public.myops_mobile_refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.myops_mobile_sessions(id) on delete cascade,
  family_id uuid not null,
  user_id uuid not null references auth.users(id) on delete cascade,
  client_id text not null check (client_id = 'myops-mobile'),
  refresh_token_hash text not null unique,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days'),
  revoked_at timestamptz,
  replaced_by_hash text,
  last_used_at timestamptz,
  replayed_at timestamptz,
  constraint myops_mobile_refresh_token_hash_valid check (refresh_token_hash ~ '^[a-f0-9]{64}$')
);

create index if not exists myops_mobile_auth_code_expiry_idx
  on public.myops_mobile_authorization_codes (expires_at, consumed_at);
create index if not exists myops_mobile_auth_code_user_idx
  on public.myops_mobile_authorization_codes (user_id, client_id, expires_at);
create index if not exists myops_mobile_sessions_user_idx
  on public.myops_mobile_sessions (user_id, revoked_at, expires_at);
create index if not exists myops_mobile_sessions_family_idx
  on public.myops_mobile_sessions (session_family_id, revoked_at);
create index if not exists myops_mobile_refresh_expiry_idx
  on public.myops_mobile_refresh_tokens (expires_at, revoked_at);
create index if not exists myops_mobile_refresh_session_idx
  on public.myops_mobile_refresh_tokens (session_id, family_id, revoked_at);

alter table public.myops_mobile_authorization_codes enable row level security;
alter table public.myops_mobile_sessions enable row level security;
alter table public.myops_mobile_refresh_tokens enable row level security;

revoke all on public.myops_mobile_authorization_codes, public.myops_mobile_sessions, public.myops_mobile_refresh_tokens from public, anon, authenticated;

grant select, insert, update, delete on public.myops_mobile_authorization_codes to service_role;
grant select, insert, update, delete on public.myops_mobile_sessions to service_role;
grant select, insert, update, delete on public.myops_mobile_refresh_tokens to service_role;

grant usage on schema public to service_role;

create or replace function public.myops_mobile_consume_authorization_code(p_code_hash text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_record public.myops_mobile_authorization_codes;
begin
  select * into v_record
    from public.myops_mobile_authorization_codes
    where code_hash = p_code_hash
    for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if v_record.consumed_at is not null or v_record.expires_at <= now() then
    return jsonb_build_object('status', 'invalid');
  end if;

  update public.myops_mobile_authorization_codes
    set consumed_at = now()
    where id = v_record.id and consumed_at is null;

  return jsonb_build_object(
    'status', 'consumed',
    'user_id', v_record.user_id,
    'client_id', v_record.client_id,
    'redirect_uri', v_record.redirect_uri,
    'code_challenge', v_record.code_challenge,
    'nonce', v_record.nonce
  );
end $$;

create or replace function public.myops_mobile_rotate_refresh_token(p_session_id uuid, p_old_hash text, p_client_id text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_old public.myops_mobile_refresh_tokens; v_new_hash text; v_family uuid;
begin
  select * into v_old
    from public.myops_mobile_refresh_tokens
    where session_id = p_session_id and refresh_token_hash = p_old_hash and revoked_at is null and expires_at > now()
    for update;

  if not found then
    return jsonb_build_object('status', 'invalid');
  end if;

  if exists (
    select 1 from public.myops_mobile_refresh_tokens
    where session_id = p_session_id and family_id = v_old.family_id and revoked_at is not null and replaced_by_hash = p_old_hash
  ) then
    update public.myops_mobile_sessions
      set revoked_at = now(), ended_reason = 'replay'
      where id = p_session_id and revoked_at is null;
    return jsonb_build_object('status', 'replay');
  end if;

  v_new_hash := encode(digest(gen_random_bytes(32), 'sha256'), 'hex');
  v_family := v_old.family_id;

  update public.myops_mobile_refresh_tokens
    set revoked_at = now(), replaced_by_hash = v_new_hash, last_used_at = now()
    where id = v_old.id and revoked_at is null;

  insert into public.myops_mobile_refresh_tokens (
    session_id, family_id, user_id, client_id, refresh_token_hash, expires_at, created_at
  ) values (
    p_session_id, v_family, v_old.user_id, p_client_id, v_new_hash, now() + interval '30 days', now()
  );

  update public.myops_mobile_sessions
    set last_accessed_at = now(), expires_at = now() + interval '30 days'
    where id = p_session_id;

  return jsonb_build_object('status', 'rotated', 'family_id', v_family, 'new_hash', v_new_hash);
end $$;

create or replace function public.myops_mobile_revoke_session_family(p_session_id uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare v_count integer;
begin
  update public.myops_mobile_sessions
    set revoked_at = now(), ended_reason = 'replay'
    where id = p_session_id and revoked_at is null;
  get diagnostics v_count = row_count;

  update public.myops_mobile_refresh_tokens
    set revoked_at = now(), replayed_at = now()
    where session_id = p_session_id and revoked_at is null;

  return v_count;
end $$;

create or replace function public.myops_mobile_cleanup_expired()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare v_codes integer; v_sessions integer; v_tokens integer;
begin
  delete from public.myops_mobile_authorization_codes
    where expires_at <= now() and consumed_at is null;
  get diagnostics v_codes = row_count;

  update public.myops_mobile_sessions
    set revoked_at = now(), ended_reason = 'expired'
    where revoked_at is null and expires_at <= now();
  get diagnostics v_sessions = row_count;

  update public.myops_mobile_refresh_tokens
    set revoked_at = now()
    where revoked_at is null and expires_at <= now();
  get diagnostics v_tokens = row_count;

  return jsonb_build_object('authorization_codes', v_codes, 'sessions', v_sessions, 'refresh_tokens', v_tokens);
end $$;

commit;
