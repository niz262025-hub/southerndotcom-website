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
- [x] MYOPS server-side SSO ticket issuance/redeem/entitlement primitives confirmed in server/app-access.js (code inspection only).
- [ ] SSO issuance, token exchange and server-side validation implemented and audited across all apps.
- [ ] App launcher sends users directly to each dashboard with no second login.
- [ ] Central logout and expired-session return flow tested.
- [ ] Subscription/entitlement enforcement tested per app and per business.
- [ ] Production smoke test and rollback verified.

## OpsFinance
- [x] Canonical repo: niz262025-hub/OpsFinance; MYOPS1/OpsFinance is frozen/excluded from all project work by owner instruction (not technically locked on GitHub).
- [ ] Re-audit current branches and PRs in niz262025-hub/OpsFinance; historical PR #10 and commit 57e1f05 belonged to a different repository and must not be assumed applicable.
- [x] Canonical OpsFinance repository confirmed by owner: niz262025-hub/OpsFinance.
- [ ] Audit and integrate central SSO in the canonical repository.
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


## Verified execution — 2026-10-26

| Application | Implementation | Executed verification | Deployment / remaining work |
| --- | --- | --- | --- |
| MYOPS | IN PROGRESS — existing signed ticket/entitlement contract inspected at main 07219fa. No auth code changed in this execution. | COMPLETE — 128 tests passed, 36 skipped; lint and build passed. Skips include PostgreSQL-dependent coverage. | BLOCKED for release — app access is explicitly staging-only in server/app-access.js and production auth rejects launches. Production secrets, mappings and real login/launch/logout E2E unverified. |
| OpsFinance | IN PROGRESS — signed Node server transport, grant validation, entitlement validation, local-only bypass regressions and loopback E2E server. Commit 74b4e4a8aa49db66d92f70835cc1d00aa3779420; draft PR https://github.com/niz262025-hub/OpsFinance/pull/17. | COMPLETE locally — 199 tests passed, 1 skipped; typecheck, lint and build passed. PGlite migration replay, own-business access, cross-business read/write denial and anonymous RPC denial passed. CI run 40295254137 (run 41) COMPLETE / success for latest commit 74b4e4a. | IN PROGRESS — no /launch or SSO-backed Supabase identity/session bridge enabled. Browser E2E BLOCKED: missing Chromium; attempted download produced a truncated/invalid archive. Live tenant UAT and production unverified. |
| OpsFlow | IN PROGRESS — main 4ccd05b inspected; Expo frontend and FastAPI/Mongo backend. No source changes. | COMPLETE for foundation subset — 3 auth/tenant/role tests passed with fake collections. Frontend npm ci failed because package-lock disagrees with package.json; declared Yarn frozen-lock install also FAILED because yarn.lock requires updating. | BLOCKED for release — central SSO, live database, complete module E2E and deployment unverified. |
| OpsPS Web | IN PROGRESS — main ec89a87 inspected; Expo web delivery retained, Android deferred. No source changes. | COMPLETE locally — 126 tests, typecheck, lint and web export passed. | IN PROGRESS — central server authentication, entitlement enforcement, live data workflows and production unverified. |
| OpsHub | IN PROGRESS — main 661f49c inspected; pnpm workspace with Next web app. No source changes. | COMPLETE locally — 88 tests, typecheck and lint passed. Build compiled but FAILED prerender at /admin/review: missing NEXT_PUBLIC_SUPABASE_URL. | BLOCKED for release — Supabase public configuration absent in execution environment; centralized SSO and production verification remain. |

### Confirmed access and release gates

- COMPLETE: GitHub connector write verified by creating OpsFinance commits, branch and PR in the authorized repository. Terminal HTTPS push lacks credentials; connector used successfully instead.
- BLOCKED in this execution environment: MYOPS app private key, app ID/origin, Supabase URL/service-role configuration and Vercel token are absent. This does not establish whether they exist in deployed Vercel projects.
- IN PROGRESS: bind opaque MYOPS user_ref to an explicitly authorized local identity and business. Existing browser Supabase access must also enforce central revocation; a middleware-only gate is insufficient.
- BLOCKED for production: registered Ed25519 public key, real staging identity mapping, approved reversible migration/backup verification, authenticated tenant A/B E2E and deployment secret/mapping inspection.
- No production deployment, merge, production SQL or destructive repository action performed. MYOPS1/OpsFinance was not accessed.
- No ecosystem completion percentage assigned. All unchecked release gates above remain open.
