# OpsFinance production release approval pack — 29 October 2026
Status: PREPARED; awaiting owner production authorization. No production mutation or deployment performed.

## Exact scope and evidence
- Finance live domain app.myops.com.my resolves to READY production dpl_4M1AqukgaBCWRWBtp2HkuT9fapf3, commit32a5e063b6f577e4b70e916f4b3b4359b7d781a6.
- MYOPS www.myops.com.my resolves to READY production dpl_8p4DSjybCUDzyMFbo1UGrPYs7oV1, commit36a59183dc98a09d81b745d0d69acaefe16842d2.
- Reviewed current MYOPS main824a996599f81bf8fde28783788047fe9bb6dda8 adds the fail-closed build preflight; its previous production build dpl_77bwsYX2XupZsTcpxj5iLFJHFqp9 failed for MYOPS_SERVICE_ROLE_KEY. That sensitive variable was updated AFTER the failed build. Current validity is unverified, not declared invalid.
- Production env metadata: central auth/app access true; Finance server/public SSO true and data-gate flag true. Official origins correct. Secret presence/type verified only, never decrypted. Actual production credential validity/key pairing/broker credential equality remains a mandatory release gate.
- MYOPS database uhuukcztdifvpjuopdea and Finance ozkjsihuovzpujuabupa confirmed by URL settings. Separate from staging. Finance broker enabled with configured hash;20 restrictive broker policies including Storage; all public tables have RLS. One enabled identity link has matching membership. Central Finance app registration enabled with public key, one active Finance subscription (aggregate only; no subscription modified).
- HEAD public probes: MYOPS homepage200, MYOPS login200, Finance login redirects to official MYOPS login200. No production login or signed POST made; these may write sessions/nonces/audit and are deferred.
- Finance currently lacks bank_name/company_name/account_number and verified statement number; new code cannot be deployed against that schema unchanged.
- Production MYOPS session validator does not call myops_login_touch on valid app activity; bring across the staging-tested synchronisation while retaining15m idle and12h absolute expiry.
- Existing Finance anon/authenticated grants include TRUNCATE on18 public tables. RLS does not filter TRUNCATE. This inspection did not demonstrate an HTTP exploit; remove unnecessary privilege as part of release. No TRUNCATE executed.

## Reviewed runtime candidate
- Source base: Finance production main32a5e063b6f577e4b70e916f4b3b4359b7d781a6.
- Bring across approved staging feature code from b22b0d7fce7b9c3c258aea936bb05590088f35af.
- Preserve production lib/auth/myops-session.ts and middleware.ts, including Ed25519 validation, broker/data-gate checks and MYOPS login destination; preserve their matching production tests. Staging branch deliberately blocks all production SSO and must NOT be directly promoted.
- Local detached candidate commit1c3838049050730c5162b3ef3bb7a22921ddcb73,41 files changed. No remote release branch created or pushed. Reviewable exact binary diff in finance-runtime.patch; SHA256 c45e8c32337f13532de0a880d9aeac36176e4a0456f55f80db5b66c538bf3e8c.
- Tests281PASS/1skipped; TypeScript PASS; Next15.5.28 optimized build PASS. Initial2 data-proxy tests failed because a preview fixture used string key; fixed fixture to generated Ed25519, retaining actual guards. Final full suite passes. Build uses local environment, NOT production secrets; does not certify hosted production behavior.
- Staging acceptance already covers central SSO,15min idle redirect, accounting posts/reports, CSV25 posting/reconciliation and matching/mismatched bank-number preview. These do not certify every bank format or production UAT.
- Release scope CSV/TXT only, recognized full account metadata mandatory. Missing/masked/unrecognized numbers reject import; existing accounts need owner-entered number before new imports. PDF/image/Excel deferred. No payments/ToyyibPay rollout or subscription change.

## Ordered production changes requested
1. Revalidate both domain deployment IDs and database preconditions immediately before changes; stop on drift.
2. Securely verify existing MYOPS service credential and Finance signing public/private pairing/broker binding without returning secrets. No new key/rotation assumed. If invalid/unavailable, stop for secure configuration, not bypass.
3. Apply finance-db-apply.sql on Finance Production only through one recorded migration: additive bank fields, three restrictive actor/reference policies, REVOKE TRUNCATE. Do NOT run all staging migrations/db push; production migration history differs and existing DML grants already present.
4. Apply myops-timer-apply.sql on central Production only through one recorded migration; guard existing function definition, preserve expiry and grants.
5. Stage a production-configured MYOPS build824a996... WITHOUT assigning domains. Build preflight must PASS. Stage Finance reviewed candidate likewise, preserving existing deployment hold; no main blind merge, no automatic domain assignment.
6. Verify signed application denials/transport/key registration and protected-page/session gates on staged production builds. Do not switch origins to staging, copy staging credentials/identity fixtures, disable auth/RLS/entitlement or expand subscriptions.
7. Promote tested production builds as one coordinated change; retained official domains. Owner completes normal central login; verify entitled Finance launch with no second login, read-only reports, central logout and expired-session denial. No production financial test posting unless separately authorized.
8. On any failed gate do not promote. After promotion failure, rollback as below. Report actual deployment IDs/commits/results; no full go-live PASS based on local build alone.

## Rollback
- Before domain promotion: delete nothing; leave current domains on their exact deployments. Staged failures do not affect live domain.
- Runtime rollback: Finance dpl_4M1AqukgaBCWRWBtp2HkuT9fapf3; MYOPS dpl_8p4DSjybCUDzyMFbo1UGrPYs7oV1. Reinspect alias mapping before use; do not rollback to failed MYOPS build.
- Finance additive columns and entered bank data remain. finance-db-rollback.sql removes only three newly added restrictive policies if necessary; existing RLS/broker stay enabled. Never restore TRUNCATE or drop populated columns.
- Central rollback SQL preserves exact captured old validator definition; restoring old runtime/function reintroduces known activity-sync limitation. Use only if needed during coordinated rollback; fail-closed access suspension is preferable to an entitlement bypass.
- No credential changes planned. If a separate secure credential change becomes necessary, prepare its provider-managed rollback separately; do not export old secret values into this pack.
- No deletion of deployments, projects, branches, links or databases.

## Approval boundary
Owner approval requested for these production database changes, controlled staged builds, coordinated promotion and normal authentication/read-only acceptance. This pack itself authorizes none of them. Staging UI/native-file chooser and broader format/edge-case limitations remain documented in the existing UAT evidence.



## Authorized execution attempt — 29 October 2026
Owner explicitly approved production deployment/live website. Approval persists; no repeat production approval is requested for the reviewed scope.
- Set autoAssignCustomDomains=false on both existing Vercel projects to hold custom domains while production builds are tested. Main automatic-deploy hold remains in vercel.json. No protection/RLS/auth switch disabled.
- Published exact reviewed Finance tree37b553d6aa41418cc84c66734643341ec5dd446f (identical to local candidate) as remote commit5d4c177cce9053b4196eb58a8a83cd462df2b98c on main, expected-head lease32a5e06. No divergent branch merge or new branch.
- Created Finance production-target deployment dpl_9eoSt1VXfYzN6Wqoq57ieCuF5WbV; READY. Official app domain remains on previous deployment, no promotion performed.
- Retried approved MYOPS824a996 production-target build dpl_HvBgXRi1uAeKcD8pK7MufVXD4fB5; ERROR. Current log explicitly reports Production SSO configuration is incomplete: MYOPS_SERVICE_ROLE_KEY. The key's earlier update has not resolved this preflight failure.
- Sensitive variable retrieval confirms decrypted=false/no returned value; no secret was printed, reconstructed or replaced. Supabase connector exposes publishable keys only, not existing server secret/service-role values. Do not substitute a publishable key, random password, staging key, or relax validation.
- Finance/central production database migration scripts NOT executed because required credential gate failed first. No subscriptions, memberships, identity links or business records changed. Official-domain mappings verified unchanged: Finance dpl_4M1AqukgaBCWRWBtp2HkuT9fapf3 and MYOPS dpl_8p4DSjybCUDzyMFbo1UGrPYs7oV1.
- Required input: owner securely sets MYOPS_SERVICE_ROLE_KEY in portal Production to the existing valid Supabase server secret (sb_secret_...) or valid service_role JWT for central production projectuhuukcztdifvpjuopdea. Never paste it into chat. Then retry the same reviewed MYOPS build, proceed with approved database steps and promote only after gates pass. Signing/broker pairing and authenticated production UAT still pending, not claimed PASS.


## Credential revalidation after owner update
- Owner updated MYOPS key securely. Same MYOPS runtime824a996 production build dpl_4uHtWS9keLfUU9WmryHaAaThzM7h READY, original preflight now PASS.
- Added small server-only build verification script to both main branches to validate actual upstream access without exposing secrets; no runtime auth/entitlement relaxation. Finance b7e4098ae0cdb778b15ac04c3807b302f7f9316a and MYOPS723772bae06034373f783f80d22bd325de5b6627. Release script reads Production environment only and prints PASS/FAIL; it does not persist credentials or return user data.
- MYOPS credential-verified build dpl_3R17StXbvM1cqYHRZLnqX8or93Tp logs RELEASE_CREDENTIAL_CHECK PASS MYOPS server credential. REST read confirms correct Production project, enabled Finance client and valid server access. Status at inspection: READY.
- Finance credential-verified build dpl_2bqb2sZrnhsqV14G1HB5oD2Zm4aC FAILED, with RELEASE_CREDENTIAL_CHECK FAIL: server credential rejected HTTP401. Script completed database-target, derived Ed25519 public-key fingerprint equality and broker hash equality before this request. The remaining failing boundary is Finance SUPABASE_SERVICE_ROLE_KEY upstream access to ozkjsihuovzpujuabupa, not MYOPS key, signing key or broker mismatch. A scoped Supabase edge-log read independently shows401 for the probe window. No secret values logged.
- Long inline build verifier was rejected by Vercel input validation (>256 characters), creating no deployment; moved verifier to repo script. No protection, key or validation was bypassed to fix that tooling limit.
- Keep both custom-domain assignments held. Database release scripts still NOT executed, no Production promotion or financial test writes. Need owner to securely correct Finance project's Production SUPABASE_SERVICE_ROLE_KEY using OpsFinance project's valid server key; do not reuse central/staging/publishable key. Existing production approval persists. After update rerun Finance verifier, then continue approved DB changes and coordinated promotion/UAT.


## Finance credential update diagnosis
- Confirmed Production SUPABASE_SERVICE_ROLE_KEY metadata updated1793264514955; preview variable separate, no production override duplicated.
- Retried build dpl_2a3vRmm1ccCMz6aJsKCvYjDCTDYJ still failed401. Read-only SQL confirms service_role has SELECT on identity links, private-schema USAGE and EXECUTE on broker/request functions; missing database grant is not evidenced.
- Added sanitized credential format/role/project/expiry and error-category diagnostics (Finance main4fe2fbc8f175b6c7282fa5be26d23f6178e7212e; no runtime behavior change). Build dpl_NV5DoRjVH4fE58NmayUJwj1Thbd1 fails BEFORE the network request: RELEASE_CREDENTIAL_CHECK FAIL: server credential is neither secret API key nor valid JWT.
- Thus updated value is not recognizable as sb_secret_ or parseable service_role JWT. No credential content, JWT claims or private key printed. Do not guess/repair value, bypass validation or copy central credentials. Owner must securely enter full existing OpsFinance server key value only (no variable assignment/quotes/padding), Production target.
- Production release authorization remains valid. Domains remain on old deployments; DB release migrations and promotion remain withheld until credential gate passes. No Production business/session changes performed by failed build probes.


## Production database release complete; exact promotion approval blocked
- Owner saved corrected Finance Secret. Fresh credential-verified build dpl_6TRAvP1gEdUW4Mop9uXveHVaMe1Q, Finance commit4fe2fbc8f175b6c7282fa5be26d23f6178e7212e, READY/production. Logs RELEASE_CREDENTIAL_CHECK PASS Finance signing, broker, server credential. Secret remains hidden.
- Central credential-verified build dpl_3R17StXbvM1cqYHRZLnqX8or93Tp, portal commit723772bae06034373f783f80d22bd325de5b6627, READY/production.
- Applied approved Finance migration20261029093844_production_finance_bank_verification_release on ozkjsihuovzpujuabupa. Verified3 bank detail fields,1 statement proof field,3 new restrictive policies,0 anon/authenticated TRUNCATE grants, broker enabled and20 broker policies retained. No business records changed.
- Applied approved central migration20261029093846_production_sync_live_app_activity_to_central_login on uhuukcztdifvpjuopdea. Verified installed validator contains central login activity synchronization,15-minute idle and12-hour absolute checks. This is installed-function verification, not another real-time production idle-browser acceptance.
- Fresh unauthenticated Finance candidate /dashboard returns307 to https://www.myops.com.my/login; no protected data returned.
- Production promotion commands to both exact deployment IDs above were REJECTED by automatic approval review. Stated reason: exact two-project live-domain promotion authorization was not sufficiently explicit, despite prior owner production/live-site approval. No alternative API/browser/CLI used to bypass rejection.
- Confirmed official mappings remain unchanged after rejection: www.myops.com.my→dpl_8p4DSjybCUDzyMFbo1UGrPYs7oV1; app.myops.com.my→dpl_4M1AqukgaBCWRWBtp2HkuT9fapf3. Databases have additive approved release updates; old runtime continues behind existing broker/RLS.
- Need exact owner confirmation to promote portal dpl_3R17StXbvM1cqYHRZLnqX8or93Tp to www.myops.com.my/myops.com.my and Finance dpl_6TRAvP1gEdUW4Mop9uXveHVaMe1Q to app.myops.com.my. No repeat credentials/database changes needed. After approval, promote tested builds, verify actual alias assignment and authenticated browser SSO/read-only acceptance before claiming full live PASS.
