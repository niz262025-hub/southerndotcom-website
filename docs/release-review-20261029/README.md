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

