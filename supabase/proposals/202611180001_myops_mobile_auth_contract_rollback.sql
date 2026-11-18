-- Rollback for MYOPS mobile native auth contract proposal.
-- NOT EXECUTED.
-- STAGING REVIEW REQUIRED.
-- DO NOT APPLY TO PRODUCTION.

begin;

drop function if exists public.myops_mobile_cleanup_expired();
drop function if exists public.myops_mobile_revoke_session_family(uuid);
drop function if exists public.myops_mobile_rotate_refresh_token(uuid, text, text);
drop function if exists public.myops_mobile_consume_authorization_code(text);

drop table if exists public.myops_mobile_refresh_tokens;
drop table if exists public.myops_mobile_sessions;
drop table if exists public.myops_mobile_authorization_codes;

commit;
