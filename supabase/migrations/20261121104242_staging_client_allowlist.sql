-- STAGING PROPOSAL only. Does not register clients or modify keys, products or grants.
-- Explicit guard prevents accidental execution during normal migration runs.
do $$
declare existing_constraint text;
begin
  if current_setting('myops.allow_client_staging', true) is distinct from 'wengxxiqwtosirealghx' then
    raise exception 'Explicit isolated MYOPS staging guard required';
  end if;
  select pg_get_constraintdef(oid) into existing_constraint from pg_constraint
    where conrelid='public.myops_app_clients'::regclass and conname='myops_app_clients_app_id_check';
  if existing_constraint is distinct from $expected$CHECK ((app_id = ANY (ARRAY['opsfinance'::text, 'opsflow'::text, 'opsp'::text])))$expected$ then
    raise exception 'Unexpected existing client constraint';
  end if;
  if exists(select 1 from public.myops_app_clients where app_id not in ('opsfinance','opsflow','opsp','opshr','opsrental')) then
    raise exception 'Existing unrecognized client; refusing migration';
  end if;
  alter table public.myops_app_clients drop constraint myops_app_clients_app_id_check;
  alter table public.myops_app_clients add constraint myops_app_clients_app_id_check
    check(app_id in ('opsfinance','opsflow','opsp','opshr','opsrental'));
end $$;
