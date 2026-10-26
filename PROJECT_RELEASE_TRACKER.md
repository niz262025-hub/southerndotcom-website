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


## Current execution blocker — 2026-10-27

- Last verified implementation remains OpsFinance PR #19, commit 6572c98bd0f745850168ac762d2cf43dcc6662bb, CI run 44 success. No production SSO activation.
- Attempt to create an isolated OpsFinance staging branch was aborted; subsequent list_branches returned an empty list. No staging creation or cost authorization is assumed.
- Execution environment became unavailable. The following shell call to write and test a broker-gate migration failed before process creation (exec-server disconnected / recovery timed out). No broker-gate implementation or test success is claimed, and no such production migration was applied.
- BLOCKED: restore an execution environment to implement/test the remaining Data API gate. Then complete staging provisioning/secret configuration and real MYOPS launch/logout E2E. Existing production data/RLS hardening remains as last verified.


## Isolated staging provisioned — 2026-10-27

- COMPLETE: OpsFinance branch myops-sso-validation, ref tfwizcztyktdurmiynzs, ACTIVE_HEALTHY, no production data copied.
- COMPLETE: applied myops_identity_links on OpsFinance staging. Verified RLS=true, anon read=false, authenticated insert=false, service_role read=true; zero identity links provisioned.
- COMPLETE: MYOPS branch myops-sso-validation, ref wengxxiqwtosirealghx, ACTIVE_HEALTHY, no production data copied. Seeded existing product catalog from authoritative foundation SQL.
- BLOCKED by automatic approval review: proposed staging_entitlements migration rejected because phase3_founders_100.sql installs security-sensitive payment/entitlement functions, constraints and privileged grants beyond generic SSO-staging authorization. No bypass attempted; later SSO migrations not executed. Explicit owner approval for this staging-only financial schema scope is required before retrying.
- Production unchanged. Real launch/logout E2E remains incomplete.


## MYOPS staging SSO schema installed — 2026-10-27

- Owner explicitly authorized Phase 3 payment/entitlement schema on staging only; earlier auto-review scope blocker superseded for this operation.
- COMPLETE: applied staging_entitlements, staging_app_access and staging_login_sessions to MYOPS staging wengxxiqwtosirealghx. No production SQL changed.
- VERIFIED: 26 myops_* public functions installed; RLS enabled on all myops_* tables; anon and authenticated cannot execute ticket redemption; service_role can execute redemption.
- VERIFIED: zero enrolled app clients and zero app sessions. No identity provisioning, paid checkout or real login/launch test claimed.
- IN PROGRESS: staging application key enrollment, server-only Supabase credentials, preview source configuration for the isolated MYOPS project, broker-gate implementation and real launch/logout E2E.


## Isolated preview configuration — 2026-10-27

- COMPLETE in source: MYOPS staging selection allowlist, commit 92eeea1475592cf0448d9a8c32ad6c943fa7bdef, draft PR #20. Only preview + staging + explicit opt-in selects wengxxiqwtosirealghx; production selection unchanged. Local 130 tests passed, 36 skipped, lint/build passed.
- COMPLETE: Vercel preview branch feat/myops-isolated-staging now has matching staging public URL/key and MYOPS_ENVIRONMENT=staging / MYOPS_USE_ISOLATED_STAGING=true.
- COMPLETE: OpsFinance preview branch feat/myops-launch-session-bridge has matching tfwizcztyktdurmiynzs public/server URLs and publishable key. SSO feature flags not enabled.
- BLOCKED: existing Vercel config contains no MYOPS_SERVICE_ROLE_KEY for the isolated MYOPS branch and no SUPABASE_SERVICE_ROLE_KEY for OpsFinance. Supabase connector exposes publishable keys only. Owner must place the corresponding staging secret API keys in branch-scoped Vercel server envs (never chat). Remaining app signing/session secrets can be generated/configured separately; do not reuse production secrets.
- Real login/launch/logout E2E and Data API broker gate remain incomplete. Environment edits need redeployment after all server configuration is ready. No production environment changes.


## Preview SSO runtime configuration — 2026-10-27

- COMPLETE: owner-supplied Supabase server credential variables exist on the exact Preview branches. Connector retrieval still reports encrypted values, so plaintext format/credential validity is not established from metadata.
- COMPLETE: independent staging portal session/user-reference secrets and OpsFinance session/Ed25519 secrets generated and stored in Preview branch-scoped encrypted variables; no values emitted in reports. Public key enrolled on MYOPS staging with app client disabled pending real launch validation.
- COMPLETE: branch-specific origins/app launch URL configured; OpsFinance SSO flags enabled for Preview only.
- COMPLETE: redeployed MYOPS dpl_HgMe3vcvn9cDQn1k8RmBHGDbxyLh and OpsFinance dpl_HwgH8jsEH746P8GD3zypRekSGBMn; both READY, target=null (Preview), not production.
- VERIFIED HTTP smoke: MYOPS /login returns 200 SPA document; OpsFinance /dashboard returns 307 instead of local login content. This does not prove browser hydration or authenticated launch.
- IN PROGRESS: test identity provisioning, credential verification through runtime, enabling the enrolled app client after prerequisites, actual login/launch/logout E2E, and Data API broker gate implementation. No complete SSO/production release claimed.


## Staging identity test blocker — 2026-10-27

- VERIFIED: MYOPS staging Auth signup was reached over HTTP but rejected reserved example-domain test addresses. No successful signup or login claimed.
- BLOCKED by automatic approval review: direct creation of a confirmed staging auth user/identity was rejected as circumventing normal signup/email verification. No auth rows were inserted by that rejected operation; no alternative bypass attempted.
- Next requires either a normal owner-controlled staging signup/confirmation, or explicit owner authorization for an administratively confirmed, staging-only test identity before any retry. No passwords, token values or hashes included in this tracker. Production unchanged.


## SSO credential compatibility verification — 27 October 2026 (MYT)

- COMPLETE: MYOPS server-only credential selector accepts modern secret keys and legacy service-role credentials restricted to the configured project, role, algorithm and expiry. Supabase remains responsible for signature validation. Commit: 3d682200f40a8ba64859488cc8acd3c070531ac8; PR #20.
- COMPLETE: Local MYOPS verification executed again: 131 tests passed, 36 skipped, 0 failures; lint and production build exited 0. Skipped tests are not counted as passed.
- COMPLETE: Preview deployment dpl_CFzezDKTwpRgnFrj5j8EpHQBbDNd is READY at commit 3d682200f40a8ba64859488cc8acd3c070531ac8. Target is preview (target:null), not production.
- IN PROGRESS: Real login must be retested for the durable MYOPS parent session and then ticket redemption, tenant membership and central logout. Earlier login success alone did not establish that parent session. Temporary test credentials and HTTP harness from the prior runtime are unavailable; no live SSO success is claimed.
- BLOCKED for production release: Finance direct Data API broker enforcement and full runtime SSO/security E2E remain unverified. Production settings and database were not changed in this work.


### Follow-up verification — 27 October 2026 (MYT)

- COMPLETE: OpsFinance tests rerun: 221 passed, 1 skipped; typecheck, lint and database-isolation suite exited 0. Cross-business read/write denial, anonymous RPC denial and service-only identity mapping assertions passed locally.
- COMPLETE: Live preview unauthenticated /dashboard returned HTTP 307 to the configured MYOPS staging /login.
- IN PROGRESS: The Data API broker migration placeholder is empty; a replay runner reporting PASS for that file is NOT evidence of implemented broker enforcement. Production SSO remains gated.
- COMPLETE: Recovered access credentials for the existing synthetic MYOPS staging test fixture only. No production users or settings changed; no credential values recorded here.
- BLOCKED: Automatic approval review rejected creating a temporary protected-preview Vercel share link because anyone possessing the bearer URL can access that deployment. Explicit owner approval for that limited sharing capability is needed to continue this HTTP test route; no workaround attempted after rejection.


## Broker gate delivery — 27 October 2026 (MYT)

- COMPLETE: OpsFinance commit 6da68b3cf7ac9244165ef4afaa1adb06b8b8f4d4 pushed to PR #19. Replaces the empty broker migration with private hashed configuration, PostgREST pre-request enforcement and restrictive policies preserving tenant RLS. Server credentials are never forwarded from the caller or returned to the browser.
- COMPLETE: Local validation: 222 unit tests passed, 1 skipped; typecheck, lint, production build and database migration/isolation tests passed. Tests cover key rejection, tenant isolation with a valid broker key and configuration rollback.
- COMPLETE: GitHub Validate OpsFinance run #56 (40412111569) passed. MYOPS quality #29 and validation #66 passed for commit 3d682200f40a8ba64859488cc8acd3c070531ac8.
- COMPLETE: Finance preview dpl_DVBjdo23qvUfMi629qvoX4ha7Fkc READY at commit 6da68b3. A sensitive server broker variable was provisioned only for preview branch feat/myops-launch-session-bridge.
- COMPLETE: Migration installed and broker gate activated only in isolated Finance staging tfwizcztyktdurmiynzs. Verified 20 restrictive policies, configured authenticator hook and denied browser access to private configuration.
- COMPLETE: Real staging PostgREST checks exited 0: missing/wrong broker key received HTTP 401 with MYOPS application access required; valid broker key passed the hook and received existing anonymous table permission denial. This verifies hook enforcement, NOT authenticated business workflow success.
- IN PROGRESS: Existing advisor warnings remain (2 mutable function search paths, 6 anonymous and 11 authenticated SECURITY DEFINER exposures); no new finding was introduced by the private broker functions. Each still needs contextual review before release.
- BLOCKED: Full protected-preview login/ticket/logout E2E still needs approved authenticated access. The earlier automatic approval rejection for a bearer share link remains unresolved; no new share link requested or workaround used.
- IN PROGRESS: All-app production release remains unverified. No production migration, merge or deployment performed.


## Protected preview login diagnosis — 27 October 2026 (MYT)

- COMPLETE: Owner explicitly approved temporary protected-staging Vercel share access. Access links obtained for MYOPS and Finance; bearer URLs and session tokens were not logged or committed. The prior share-access approval blocker is resolved.
- COMPLETE: Executed real MYOPS staging password login for the existing synthetic fixture: HTTP 200, portal access cookie present, durable login cookie absent. A stale-cookie retry returned HTTP 503 at server-side session validation; fresh login still did not establish the durable parent record. No ticket launch success is claimed.
- COMPLETE: Added redacted preview-only diagnostic codes in MYOPS commit 9404052f2016578c066a6bf0b6f3dfa0bd5bb037 / PR #20. Local tests: 131 passed, 36 skipped; lint/build passed. CI quality #30 and validation #67 succeeded. Preview dpl_BU6jWdEJYSQs2ZKPnxGho3rJon7f READY.
- COMPLETE: Database checks confirm fixture profile exists and service_role has EXECUTE on myops_login_start(uuid).
- BLOCKED: Actual Vercel runtime emitted myops_sso_login_unavailable server_credential for the fresh login request. The configured MYOPS_SERVICE_ROLE_KEY is rejected by server credential validation (missing/unsupported format, wrong project, invalid role/algorithm or expired legacy credential). Its plaintext was not retrieved or logged. The connector can obtain public keys but cannot provision the required server secret key.
- OWNER ACTION: Set a genuine Supabase server secret from isolated MYOPS staging project wengxxiqwtosirealghx as MYOPS_SERVICE_ROLE_KEY, scoped only to Vercel Preview branch feat/myops-isolated-staging. Use a Secret/Sensitive value and do not paste it into chat. Then redeploy that preview and rerun login, ticket redemption and central logout tests. Finance server credential has not yet been validated; no assumption that it works.
- Production remains unchanged. Full SSO and all-app release remain IN PROGRESS.
