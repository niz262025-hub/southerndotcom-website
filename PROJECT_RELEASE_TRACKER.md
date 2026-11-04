
## 2026-11-05 — Admin UAT resumed; current browser SSO blocked

- User explicitly paused real payment and requested complete admin UAT for Finance, Flow and OpsPS. No payment initiated, no grant fabricated.
- Current browser portal initially rendered My Account/Admin and Open App. Finance launch switched portal to signed out; direct /account redirected to login. Thus current SSO happy path is NOT certified.
- Read-only central login check at 19:55UTC: latest owner login created19:51:23UTC, last_activity same, revoked_at NULL, myops_login_live=true. Browser session unavailable despite DB login being live; exact cause unproven, do not call it normal15minute inactivity or change security settings without evidence.
- Direct app probes: Finance/dashboard -> MYOPS/login; Flow/app -> MYOPS home signed out; OpsPS/dashboard -> MYOPS home signed out. No protected data exposed. This proves redirect/access denial behavior only, not full backend session revocation coverage.
- Production alias remains dpl_3unGsciHTpzvkEu5cwwLXjQwomhS. Recent warning/error/fatal runtime query returned no entries. Happy-path SSO, app CRUD/report/refresh and coordinated logout remain pending in this resumed UAT. Historical earlier owner SSO evidence is not a substitute for this current run.


## 2026-11-05 — First live checkout created; owner payment handoff

- Production MYOPS login verified on /account, Personal account, platform admin. Initial checkout correctly refused missing server-owned profile; inspected verified owner identity, confirmed no profile, and inserted missing personal profile via insert-only myops_provision_profile. No entitlement granted by this repair. Legacy profile-save provisioning gap remains to fix generally; do not infer eligibility from auth metadata.
- Browser Claim lifetime access created live ToyyibPay bill fa6dy4cm, order MYOPS-fEpeMJyICZIiNjkL, MYR2900 cents, gateway toyyibpay_live, status pending. Hosted bill rendered correct merchant/MYOPS Founders100/RM29 with Online Banking options. No credentials shared in tracker.
- Payment handed to owner before terms acceptance/bank transaction. Screenshot /workspace/scratch/myops-live-checkout-1793819802466.jpg. Await real payment and verified callback/settlement. Do not regenerate a second bill or mark paid from browser return. Test account is platform admin, so app-open success alone cannot prove paid-customer entitlement enforcement.


## 2026-11-05 — ToyyibPay live runtime deployed; customer payment UAT pending

- Owner explicitly approved transfer of live merchant secret to Vercel Production and live release. Merchant key and active category MYOPS Live Subscriptions saved as sensitive Production-only settings; MYOPS_ENABLE_LIVE_PAYMENTS=true. No credential values in source/tracker.
- Inspected central production uhuukcztdifvpjuopdea: empty plan/payment tables, no payment RPCs, no founder allocation/events tables. Applied myops_live_billing_foundation via Supabase migration: reviewed phase3 foundation plus live gateway changes. Verification: 0 payments, 100 remaining, live gateway default, anon/authenticated create/settle denied, service_role allowed. Historical/business data not copied.
- Release branch release/toyyibpay-live-20261105 from actual production 6bd11be; final SHA a7a1a275a8cc57219b5c218fb65f06c5978caac6. Draft PR #31 https://github.com/niz262025-hub/southerndotcom-website/pull/31. Existing production admin audit preserved; central auth explicitly gates live checkout; live callbacks require hash and independent API verification. Frontend live payment messaging enabled.
- Validation: 156 pass, 0 fail, 36 local PostgreSQL-binary dependent skips; lint/build pass. Exact production-auth browser bundle also rendered in JSDOM smoke test.
- Production deployment dpl_3unGsciHTpzvkEu5cwwLXjQwomhS READY and promoted. Initial browser blank triggered temporary rollback to old deployment; no code change was needed, subsequent promotion and fresh request rendered normal homepage, 100 slots and live ToyyibPay note. Root cause of initial transient blank not proven. Official alias verified to new deployment. Public JS asset200, callback GET405, invalid POST400. Runtime error/fatal query had no entries.
- Screenshot proof: /workspace/scratch/myops-live-pricing-1793818969229.jpg. Browser now at production MYOPS login, awaiting customer Individual login and real RM29 payment UAT. No bill/payment created yet. Paid callback and post-payment satellite entitlement flow remain UNVERIFIED. Monthly packages and production trials remain closed; DuitNow QR merchant consent still pending.
- Rollback: promote dpl_EpC8AHXH2vrP1rw7MqDMzLGAjM6T and disable MYOPS_ENABLE_LIVE_PAYMENTS for later builds; retain all financial records and migration.


## 2026-11-05 — ToyyibPay live integration prepared, activation pending

- Owner authorized continuing ToyyibPay live integration. Draft PR #30: https://github.com/niz262025-hub/southerndotcom-website/pull/30 on feat/toyyibpay-live-integration, commit 1bb214381c61a9f7faa8f7a6453c2e77d4a2fe57.
- Added fixed live host, separate LIVE credentials and explicit production/project/enablement guards; no sandbox fallback in production. Live callback requires valid live hash plus gateway transaction confirmation and matching live ledger. Unmigrated checkout fails before contacting provider.
- Production-only SQL proposal preserves historical sandbox orders, changes default gateway and returns gateway identity. Not applied to any hosted database. PGlite validates replay, old-order isolation and service-only ACLs.
- Validation: 169 pass / 0 fail / 36 PostgreSQL-binary dependent skips. Focused payment/database coverage 23 pass. No real payment made.
- Vercel metadata still has no production ToyyibPay keys or live enablement flag. Merchant login/config, production schema inspection/review/application, release assembly, deploy and real paid callback UAT remain required. Production trial rollout remains separate/incomplete. Owner SSO evidence from prior checkpoint remains valid.

# MYOPS ecosystem release tracker

Updated: 2026-10-27 (Asia/Singapore). This tracker reports verified evidence, not estimated completion. The ecosystem is NOT production-ready.

## Production account verification and Finance release — 5 November 2026

- User authorized continuing to the live account. Secure browser login to www.myops.com.my succeeded with the owner's existing platform-admin account.
- Released Finance full-ledger dashboard fix from the actual prior production base d09da171 to commit 9102c7ed106a227a8e0af6a335a97cb84d6606fe, branch release/live-dashboard-totals-20261105. Production deployment dpl_7zsNacnq5knE5f2tni86UoXd64G3 READY, promoted; app.myops.com.my alias verified on that deployment.
- Compare against prior production: only dashboard component and regression tests changed. No data/schema/environment change in production. Rollback target dpl_9ogRCSumNyydGgz7y5wURW8VqrH6 retained.
- Candidate validation: 289 tests passed, 1 live-credential persistence test skipped; typecheck/lint/build passed. Post-release error/fatal log query returned no entries.
- Production owner-account browser smoke: MYOPS -> Finance app.myops.com.my/dashboard passed, data loaded and refresh passed; MYOPS -> OpsFlow opsflow.myops.com.my/app passed and refresh passed; MYOPS -> OpsPS Web opsp-mobile-r1.vercel.app/dashboard passed and refresh passed. This validates owner/platform-admin access, not customer checkout, trial signup or paid subscriber lifecycle.
- Staging business data, sandbox payments and test entitlements were not copied into production.
- Billing still blocked: current MYOPS production has no live ToyyibPay configuration; payment host and payment schema remain sandbox-specific in source. Production page visibly states Payments are not available yet and monthly plans opening soon. Live integration, real merchant category/key setup, callback/payment activation tests and production trial rollout remain unfinished. Do not describe the overall paid launch as ready.

## OpsPS verified staging recovery — 5 November 2026

- User completed Supabase browser sign-in. Verified target project ojamkplflqafedmxbdxb (OpsFlow Staging, hosting OpsPS Edge Function).
- Replaced only MYOPS_STAGING_SHARE_TOKEN through the authorized Edge Function Secrets screen with existing valid expiring MYOPS alias access. New digest/update timestamp visible; no other secret values inspected.
- Staging Edge Function readiness changed from HTTP503 deployment_protection to HTTP200 ready:true, signed_transport:verified, unknown_session:denied.
- Real browser MYOPS to OpsPS dashboard passed without a second login for MYOPS Trial UAT. Trips page and refresh passed; three existing synthetic UAT trips loaded, including upgraded trip 03. No business records created/changed.
- Finance, Flow and OpsPS now have verified basic paid/lifetime staging SSO launch and refresh evidence. This does not certify fresh payment callbacks, full trial enforcement, or production billing readiness.
- Remaining launch gates: new paid callback UAT, live ToyyibPay integration/configuration, coordinated production trial/subscription activation and release verification.

## OpsFlow verified staging recovery — 5 November 2026

- Commit b4325468a861d828a951baf7e30c6f491928faaf deployment dpl_Huxr8wxezSiAh4m6D7GjVj796AEj READY.
- New backend /api/sso-ready returned 200 with ready:true, signed_transport:verified, unknown_session:denied. Found staging branch alias still pointed at old code; reassigned only opsflow-staging-git-feat-opsflow-ver-f21c05-mohd-syaiful-nizam1.vercel.app to the verified new deployment. Alias readiness then returned the same verified result.
- Browser MYOPS to OpsFlow /app passed with a fresh central ticket and no second login. Refresh passed; authenticated MYOPS Trial UAT dashboard and existing trial product/purchase/cash records loaded. No business records changed.
- OpsPS remains blocked by confirmed staging deployment_protection. Required next authorization: open Supabase Edge Function Secrets for project ojamkplflqafedmxbdxb and replace only MYOPS_STAGING_SHARE_TOKEN with scoped expiring MYOPS access, without reading/revealing other credential values. Browser opening of that page was rejected by automatic approval; no OpsPS secret change made.
- This updates staging evidence only. Production subscription/trial/payment release gates remain open.

## OpsFlow / OpsPS follow-up — 5 November 2026

- User approved OpsFlow Preview transport renewal and browser testing of the legacy mobile-named OpsPS web hostname.
- Updated MYOPS_STAGING_SHARE_TOKEN only in OpsFlow Vercel Preview for feat/opsflow-vercel-migration; refreshed staging deployment dpl_AVLaw8Q2rcJssDscVGusRp8g34va READY. Browser launch still failed after token renewal.
- Reproduced MYOPS share-cookie bootstrap: old 8-second timeout failed; a 20-second probe succeeded in 14 seconds and obtained the Vercel protection cookie. Configured canonical MYOPS origin was verified.
- Commit b4325468a861d828a951baf7e30c6f491928faaf raises Preview bootstrap/upstream timeout to 20 seconds, retains production upstream timeout 8 seconds, and adds bounded Preview readiness reason headers without exception details. All 42 current backend CI contract tests passed, including diagnostic credential-redaction coverage. Deployment dpl_Huxr8wxezSiAh4m6D7GjVj796AEj building at this checkpoint; browser launch not yet certified for that commit.
- OpsPS browser access now authorized and tested with a fresh MYOPS ticket: launch still denied. Staging Edge Function readiness probe returned HTTP 503, ready:false, reason:deployment_protection.
- Supabase connector does not offer secret updates; local Supabase CLI/management authentication unavailable. Opening the staging Supabase secret-management dashboard was rejected by automatic approval because that credential destination requires explicit user authorization. No OpsPS secret read or write performed. Need permission to open that page and replace only MYOPS_STAGING_SHARE_TOKEN in staging project ojamkplflqafedmxbdxb.
- Production deployment records remain READY: Finance d09da171, Flow c3feb86f, OpsPS 99bd42dc. These records do not certify new staging subscription features for production. No production release performed.

## Verified follow-up — 5 November 2026

- Owner explicitly approved Finance staging transport renewal. Updated only Finance Preview MYOPS_STAGING_SHARE_TOKEN on feat/myops-launch-session-bridge using an expiring MYOPS staging alias share.
- Browser MYOPS to Finance dashboard, Transactions and refresh passed without a second login; existing company MYOPS Trial Test retained.
- Found real dashboard defect: totals were calculated from only six recent journals and balanced entries displayed zero. Fixed complete paginated journal loading, deterministic same-date order, six-row presentation only, and debit-side entry amounts.
- Finance commit 55c31b03a2d750ad6789fa854d5b6a94c347e64c, staging deployment dpl_3F49hz1kBR8CA81vtEhw5MRM1cw8 READY. Browser confirms RM30 cash/revenue/profit from 30 RM1 entries and recent entries RM1 each. No financial test records created or changed in this follow-up.
- Finance full tests 300 pass, 1 credential-dependent skip; typecheck/lint/build pass. Regression covers 1001 journals across three pages and rejection of partial totals on page failure.
- MYOPS lifetime panel fix browser-confirmed: no trial panel for lifetime account.
- OpsFlow staging launch still fails session verification; Preview transport renewal in its own Vercel project is a separate pending authorization.
- OpsPS browser UAT blocked by automatic origin approval interpreting legacy mobile hostname as Phase 2. Repository package build is explicitly web export; browser retry remained rejected. No workaround attempted. Explicit permission for that web origin is required to resume.
- Production paid checkout/trial gates from the prior checkpoint remain open; no Production changes in this follow-up.

## Launch checkpoint — 5 November 2026, Malaysia time

Target requested: 06:00 MYT, 5 November. This checkpoint supersedes historical status below for the checks listed here.

- Scope: MYOPS, OpsFinance, OpsFlow, OpsPS web, subscriptions/payments. OpsWMS/OpsHR and mobile remain Phase 2.
- MYOPS production inspected: READY deployment dpl_EpC8AHXH2vrP1rw7MqDMzLGAjM6T, commit 6bd11be4cf4bfa6cc5cfd6c49d0ac286945e07ee. Central staging: 56b897f7.
- Current open draft PRs: MYOPS #29, Finance #27, Flow #3, OpsPS #5. Descriptions include older checkpoints; do not treat them as current UAT results.
- Central full local test run at 56b897f7: 164 pass, 0 fail, 36 PostgreSQL-binary-dependent skips. New lifetime/trial UI regression: 2 pass; lint and build pass after UI change.
- Browser staging account: Founders lifetime active, Finance/Flow/OpsPS active. Manual payment verification returns no pending sandbox payment. This is not evidence that a fresh gateway callback succeeded.
- Confirmed current staging launch failure: MYOPS to Finance renders Access could not be verified. Temporary transport access renewal is blocked by approval review pending explicit authorization to store the scoped MYOPS token in Finance Preview MYOPS_STAGING_SHARE_TOKEN, branch feat/myops-launch-session-bridge.
- MYOPS Vercel metadata contains sandbox ToyyibPay credentials for Preview only. Production paid checkout is not configured/certified. Code uses sandbox host and Preview-only callback; do not claim live payment readiness by changing environment variables alone.
- Trial admission remains explicitly staging-only in central and satellite code. Production enablement requires coordinated implementation, database migration verification, and cross-app quota/upgrade UAT.
- UI fix: lifetime accounts do not display trial limits or request trial status; payment reconciliation result is preserved without an unnecessary trial lookup.
- Production release was not performed at this checkpoint. Live paid launch remains blocked by payment integration and production trial/subscription certification, in addition to the staging SSO failure above.

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


## OpsHub follow-up — 2026-10-27

- PR #5 current head 7d2b29e fixes the CI no-regex-spaces failure in the new regression test. Direct local ESLint and all 89 unit tests pass; current-head CI is being checked. Previous CI stopped at lint before build; local build separately failed on absent public Supabase configuration.
- Verified public URL metadata: BOTH Preview and Production point to the same inactive iytiyugzmlsofwtortth Supabase project. This is not isolated staging. Preview publishable key is missing and provider key discovery failed.
- Do not restore/reconfigure that project assuming staging-only impact. First select and approve an isolated staging target; any billable creation requires provider cost confirmation. No restore or configuration write performed.
