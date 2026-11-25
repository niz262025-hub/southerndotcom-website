-- Staging ledger 20261125193036. Apply after Central and Rental foundation/proposal tables exist.
DO $$ DECLARE t text; p text; BEGIN
FOREACH t IN ARRAY ARRAY['myops_app_audit','myops_app_clients','myops_app_grants','myops_app_nonces','myops_app_rate_limits','myops_app_sessions','myops_app_tickets','myops_founder_allocations','myops_lifetime_entitlements','myops_login_sessions','myops_memberships','myops_mobile_authorization_codes','myops_mobile_sessions','myops_mobile_used_refresh','myops_opsrental_uat_allowlist','myops_organizations','myops_payment_events','myops_payments','myops_plans','myops_products','myops_profiles','myops_rental_staging_foundation_marker','myops_revocation_requests','myops_subscriptions','myops_trials','rental_documents','rental_leases','rental_payments','rental_properties','rental_tickets'] LOOP
IF to_regclass('public.'||t) IS NOT NULL THEN
EXECUTE format('REVOKE TRUNCATE, REFERENCES, TRIGGER ON public.%I FROM service_role',t);
FOREACH p IN ARRAY ARRAY['TRUNCATE','REFERENCES','TRIGGER'] LOOP
IF has_table_privilege('service_role','public.'||t,p) THEN RAISE EXCEPTION 'Unexpected privilege on %: %',t,p; END IF;
END LOOP;
END IF;
END LOOP;
END $$;
