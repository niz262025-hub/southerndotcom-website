# Central MYOPS subscription and trial staging

Login and subscription remain solely in MYOPS. OpsPS, OpsFlow and OpsFinance must consume central access and enforce feature limits at their server/database boundary. No independent app subscription or billing is introduced.

## Implemented foundation

- Four central plan contracts preserve existing pricing: RM0 7-day trial; existing RM29 Founders 100 lifetime promotion; RM49 monthly two-app selection; RM79 monthly all-available-app plan. The latter monthly payment routes remain disabled in the existing payment module.
- Exact trial duration 168 hours, one use per account/company, one user and company, no card or automatic renewal.
- Service-only SECURITY INVOKER trial start requires the existing live MYOPS login. It does not touch activity timestamps or modify 15-minute/12-hour session policy.
- Idempotent activation retains the original trial; expired trials do not restart. Identity, original timing and upgraded terminal state are immutable. Upgrade after expiry is supported without deleting trial data.
- Server-owned profile, company ownership/active admin/single-user membership and existing paid/lifetime access are checked. Client writes and direct start/status RPC access are denied; authenticated users may only read their own row under RLS.
- Central feature policy contracts: 30 related transactions/app; Finance two statements/five invoice-receipt documents with reconciliation/report previews and no export; Flow two workflows, no automation/advanced approval; OpsPS two projects, no advanced reports/export/multi-user. These are contracts, not yet app-side enforcement.

## Verification

Local suite: 146 PASS, 0 FAIL, 36 SKIPPED (real PostgreSQL binary-dependent suites). Five new policy/real-SQL tests run and PASS, including one-use/idempotence, exact expiry, organization eligibility, RLS/ACLs, paid-access preservation, upgrade after expiry and passive idle/absolute login denial. Lint and web build PASS.

Migration `central_trial_7_day_foundation` applied only to existing MYOPS staging project wengxxiqwtosirealghx. Hosted verification: RLS enabled, start RPC SECURITY INVOKER/service-only, zero trial rows and existing UAT user not_started. No payment, subscription or app grant was created. Production unchanged.

## Release gates still open

Trial activation UI/API is deliberately not exposed. App-side transaction/feature quotas and upgrade transitions must be enforced and tested before a trial can unlock an app. Wire the central plans/status UI and secure activation API only after those checks pass. Do not advertise the trial as available, mark subscription UAT ready or enable monthly checkout yet. ToyyibPay changes require the final separate approval.

No new Vercel build is required for these currently unreferenced policy/test files; if Git triggers a Preview, verify its source/environment. Preserve approved homepage design and the current live MYOPS/OpsFinance release.

## Central usage enforcement increment — 2 November 2026 MYT

`central_trial_usage_limits` adds a service-only, SECURITY INVOKER quota consumer and an append-only usage table protected by RLS. It locks the trial row before counting/inserting; the primary key deduplicates a server-owned operation UUID per app/feature. It checks passive central login validity, effective trial expiry and current single-user company ownership/membership on each call. Unknown/premium features fail closed. Browser roles cannot read or write this ledger or execute the consumer.

This is not app-side enforcement yet. Each app must validate input and authorize its tenant, then consume applicable quotas from a trusted server with a stable operation UUID and perform an idempotent write. Transaction counts and document/resource counts are separate limits; both must pass when applicable. Consumption is conservative and irreversible: failed writes may consume a unit, and retries must reuse the UUID. Do not expose trial activation until this integration and failure handling pass end-to-end. Paid/admin access must continue through the existing entitlement path, not this trial-only RPC. Reconciliation and financial statement previews require their own server route; denying mutation/export does not implement a preview.

No billing/payment/subscription/app-grant rows are created. Production and session timers are unchanged.

## Central entitlement repair — 2 November 2026 MYT

The reproduced defect was active trial => product `none`, because both portal and signed app resolver considered only paid grants. The resolver now accepts eligible active trial records for explicitly certified staging apps. Current capability allowlist is OpsFlow only. `MYOPS_ENABLE_STAGING_TRIAL_ACCESS=true` plus `MYOPS_TRIAL_READY_APPS=opsflow` are required in Preview/staging; Production always ignores this path. Flags are not enabled by this code change.

The portal and signed app handlers share server-owned trial eligibility checks, exact168-hour validity, user binding, policy version and current company owner/single-admin membership. Paid/admin/lifetime access retains priority. Signed entitlement returns `access_mode=trial` with only trial id/expiry/policy version, or `paid` for existing paid access; user identity is not returned. Unknown database state fails closed. Expired/invalid trials and uncertified Finance/OpsPS never gain trial access.

The previous failing SQL+resolver integration now PASS without paid subscription or app grants. It runs in quality CI. This is not browser UAT, and trial activation/whole-ecosystem readiness remains unfinished. OpsFlow has local atomic usage accounting; the earlier central quota ledger is not charged for its writes, avoiding duplicate accounting or cross-database refund races. Do not enable a second independent billing system.
