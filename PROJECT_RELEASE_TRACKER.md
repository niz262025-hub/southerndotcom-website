# MYOPS release tracker

Updated: 2026-10-27. A checked box means the specific task has been verified; it does not imply an application is production-ready.

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
- [x] Verify write permissions and CI for niz262025-hub/OpsFinance (integrated run 43 passed; new launch PR CI tracked separately).
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


## Live Supabase verification — 2026-10-27

- COMPLETE: reconnected Supabase access verified for MYOPS-Central-Auth (uhuukcztdifvpjuopdea) and OpsFinance (ozkjsihuovzpujuabupa); both ACTIVE_HEALTHY.
- BLOCKED: MYOPS public schema contains no myops_* RPC functions; SSO ticket/login-session proposals have not been installed in the live database. Existing table RLS is enabled.
- BLOCKED / SECURITY: OpsFinance public.idempotency_keys has RLS disabled; catalog verification confirms anon SELECT and INSERT grants. Existing get_accounting_idempotency is executable by anon and lacks a business-membership predicate. Repository migration 013 supplies tenant RLS and RPC hardening but is not applied live.
- BLOCKED: OpsFinance migration ledger stops at 010; 012 financial account COA mapping and 013 tenant hardening are absent. financial_accounts.account_id is also absent in the live schema.
- Production database changes not applied: backup/recovery verification remains required by the owner's release order. No user records or secrets printed, no RLS disabled, and no production auth bypass enabled.
- Security reference: https://supabase.com/docs/guides/database/postgres/row-level-security


## OpsFinance live migration completion — 2026-10-27

- COMPLETE: owner screenshot shows a PHYSICAL scheduled database backup dated 25 Oct 2026 20:36:52 UTC (26 Oct 04:36:52 Malaysia). Backup listing verified from supplied screenshot; restore not tested, Storage objects excluded.
- COMPLETE: repository migrations 012 and 013 applied live as financial_accounts_coa_mapping (20261026164822) and idempotency_tenant_isolation (20261026164839). Nullable COA mapping column and cross-business mapping trigger verified.
- COMPLETE: discovered and removed a legacy direct anon EXECUTE grant surviving REVOKE PUBLIC. New forward migration and hosted-ACL regression test committed as b033450d32eb68a841363ffec15526db09500cde on fix/revoke-legacy-anon-idempotency-rpc.
- COMPLETE: npm run test:database passed migration replay, own-business access, cross-business read/write denial, anonymous RPC denial and reapplying the ACL repair.
- COMPLETE live checks: RLS true; anon table read returns zero; existing member sees own-business rows and no unauthorized-business rows; anon RPC EXECUTE false; authenticated EXECUTE true; all 11 idempotency rows retained.
- COMPLETE: fresh Supabase security advisors no longer report rls_disabled_in_public. Remaining WARN notices: two mutable search paths, 11 other anonymous SECURITY DEFINER executables, 12 authenticated SECURITY DEFINER executables and leaked-password protection disabled. These need case-by-case review; no blanket revoke applied.
- Rollback strategy: retain additive nullable COA mapping and tightened tenant/RPC access during app rollback; do not re-enable anonymous access or disable RLS. No existing financial records deleted. No MYOPS SQL deployed and no production web release performed. SSO and production acceptance gates remain IN PROGRESS.


## Integrated CI and MYOPS SQL smoke coverage — 2026-10-27

- COMPLETE: OpsFinance PR #18 now includes PR #17 transport/preview regressions in commit 873101a1edda8ca3ee37be9da1f81ece09536fbe. Earlier run 42 failed three pre-existing main-branch bypass tests; integrated run 43 (40363740633) passed. Local integrated checks: 199 tests passed, 1 skipped; database migration/tenant/ACL tests, typecheck, lint and build passed.
- COMPLETE locally: MYOPS commit 673bfcf706385dcb1ece5c53b1db77cb4716a30c adds PGlite SSO SQL replay/security smoke coverage. 129 tests passed, 36 PostgreSQL-dependent tests still skipped; lint and build passed. Clean npm ci and SQL smoke passed again. No claims of real PostgreSQL concurrency verification.
- IN PROGRESS: MYOPS production SQL remains unchanged. SSO proposals require staging validation and a reviewed production adaptation; foundation smoke success alone does not authorize enabling production ticket issuance.
- IN PROGRESS: OpsFinance /launch, preprovisioned identity mapping, RLS-compatible session bridge and centralized revocation across direct browser data access remain incomplete. No production web release or complete cross-app SSO claimed.


## Latest source milestone — staged OpsFinance SSO launch (2026-10-27)

- COMPLETE in source, not live: /launch fragment removal, same-origin signed ticket exchange, preprovisioned opaque identity mapping, confirmed-user Supabase proof exchange, AES-GCM HttpOnly host cookie, central entitlement middleware, RLS user clients, and allowlisted server data proxy.
- COMPLETE in source: browser SSO clients do not persist/refresh auth sessions and cannot call direct Auth/Storage endpoints. Mapping table defaults disabled, has service-only access and a composite FK to business membership. No auto-linking by email.
- Commit 6572c98bd0f745850168ac762d2cf43dcc6662bb; draft PR https://github.com/niz262025-hub/OpsFinance/pull/19. CI run 44 (40368466303) COMPLETE / success: install, 221 tests, database replay, typecheck, lint and build all passed.
- COMPLETE locally: 221 tests passed, 1 skipped; typecheck, lint and production build passed. Migration replay/tenant/ACL/identity-mapping tests passed. External identity services are mocked; no real staged launch or browser E2E claimed.
- PREVIEW READY: deployment dpl_6DgiQ4GdUcuDeXvPLghCHgzT9VWq for commit 6572c98 is READY; authenticated HTTP fetch of /launch contains the launch heading/status. This is a page-response smoke check, not browser hydration or SSO E2E. New mapping migration, links, server secrets and SSO feature flags have not been configured live. Existing live finance migration hardening remains in place.
- BLOCKED for production: code deliberately refuses VERCEL_ENV=production. A verified Data API broker gate/equivalent is needed to prevent legacy direct Supabase credentials bypassing central entitlement. Isolated staging resources, MYOPS SQL, key registration, provisioning and full E2E remain required. Storage/Realtime require dedicated authorization before use.
- App logout clears its cookie and returns to MYOPS dashboard; it does not claim navigation itself revokes the portal login. Actual MYOPS logout denies subsequent app requests.
- Current overall status: IN PROGRESS. Historical findings above are superseded by later verified milestones, not evidence that staging SSO or production is complete.
