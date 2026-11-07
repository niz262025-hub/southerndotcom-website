-- Read-only production SSO readiness checks. No secrets, mutations or grants.
-- Execute on MYOPS central Supabase. Any false precondition BLOCKS go-live.
select
  to_regclass('public.myops_app_clients') is not null as app_clients_ready,
  to_regclass('public.myops_login_sessions') is not null as login_sessions_ready,
  to_regclass('public.myops_lifetime_entitlements') is not null as lifetime_entitlements_ready,
  to_regclass('public.myops_app_tickets') is not null as ticket_store_ready,
  to_regprocedure('public.myops_login_start(uuid)') is not null as login_start_ready,
  to_regprocedure('public.myops_issue_app_ticket(uuid,text,text,uuid)') is not null as ticket_issuer_ready,
  to_regprocedure('public.myops_redeem_app_ticket(text,text)') is not null as ticket_redeemer_ready;

-- Separately on OpsFinance Supabase, ensure the SSO link table exists:
-- select to_regclass('public.myops_identity_links') is not null as identity_links_ready;
-- A real rollout additionally requires server-side Ed25519 public/private pairing,
-- confirmed identity mapping, broker isolation, and successful E2E login/redeem/dashboard tests.
-- Do not turn MYOPS_ENABLE_PRODUCTION_APP_ACCESS on based on this query alone.
