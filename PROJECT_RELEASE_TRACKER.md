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
- [ ] SSO issuance, token exchange and server-side validation implemented and audited across all apps.
- [ ] App launcher sends users directly to each dashboard with no second login.
- [ ] Central logout and expired-session return flow tested.
- [ ] Subscription/entitlement enforcement tested per app and per business.
- [ ] Production smoke test and rollback verified.

## OpsFinance
- [ ] Commit 57e1f05 pushed to MYOPS1/OpsFinance PR #10 (previous head e607fd8).
- [ ] GitHub write 403 resolved.
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
