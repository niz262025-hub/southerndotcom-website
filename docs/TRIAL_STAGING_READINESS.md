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
