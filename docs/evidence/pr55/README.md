# PR #55 Gate A and environment isolation evidence

Date: 2026-11-08. Source observations: 11:51–11:54 UTC (19:51–19:54 Malaysia).
Repository: niz262025-hub/southerndotcom-website.
Branch: copilot/myops-backup-restore-central-access. Starting commit: 150e102a328b1addabd890625ba09e2dacb51dbe.

**Overall: BLOCKED. PR must remain draft and unmerged. Issue #54 stays open.**
No production deployment, remote database writes, schema changes, destructive restores or paid resources were performed. Database queries were SELECT-only. Source inventories are observations, not backups or restore verification.

## Gate A inventory

| Item | Production | Staging | Result |
| --- | --- | --- | --- |
| Project ref | uhuukcztdifvpjuopdea | wengxxiqwtosirealghx | PASS: branch connector confirms parent and child |
| Branch | main | myops-sso-validation | PASS: staging non-default, ACTIVE_HEALTHY |
| public tables | 21 | 21 | PASS: catalog inventory only |
| public tables with RLS enabled | 21 | 21 | PASS: enabled flags only |
| public policies | 8 | 8 | PASS: inventory only |
| public functions | 30 | 30 | PASS: inventory only |
| public non-internal triggers | 1 | 1 | PASS: inventory only |
| public constraints | 113 | 113 | PASS: inventory only |
| Storage buckets / object metadata rows | 1 / 0 | 0 / 0 | PASS: current metadata counts only |
| Existing complete backup artifact, creation time, checksum | Unavailable | Unavailable | BLOCKED |
| Roles, auth/custom schemas, function bodies, triggers and Storage covered by actual backup | Unverified | Unverified | BLOCKED |
| Non-destructive isolated restore / source comparison | Not run | Not run | BLOCKED |

Exact public-table row counts and observation timestamps are in [source-row-counts.json](source-row-counts.json). Staging is populated: 4 payments, 4 subscriptions, 1 payment event, 1 lifetime entitlement, 1 trial, 124 app audit records, and existing sessions/tickets. The branch metadata `with_data=false` does NOT establish emptiness. Never restore into either existing remote database.

The connector has no backup-list/download/export or database connection credential capability. No backup artifact was supplied in this workspace/repository. Backup existence is unverified, not absent. The project also contains other schemas (including production OpsHR), so public-only counts cannot certify a full database backup.

Docker, psql, pg_dump and pg_restore were unavailable in this sandbox. Installing PostgreSQL failed because the runtime cannot switch the required user/groups; no escalation was attempted. PGlite repository SQL checks ran, but are not a substitute for restoring a real Supabase backup or the skipped native PostgreSQL concurrency checks.

## Code audit and fixes

Reviewed all original changed files: scripts/build.mjs; server/project.js, trial-access.js, production-preflight.js, app-access.js, auth.js, payments.js; tests/project-selection.test.mjs, trial-access.test.mjs, production-preflight.test.mjs. Also checked service-key.js and toyyibpay-callback.js consumers and the updated auth/app-access/payment fixtures.

The previous implementation returned PRODUCTION_PROJECT for Preview with missing/false staging flags. That was an isolation failure, even if older comments described it as fail-closed.

- projectForEnvironment now returns null for incomplete Preview or unknown environments; only explicit VERCEL_ENV=production can select production.
- Auth and SSO refuse unconfigured project selection before constructing a Supabase client.
- SSO service clients and payment ledger clients reject a project inconsistent with the selected environment.
- Non-production payment gateway selection refuses the production project and selects only the fixed sandbox host for staging.
- Build preflight rejects a production Supabase URL in Preview, missing isolation opt-in with a configured URL, live payment credentials in non-production, and public-prefixed secret/service-role values. Error messages identify variable names, never credential values.
- Preview test fixtures now represent the isolated staging project. Production fixtures explicitly specify the production URL. Disabled configurations are separately covered by tests that fail if an upstream client is constructed.

## Vercel configuration audit

Read project environment metadata with decrypt=false. No secret values were decrypted, copied or published.

- Live ToyyibPay key/category and production MYOPS service credential are production-scoped: PASS on visible metadata scoping.
- Staging URL/key, isolation flags, session secret and service credential are scoped to feat/myops-isolated-staging, not this PR's branch.
- This PR's branch has no complete staging configuration in the returned metadata: hosted integration is BLOCKED. A successful static Preview build is not SSO/UAT evidence.
- Encrypted/opaque credential project binding and effective runtime configuration remain BLOCKED; metadata alone cannot prove their values or hosted behavior.
- No environment variable or deployment setting was changed.

## Tests

| Test | Result | Evidence / limitation |
| --- | --- | --- |
| npm test | PASS for executed tests; required SQL subset BLOCKED | [unit-tests.txt](unit-tests.txt): 244 total, 208 pass, 0 fail, 36 skipped because native PostgreSQL is unavailable |
| npm run lint | PASS | [lint.txt](lint.txt), exit 0 |
| npm run build | PASS | [build.txt](build.txt), exit 0, no hosted credentials |
| Project/flag isolation, preflight, trial gates | PASS | [isolation-tests.txt](isolation-tests.txt): 10 pass, 0 fail |
| Real build process: safe isolated preview | PASS | [build-isolation.txt](build-isolation.txt): exit 0 |
| Real build: production URL / missing opt-in / live key / public secret | PASS: rejected | [build-isolation.txt](build-isolation.txt): each exits 1 as expected |
| Auth, SSO, access controls, expiry, trial and payment negative cases | PASS locally | Named cases in unit-tests.txt; mocked clients and local SQL, not hosted integration |
| Native PostgreSQL concurrency, payment and session SQL tests | BLOCKED | 36 skips; do not count them as passes |
| Full backup/restore schema, rows, constraints, RLS/functions comparison | BLOCKED | No verified backup or suitable native local restore stack |
| Hosted staging SSO, entitlements, trial and payments integration | BLOCKED | Gate A incomplete and this PR branch lacks complete isolated env scoping |
| Latest remote checks on new commit | BLOCKED until observed | Old commit checks cannot certify this patch |

Supabase security advisors returned INFO notices for RLS-enabled tables without policies (13 staging; 15 production including two OpsHR tables), and WARN for leaked-password protection disabled in both environments. No ERROR-level advisory was returned. No-policy service-only tables require grants/function review rather than automatically adding public policies. These observations do not certify absence of all critical issues. [RLS advisor guidance](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy) and [password protection guidance](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).

## Remaining work and restore/rollback procedure

1. Obtain actual backup inventory for BOTH project refs through the owner-authorized backup interface: artifact location, format, snapshot timestamp, source ref, PostgreSQL version and checksum. Keep credentials/data outside GitHub. Do not treat the source-row inventory as a backup.
2. Securely export/obtain schema, data, roles, policies, routines, triggers, auth/custom schemas and Storage dependencies. Snapshot counts must correspond to the backup transaction/time; these live counts may change. Supabase database backups do not contain Storage object bytes; current object count is zero, but bucket definitions/ACLs still need coverage.
3. Provision a disposable LOCAL database/stack only, with matching PostgreSQL/extensions and no external production access. Confirm localhost/socket-only destination and empty disposable target. Never use either remote project ref as a restore destination. No new paid Supabase project is allowed.
4. Verify checksums, restore with stop-on-error, record command exit codes, local target identity, timestamps and redacted logs. Compare schema/columns, exact table counts, constraints, indexes, sequences, policies/RLS, roles/grants, functions/triggers, auth and Storage metadata against the actual backup manifest. Test representative authorized and rejected queries locally. Every untested comparison stays BLOCKED.
5. Restore rollback rehearsal: stop the disposable local stack; retain backup and evidence; recreate a fresh LOCAL target and repeat the restore, then confirm the same manifest. This is a proposed procedure, not an executed rehearsal. Production and existing staging remain untouched.
6. After Gate A PASS, configure this branch's Preview with independently verified staging credentials, run hosted integrated UAT and reconcile all retained records. Central-login cleanup and legacy-subscription migration remain unverified work under Issue #54; no migration was executed.
7. Re-run required automated checks on the final commit, resolve critical findings, and obtain the owner's explicit approval AFTER reviewing final evidence. Do not merge while any required item is FAIL/BLOCKED; do not automatically deploy production. Before any eventual merge, recheck auto-closing keywords and keep Issue #54 open until all its broader work is verified.

Code rollback if needed: create a follow-up commit on this feature branch that restores the reviewed prior code only. No database rollback is applicable because this run made no database changes. Never roll back isolation guards onto production as an automatic action.
