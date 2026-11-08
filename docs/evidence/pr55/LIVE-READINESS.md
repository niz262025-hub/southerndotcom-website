# MYOPS Step 4 — continued release-readiness execution

8 November 2026. Existing PR #55 / Issue #54. Starting verified commit d798a273acb1e40614adbdb6ec9f9e0102230b8a. Verdict: NOT READY FOR LIVE.

| Phase | Status | Evidence / exact limit |
| --- | --- | --- |
| 1 Backup and restore | BLOCKED | No actual approved backup artifacts for either project; no management backup-list/download or DB password available. Library title search found no backup/dump artifact. Native private restore runner not available in local Work. Source inventory is not backup proof. |
| 2 Security | BLOCKED overall; code regressions PASS on starting commit | Production fallback fixed previously. SELECT-only staging Data API request accepted the staging service key (HTTP 200). Eleven branch-scoped Preview settings prepared; original sensitive app identity secret is unreadable/unavailable and was NOT replaced. Full hosted binding/RLS/15-minute cross-app verification pending. |
| 3 Central access | BLOCKED | Existing auth/trial/SSO tests pass on starting commit. Trial card's hardcoded OpsHR mismatch fixed. Added persisted EN/MS/Chinese/Tamil controls for account form/navigation/trial labels; marketing/legal/remaining messages and cross-app translations still require completion/linguistic UAT. Hosted verified-email/company/expiry/logout UAT awaits access and Gate A. |
| 4 Legacy migration | BLOCKED | Current Finance 2 subscriptions / 0 subscription payments; OpsPS 0 subscriptions / 1 order payment / 3 orders. Catalog FK/function inventory recorded. Mapping/compatibility/rollback design prepared; no migration executed or actual rollback tested. Identity/plan mapping and complete app/edge-function compatibility audit missing. OpsFlow staging schema/count inventory was captured read-only. |
| 5 Integrated staging UAT | BLOCKED | Staging has only Finance/Flow/PS enabled clients; HR/WMS remain coming_soon. Portal branch config substantially resolved; original app user-ref secret, app-side broker origins, callback allowlist and eligible UAT accounts not verified. No hosted signed-in test certified. |
| 6 Quality | BLOCKED overall | Starting d798a27 CI: 244/244 native PostgreSQL tests + trial integration 1/1 PASS. New code: local 247 tests, 211 pass / 36 native skips at report preparation, lint/build PASS. Final exact-commit CI and browser findings are reported in PR comments. Backup/restore, migration and signed-in hosted UAT remain critical unexecuted tests. |
| 7 Release preparation | PASS for documents; release readiness BLOCKED | RELEASE-RUNBOOK.md, legacy mapping/rollback design, UAT matrix, owner-access checklist prepared. This is not completed code review/UAT or authority to release. |
| 8 Merge/deploy control | BLOCKED / not authorized | PR stays Draft. Owner must review complete evidence and separately approve merge and production deploy. Verify/authorize production auto-deployment hold BEFORE merge so main does not deploy implicitly. Issue #54 stays open. |

## Completed in this continuation

- Confirmed PR is still open/Draft on d798a27 and main has not changed.
- Verified existing staging URL/isolation flags and publishable key format; tested staging service credential with GET myops_products?select=slug&limit=1 (HTTP 200). Credential never published; temporary private verification input removed.
- Created eleven settings ONLY for Preview / copilot/myops-backup-restore-central-access: URL/publishable key, environment/isolation flags, staging service key, session secret, three existing staging app URLs, disabled trial/live-payment flags. No production settings changed. Did not regenerate the stable app identity secret.
- Trial card now uses certified server availableApps for Finance/Flow/PS and filters unknown/unfinished apps. No activation when list is missing/empty/unsupported. Removed inaccurate OpsHR-only registration/trial promise.
- Added a lightweight persisted language selector and dictionary for central account fields/titles/buttons, shared access navigation and trial display; unknown locales fall back to English; switching does not reset entered registration data or change access/product identifiers. This is partial portal translation coverage, not full ecosystem localization PASS.
- Replaced obsolete setup documentation that incorrectly told Preview to use the production database.
- Re-inventoried Finance/PS legacy schema and wrote migration and controlled release/rollback procedures without database writes.

## Exact owner/access actions

1. Make approved private logical backup artifacts/manifests available for BOTH project refs (schema/data/roles/ACL/RLS/functions/triggers/auth/custom schemas/Storage coverage, snapshot timestamps and SHA-256). Do not paste DB credentials, production backups or sensitive data into public GitHub. A physical-backup settings screenshot alone cannot be locally restored; if needed, use an approved private logical export via database access.
2. Provide a private PostgreSQL 17-compatible restore runner or approve an appropriate private runner once artifacts exist. Local Work cannot currently run native PostgreSQL as an unprivileged OS user. Existing CI native tests are synthetic and do not establish Gate A.
3. Set the ORIGINAL staging MYOPS_APP_USER_REF_SECRET through Vercel Preview for this PR branch. Obtain it from its secure original source; the sensitive Vercel value cannot be read back. Do not invent a replacement. If lost, coordinate an explicit identity-mapping-preserving rotation plan first.
4. Verify callback allowlist and app-side staging broker origin/signing configuration; provide eligible dedicated individual/company UAT account access. Browser sign-in can be handed to the owner when an actual sign-in wall is encountered. No password/token should be posted in GitHub.
5. Supply/approve verified legacy business-to-central organization/user and plan/product mappings for actual migration rehearsal. Finance records are not automatically All Apps entitlements.
6. Only after every required gate PASS: owner approval to merge exact SHA; separate deployment approval. An effective production auto-deployment hold must precede merge if production would otherwise deploy automatically.

Engineering still pending after access is restored: actual full restore comparisons, complete legacy migration/rollback execution on isolated copies, remaining portal/app translation coverage, exact-commit integrated browser UAT, critical-findings review and release sign-off. No READY claim is made.

## Data preservation

All database interactions in this continuation were SELECT queries/GET reads. No schema/data migration, restore, financial/order/subscription/session/audit alteration, record deletion, paid resource, new PR, merge or production deployment. Preview environment settings changed as authorized above; application-local language preference is display-only.
