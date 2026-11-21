-- STAGING PROPOSAL only. Does not register clients or modify keys, products or grants.
-- This is intentionally not part of the auto-run migration set.
-- Independent project-ref verification must be completed before running it in a live staging DB;
-- the session-local guard below only prevents accidental execution in a normal local run.
do $$
declare
  allowed_ids text[] := ARRAY['opsfinance', 'opsflow', 'opsp', 'opshr', 'opsrental'];
  existing_constraint text;
  expected_constraint text := 'CHECK ((app_id = ANY (ARRAY[''opsfinance''::text, ''opsflow''::text, ''opsp''::text, ''opshr''::text, ''opsrental''::text])))';
begin
  if current_setting('myops.allow_client_staging', true) is distinct from 'wengxxiqwtosirealghx' then
    raise exception 'Explicit isolated MYOPS staging guard required. Verify the target Supabase staging project ref independently before running this proposal.';
  end if;

  if to_regclass('public.myops_app_clients') is null then
    raise exception 'Expected public.myops_app_clients to exist before updating the staging allowlist.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'myops_app_clients'
      and column_name = 'app_id'
  ) then
    raise exception 'Unexpected myops_app_clients schema: missing app_id column.';
  end if;

  select pg_get_constraintdef(oid)
    into existing_constraint
  from pg_constraint
  where conrelid = 'public.myops_app_clients'::regclass
    and conname = 'myops_app_clients_app_id_check';

  if existing_constraint is not null then
    if regexp_replace(lower(existing_constraint), '\s+', '', 'g') not in (
      regexp_replace(lower(expected_constraint), '\s+', '', 'g'),
      regexp_replace(lower('CHECK ((app_id = ANY (ARRAY[''opsfinance''::text, ''opsflow''::text, ''opsp''::text])))'), '\s+', '', 'g')
    ) then
      raise exception 'Unexpected myops_app_clients app_id constraint; refusing to alter the staging allowlist.';
    end if;
  end if;

  if exists (
    select 1
    from public.myops_app_clients
    where app_id not in ('opsfinance', 'opsflow', 'opsp', 'opshr', 'opsrental')
  ) then
    raise exception 'Existing unrecognized client IDs detected; refusing to broaden or mutate the staging allowlist.';
  end if;

  if exists (
    select 1
    from pg_constraint
    where conrelid = 'public.myops_app_clients'::regclass
      and conname = 'myops_app_clients_app_id_check'
  ) then
    alter table public.myops_app_clients drop constraint myops_app_clients_app_id_check;
  end if;

  alter table public.myops_app_clients
    add constraint myops_app_clients_app_id_check
    check (app_id in ('opsfinance', 'opsflow', 'opsp', 'opshr', 'opsrental'));
end $$;
