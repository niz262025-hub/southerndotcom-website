-- REVIEW ONLY: do not run on a hosted database without explicit approval.
-- This registry is authoritative for OpsRental scoped administrator access.
BEGIN;
CREATE TABLE IF NOT EXISTS public.myops_platform_administrators (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE RESTRICT,
  status text NOT NULL CHECK (status IN ('active', 'revoked')),
  changed_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  changed_at timestamptz NOT NULL DEFAULT clock_timestamp()
);
CREATE TABLE IF NOT EXISTS public.myops_platform_administrator_audit (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  user_id uuid NOT NULL,
  old_status text,
  new_status text NOT NULL,
  changed_by uuid NOT NULL,
  changed_at timestamptz NOT NULL,
  database_role text NOT NULL
);
ALTER TABLE public.myops_platform_administrators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.myops_platform_administrator_audit ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.myops_platform_administrators, public.myops_platform_administrator_audit FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.myops_platform_administrators TO service_role;
-- The trigger executes with the invoker's privileges, and only the trusted
-- service role can update the registry. Restrict direct audit modification.
GRANT SELECT, INSERT ON public.myops_platform_administrator_audit TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.myops_platform_administrator_audit_id_seq TO service_role;
CREATE OR REPLACE FUNCTION public.myops_record_platform_admin_change() RETURNS trigger
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  NEW.changed_at := clock_timestamp();
  INSERT INTO public.myops_platform_administrator_audit(user_id, old_status, new_status, changed_by, changed_at, database_role)
  VALUES (NEW.user_id, CASE WHEN TG_OP = 'UPDATE' THEN OLD.status ELSE NULL END, NEW.status, NEW.changed_by, NEW.changed_at, current_user);
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.myops_record_platform_admin_change() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS myops_record_platform_admin_change ON public.myops_platform_administrators;
CREATE TRIGGER myops_record_platform_admin_change BEFORE INSERT OR UPDATE ON public.myops_platform_administrators
FOR EACH ROW EXECUTE FUNCTION public.myops_record_platform_admin_change();
COMMIT;
