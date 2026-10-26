# MYOPS release tracker

Updated: 2026-10-26. A checked box means the specific task has been verified; it does not imply an application is production-ready.

## Non-negotiable architecture

- MYOPS is the sole user-facing login entry point.
- MYOPS validates authentication and subscription/entitlements.
- Clicking an entitled application opens its dashboard without another login prompt.
- Every app verifies the central identity and entitlement server-side; never trust URL parameters or browser state as proof of login.
- Expired sessions redirect to MYOPS login and return to the requested app after authentication.
- Central logout invalidates access across apps.
- OpsFinance, OpsFlow, OpsPS and OpsHub remain separate web applications.
- Android is postponed. OpsHR and OpsWMS are coming soon.
- No production deployment until authentication, tenant isolation, end-to-end tests, and rollback checks pass.

## MYOPS
- [x] CI workflow committed (.github/workflows/myops-quality.yml, 5846077).
- [ ] CI results verified green.
- [ ] Production authentication environment configured and tested. scripts/build.mjs gates production-auth behind MYOPS_ENABLE_PRODUCTION_AUTH=true.
- [x] MYOPS server-side SSO ticket issuance/redeem/entitlement primitives confirmed in server/app-access.js (code inspection only).\n- [ ] SSO issuance, token exchange and server-side validation implemented and audited across all apps.
- [ ] App launcher sends users directly to each dashboard with no second login.
- [ ] Central logout and expired-session return flow tested.
- [ ] Subscription/entitlement enforcement tested per app and per business.
- [ ] Production smoke test and rollback verified.

## OpsFinance
- [x] Canonical repo: niz262025-hub/OpsFinance; MYOPS1/OpsFinance is frozen/excluded from all project work by owner instruction (not technically locked on GitHub).
- [ ] Re-audit current branches and PRs in niz262025-hub/OpsFinance; historical PR #10 and commit 57e1f05 belonged to a different repository and must not be assumed applicable.\n- [x] Canonical OpsFinance repository confirmed by owner: niz262025-hub/OpsFinance.\n- [ ] Audit and integrate central SSO in the canonical repository.
- [ ] Verify write permissions and CI for niz262025-hub/OpsFinance.
- [ ] CI green and live Supabase UAT tenant A/B passed.
- [ ] Browser E2E passed.
- [ ] SSO direct-to-dashboard integrated without local login or local billing.
- [ ] Production smoke test and rollback verified.

## OpsFlow
- [ ] Source audit, CI and functional tests.
- [ ] Central SSO and entitlement gate.
- [ ] Production smoke test.

## OpsPS Web
- [ ] Web scope audited (existing OpsPSMobileR1 is Expo).
- [ ] Central SSO and entitlement gate.
- [ ] Web functional tests and production smoke test.

## OpsHub
- [x] CI workflow committed (.github/workflows/opshub-quality.yml, 661f49c).
- [ ] CI green and Playwright E2E green.
- [ ] Central SSO and entitlement gate.
- [ ] Production smoke test.

## Release gate
- [ ] All CI pipelines green.
- [ ] Real Supabase UAT tenant isolation.
- [ ] Browser E2E: MYOPS login -> each app dashboard -> MYOPS logout -> access denied.
- [ ] No independent login screen for app users.
- [ ] Subscription packages verified.
- [ ] Production deployment and post-deployment smoke test.

## OpsFinance MYOPS SSO Phase 1 — 2026-10-27
- [x] Server-only MYOPS signed redeem/entitlement client committed in canonical repo branch `feature/myops-sso-signed-client-20261027`.
- [x] Draft PR #20 opened: https://github.com/niz262025-hub/OpsFinance/pull/20 (3 commits; not merged).
- [x] Vitest test source added for signatures and fail-closed request validation (execution NOT yet verified).
- [x] GitHub Actions Run #48 PASSED on PR #20 head `fff1679`: npm ci, npm test, test:database, typecheck, lint, build (2026-10-27).
- [ ] Implement local identity binding, HttpOnly session, /launch and guarded middleware; staging verification required.
- [ ] Enable production only after MYOPS API production gate is separately authorized and verified.

## OpsFinance SSO Phase 2 — 2026-10-27
- [x] PR #20 branch contains `/launch` fragment-clearing UI and fail-closed `/api/myops/launch` endpoint; latest commit `986dda5`.
- [x] Tests added for exchange gate; CI Run #51 PASSED (npm ci, npm test, test:database, typecheck, lint, build; verified 2026-10-27).
- [ ] Implement MYOPS `user_ref` mapping to Supabase authorized user and create RLS-preserving session.
- [ ] Replace fail-closed 503 only once authenticated session exchange works and is tested.
- [ ] End-to-end verified SSO dashboard, logout, entitlement revocation in staging.

## Verified SSO identity dependency — 2026-10-27
- [x] Read-only Supabase project discovery: MYOPS central auth `uhuukcztdifvpjuopdea` and OpsFinance `ozkjsihuovzpujuabupa` are distinct ACTIVE_HEALTHY projects.
- [x] Read-only public schema inspection: MYOPS has `myops_profiles(user_id)`; OpsFinance has `users(id)` and `business_members(user_id,business_id)`. No canonical cross-project user_ref mapping was shown in the inspected tables.
- [ ] Choose and test explicit server-verified provisioning/binding between MYOPS app-scoped user_ref and OpsFinance Auth user; DO NOT infer equal auth UUIDs or match accounts by email alone.
- [ ] Owner authorization required before any staging schema or Auth changes; production must remain untouched.

## SSO Phase 2 staging-only owner authorization — 2026-10-27
- [x] Owner authorized staging-only MYOPS–OpsFinance identity mapping and tests; no production, deletion or untested deployment.
- [x] OpsFinance PR #20 commits through `cabc446` add fail-closed identity-binding authorization, unit tests and staging DB verification gate.
- [ ] CI Run #54 result pending at last inspection (in progress).
- [ ] Resolve staging Supabase target: only a project named `OpsFinance` was discovered; it is NOT verified as staging. NO database/Auth changes made.
- [ ] Complete verified account binding and Supabase-compatible session exchange before removing HTTP 503 gate.

## OpsFinance production target clarification — 2026-10-27
- [x] Owner selected existing Supabase project `ozkjsihuovzpujuabupa` (OpsFinance) as production target; supersedes earlier staging-only target choice.
- [x] Read-only production schema inspection performed; no Auth/user/data or schema mutations.
- [x] PR #20 CI Run #54 SUCCESS (tests, database tests, types, lint, build) on previous commit `cabc446`.
- [x] PR #20 documentation updated in commit `6aaa7d8` to production-readiness gates, not a production deploy.
- [ ] Verify backup/recovery readiness, RLS-safe Supabase Auth integration, migration rollback, and new commit CI before production changes.
- [ ] SSO `/api/myops/launch` still returns fail-closed 503; do not advertise live single-login until end-to-end validated.
