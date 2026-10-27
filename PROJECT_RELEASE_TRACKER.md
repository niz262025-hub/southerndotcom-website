# MYOPS ecosystem release tracker

Updated: 2026-10-27 (Asia/Singapore). This tracker reports verified evidence, not estimated completion. The ecosystem is NOT production-ready.

## Current status

| Application | Verified completion % | Open PRs | Tests | Deployment | Blocking gates |
|---|---|---:|---|---|---|
| MYOPS Central | Not yet measurable | 1 (#20) | 136 local passes, 36 PostgreSQL-dependent local skips; quality and build-and-safety CI passed at d40e5a1 | Preview READY at d40e5a1; signed-out browser shows central login | Authenticated cross-app SSO, subscription, logout/expiry, tenant UAT |
| OpsFinance | Not yet measurable | 7 (#4–9, #19) | 243 local passes, 1 live persistence skip; migration/tenant/broker/ACL tests, types, lint, build passed; CI passed at 4a0a3ba | Preview READY at 4a0a3ba | Real SSO UAT, Storage/direct API enforcement, RPC warnings, persistent upload/reconciliation |
| OpsFlow | Not yet measurable | 1 (#2) | 4 Node frontend tests and 3 Python SSO contract tests passed; types, lint, web export passed at 90f674e | No connected Vercel project found in inspected scope | Firebase/Mongo backend staging, rule-emulator/service integration and SSO tenant UAT |
| OpsPS Web | Not yet measurable | 1 (#3) | Install → unit tests → types → lint → Expo web export command completed successfully; count not retained | Current-head deployment runtime not independently verified | Staging Edge Function/migration, trusted links, SSO/RLS/tenant UAT |
| OpsHub | Not yet measurable | 1 (#5, newly created) | 89 unit tests, types and lint passed for config fix; build blocked by missing public Supabase environment | Connected project exists; configured preview not verified | Inactive Supabase staging; missing Preview publishable key; SSO unimplemented |

A test pass rate is not an application completion percentage. No percentage is asserted until the agreed functional/security acceptance matrix has been exercised.

## Architecture and release gates

- MYOPS is the only user-facing login entry point; all satellites remain independent web apps.
- MYOPS must validate active subscription/package entitlement before app launch.
- Satellite backends must validate session and entitlement, preserve tenant RLS and reject revoked/expired sessions.
- No anonymous bypass or client-exposed service credentials.
- Keep applied migration history and production data intact.
- Production SSO/broker activation and promotion remain gated. No production runtime promotion or hosted database write was performed in this execution.
- Never merge a change that would auto-release runtime code before the required staging/production gates and authorization are satisfied.

## Completed PR resolutions

Initial direct GitHub inventory: MYOPS 9, OpsFinance 16, OpsFlow 1, OpsPS 2, OpsHub 0 = 28. This corrects the earlier manual 29 count.

| Repo | PR | Final action | Reason / retained implementation |
|---|---:|---|---|
| MYOPS | #19 | Merged (82f9808) | Reviewed test-only SQL smoke coverage; merged-main tests/lint/build and head CI passed |
| MYOPS | #12, #13 | Closed | Full Git history proved both heads were already ancestors of main |
| MYOPS | #2 | Closed, superseded | Historical pricing retained in docs/archive/myops-pricing-v1.md; old satellite billing/Workspace scaffold conflicts with current architecture |
| MYOPS | #8 | Closed, consolidated | Historical audit and unapplied proposal retained in #20; no SQL applied |
| MYOPS | #10 | Closed, consolidated | Missing recovery-outage fix reconciled with main, retained in #20 |
| MYOPS | #17 | Closed, consolidated | Central login and explicit production opt-in access gates retained in #20; image assets preserved |
| MYOPS | #18 | Closed, consolidated | Historical evidence retained in docs/release-evidence-20261026.md; current tracker supersedes status |
| OpsFinance | #13 | Closed | Verified zero changed files; no functionality removed |
| OpsFinance | #10, #15 | Closed, consolidated | Tenant writes, atomic posting, journal references and validated onboarding retained in #19 ancestry |
| OpsFinance | #17, #18 | Closed, consolidated | Signed transport and direct legacy anon-RPC ACL repair retained in #19 ancestry |
| OpsFinance | #11 | Closed, superseded | Subscription navigation already absent and legacy route already redirects to business settings |
| OpsFinance | #14 | Closed, superseded | Current local-development-only bypass and hosted denial are stronger; old proposal would reopen hosted bypass |
| OpsFinance | #16, #20 | Closed, superseded | Competing legacy/placeholder SSO paths replaced by #19 sealed session, explicit identity/business mapping, central checks and server proxy |
| OpsPS | #1 | Closed, superseded | Current code retains required roles, Supabase dependency and jsdom; do not restore obsolete schema/history |

Totals: one existing PR merged, 17 existing PRs closed, ten original PRs still open, plus one new OpsHub security PR = eleven currently open.

## Commits delivered

- MYOPS af354f5: preserve recovery outage handling on current main; consolidated into d40e5a1.
- MYOPS d40e5a1 (#20): reviewed central login/SSO/staging consolidation; exact local tree 38fd42a.
- OpsFinance 4a0a3ba (#19): staged SSO + tenant/atomic posting + onboarding; exact local tree 28c427c.
- OpsFlow 90f674e (#2): clear query AND fragment launch tickets, preserve unrelated query parameters, replace removed local-trial test with executable SSO regression tests.
- OpsHub ab75e4f (#5): remove server credentials from Next.js compile-time env mappings; public-only regression test.

## Remaining Finance PRs

PRs #4–9 have been inspected but are not safe to merge wholesale. They overlap accounting/demo/billing work, contain older schema snapshots and/or local-only demo workflows. Current reconciliation UI remains a placeholder; uploading/marking local rows is not proof of durable accounting persistence.

Keep these open until required workflows are implemented against the authenticated tenant database and central billing replacement is verified. Do not close them merely to reduce the count. Do not reapply or rewrite older applied migrations.

## Supabase findings (read-only)

- MYOPS production: uhuukcztdifvpjuopdea; isolated staging: wengxxiqwtosirealghx.
- Finance production: ozkjsihuovzpujuabupa; isolated staging: tfwizcztyktdurmiynzs.
- OpsPS production: wrsigjhhbkbomtkaqlpw.
- OpsHub staging: iytiyugzmlsofwtortth, INACTIVE at inspection.
- MYOPS staging: all public tables have RLS; one enabled app client and one auth test user.
- Security advisors: Finance staging and OpsPS production have anonymous SECURITY DEFINER/search_path warnings requiring individual RPC review. Leaked-password protection warnings remain. RLS-without-policy INFO on server-only tables is not justification to add browser access.
- Finance hosted migration ledgers inspected: production does not contain the new SSO/broker migrations; staging contains identity, broker and read-grant migrations. New 014/016/017/018 onboarding/tenant/atomic definitions were not applied in this execution.
- No production data deletion or hosted schema/Auth write performed.

## Vercel and browser findings

- Accessible projects: southerndotcom-website, opsfinance, ops-hub-web, opsp-mobile-r1.
- MYOPS d40e5a1 Preview READY; trusted branch /api/auth GET returns expected 405 with no-store/security headers. Untrusted deployment host is rejected (403).
- Browser verified MYOPS root shows the central login. This is signed-out evidence only.
- Secure staging login request timed out without a result. Authenticated MYOPS→app dashboard flow, entitlement denial/revocation and global logout are NOT verified.
- Finance 4a0a3ba Preview READY; CI passed. A connector smoke fetch remained blocked by Vercel protection (401), which is not application-auth evidence.
- Local Chromium download repeatedly returned a truncated/invalid archive; local browser E2E is not claimed passed.
- OpsHub Preview metadata has NEXT_PUBLIC_SUPABASE_URL but no Preview NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY; server sensitive variables are not retrieved or copied. Production public configuration is separate.
- OpsHub #5 build fails without public Supabase config; do not hide this with dummy credentials or auth bypass.

## Next executable actions

1. Validate secure staging login and MYOPS→Finance dashboard flow with a staging test account; then denial, expiry, logout and tenant A/B paths.
2. Complete persistent Finance upload/reconciliation and resolve #4–9 without importing obsolete schema snapshots.
3. Review and test each flagged RPC permission/search_path fix in staging; preserve production until approved.
4. Provision/configure Flow backend/Firebase/Mongo staging and OpsPS Edge Function/identity links, then run full integration/RLS UAT.
5. Restore an authorized OpsHub staging environment, supply its Preview public key through protected provider settings, test #5, implement its SSO.
6. Promote production only after every release gate passes and production authorization is confirmed.
