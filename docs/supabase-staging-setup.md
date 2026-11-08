# MYOPS Supabase staging configuration

Updated 8 November 2026 for PR #55. This replaces obsolete instructions that labelled production as staging.

| Environment | Project ref | Use |
| --- | --- | --- |
| Production | uhuukcztdifvpjuopdea | Never use in Preview |
| Existing staging branch myops-sso-validation | wengxxiqwtosirealghx | Staging selection only; populated, never overwrite |

Preview requires VERCEL_ENV=preview, MYOPS_ENVIRONMENT=staging, MYOPS_USE_ISOLATED_STAGING=true and VITE_SUPABASE_URL=https://wengxxiqwtosirealghx.supabase.co. Missing/malformed isolation settings disable server project selection; unsafe public settings fail the build. Production is not a staging alternative.

Use only staging publishable/service credentials and branch-scoped server secrets. Never expose service credentials under VITE_ or NEXT_PUBLIC_. Preserve the original MYOPS_APP_USER_REF_SECRET: replacing it changes stable app identities. Sensitive values cannot be recovered through the environment API; use the original securely held value, never an invented replacement.

Eleven Preview-only settings were prepared on copilot/myops-backup-restore-central-access: staging URL/publishable key, environment/isolation flags, staging service credential, session secret, disabled trial/live-payment flags and three existing staging app destinations. The staging service credential was accepted by a SELECT-only Data API request. This does not certify hosted UAT.

Still required: original staging MYOPS_APP_USER_REF_SECRET, correct Auth redirect allowlist, verified app-side broker origin/signing settings, eligible UAT accounts and Gate A backup/restore PASS. Trial activation remains disabled. Never copy production secrets or enable unfinished applications.

See evidence/pr55/LIVE-READINESS.md. No database migration or restore was performed.
