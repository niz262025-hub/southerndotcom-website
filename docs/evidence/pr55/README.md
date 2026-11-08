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

## PR reviewer resolution matrix

The review findings were addressed as code/documentation changes; tests do not replace review or certify live readiness.
Implementation commit: `763285ff3ee3f6af7284edc24e0effd278112bea`.

| # | Finding | Resolution and evidence |
| --- | --- | --- |
| 1 | Earlier-run artifact retrieval could not work from dispatch and could expose real backup data | Removed artifact inputs, `actions/download-artifact`, Actions artifact permissions, and production/staging source refs. Evidence: workflow; `Actions workflow is synthetic-only and has no real backup or remote database path` test |
| 2 | Restore diagnostics could contain data; private temporary data needed cleanup | Synthetic SQL output is captured/suppressed and generated fixture, log, and ephemeral database are cleaned. Evidence: same workflow; static workflow test and `synthetic SQL restore reproduces the manifest security and ACL assertions` |
| 3 | Generic catalog counts could allow incomplete restore to pass | Checksum-verified generated manifest compares schema/table inventory, row count, RLS, policies, constraints, functions, triggers, role, and grant; malformed/altered manifests fail. Evidence: `rejects fake, altered, missing-checksum, or incomplete manifests`; synthetic SQL catalog integration test |
| 4 | Build preflight ignored Vite mode-specific `.env` files | Preflight loads selected Vite mode env and merges process env at higher precedence. Evidence: `tests/build-environment.test.mjs`, covering Preview dotenv staging config, production URL override, and public service-role key |
| 5 | Bash recursive glob did not find root/deep artifact files | No artifact traversal or glob expansion remains. Evidence: workflow static test asserts no artifact actions/inputs |
| 6 | Artifact selector was ignored and could select the wrong dump | No dump selector or external artifact input remains; the only dump is generated synthetic SQL. Evidence: workflow static test and synthetic fixture generation test |
| 7 | Custom/tar archives could be sent to `psql` | Actions accepts no external archive; it restores generated plain SQL only. Private owner-run instructions require `psql` for plain/gzip SQL and `pg_restore --exit-on-error` for custom/tar. Evidence: archive-format guard test and guide |
| 8 | `--no-privileges` excluded ACL statements | Removed `--no-privileges`; private guide retains ACL `GRANT`/`REVOKE` coverage and requires checking role membership, default privileges and ownership/global-role limitations. Evidence: owner guide |
| 9 | GitHub artifacts were suggested for real production/staging backups | Real backup/customer data is explicitly barred from GitHub and Actions artifacts; use an owner-approved secure private computer/runner. Evidence: workflow static test and owner guide |

### Validation and remaining blockers

Local regression coverage: `node --test tests/local-restore-rehearsal.test.mjs tests/build-environment.test.mjs`; full suite: `npm test`; style/build: `npm run lint`, `npm run build`; workflow syntax: Ruby YAML parse. CodeQL reported no JavaScript or Actions alerts. GitHub validation [MYOPS validation](https://github.com/niz262025-hub/southerndotcom-website/actions/runs/42491744437) and [MYOPS quality checks](https://github.com/niz262025-hub/southerndotcom-website/actions/runs/42491745186) for this commit are `action_required` with zero jobs; no hosted CI job result is available. These local checks prove code paths only, not a production/staging restore or UAT. No actual source backup is available. Gate A restore and hosted staging UAT remain **BLOCKED**. `workflow_dispatch` is available only when this workflow is on the default branch; do not merge this draft to activate it.

Owner-only next action for Gate A: use a trusted computer/runner and authorized read-only access to create and verify a restorable logical dump plus complete private manifest/checksum, including ACLs and all required schemas. Restore only into a disposable local/private database with no external target. Do not send that dump through GitHub. Hosted UAT still needs separately verified branch-scoped staging credentials/runtime binding. PR #55 stays draft, Issue #54 stays open; no database or Vercel changes, deployment, merge, or paid resources were used.

## Continuation validation — 2026-11-08

Local validation was performed against code commit `27af64623f4ab2b14c17f10684fa2ac5a7010dba`; the only subsequent change in `36c68dd1956ebeb6ff43c2aa7be8f7bfd89c01ca` is this evidence report. No repository code or environment settings were changed during this validation. No Supabase, Vercel, or payment endpoint was contacted.

### Local validation

| Check | Result | Evidence / scope |
| --- | --- | --- |
| `npm ci` | PASS | Installed lockfile dependencies. npm reported 4 development-tree advisories (1 moderate, 3 high); see audit rows below. |
| `npm test` | PASS: 257 passed, 0 failed, 0 skipped | Full local suite. All 36 tests previously skipped for missing native PostgreSQL ran, using the available PostgreSQL 16 binaries and throwaway local clusters; includes Founder/payment, S1 access/session, login-session concurrency and rollback cases. No remote database was used. |
| `npm run lint` | PASS | Exit 0; existing React-version configuration warning only. |
| `npm run build` | PASS | Production build, exit 0. |
| `VERCEL_ENV=preview npm run build` | PASS | Preview-auth build, exit 0; build-time isolation preflight exercised. |
| `VERCEL_ENV=production MYOPS_ENABLE_PRODUCTION_AUTH=true npm run build` | PASS | Production-auth build, exit 0. This is a local build, not a deployment. |
| `npm audit --omit=dev --audit-level=high` | PASS | Zero production dependency vulnerabilities reported. |
| `npm audit` | WARN / follow-up | 4 development dependency advisories: 1 moderate and 3 high (`brace-expansion`, `esbuild`, `source-map-js`, `vite`). npm reports that the available Vite fix is a major-version upgrade. No dependency changes were made in this task. |

These are local code/test results, not hosted UAT, backup verification, or a real-backup restore.

### Current GitHub check state

The latest `pull_request` validation and quality workflow runs available are [MYOPS validation run 42504909654](https://github.com/niz262025-hub/southerndotcom-website/actions/runs/42504909654) and [MYOPS quality checks run 42504909643](https://github.com/niz262025-hub/southerndotcom-website/actions/runs/42504909643), both for code commit `36c68dd1956ebeb6ff43c2aa7be8f7bfd89c01ca`. Both have conclusion `action_required` and zero jobs. No workflow run is recorded for the current documentation-only head `72ba083baf370ec102c69b8d7bf6a24f1d5b201c`; therefore there is no hosted CI result for the current head. These results supersede neither the successful historical run on `d798a273...` nor establish a pass for the current PR head.

### Gate A, hosted UAT, and remaining work

| Requirement | Status | Exact limitation |
| --- | --- | --- |
| Supabase backup listing | PASS, limited to owner-provided screenshots | Screenshots show physical backup listings, not downloadable logical dumps or verified artifacts. They do not prove backup completeness or integrity. |
| Downloadable backup, checksum, complete manifest | BLOCKED | No authorized restorable backup artifact or checksum/manifest was supplied to this workspace. Physical backup listings are not pg_dump files. |
| Isolated restore and source comparison | BLOCKED | No backup artifact to restore and no completed restore rehearsal. Do not restore into the populated MYOPS staging branch or production. |
| Hosted Preview/staging UAT | BLOCKED | The recorded Vercel metadata observation scoped staging configuration to a different feature branch; effective bindings for this PR branch are not verified. No hosted integration was run and no secrets were changed. |
| Central-login cleanup, legacy-subscription migration, integrated UAT | BLOCKED / outstanding | No migration or cleanup was executed. Preserve payment, subscription, session, order and audit data; verify mappings and rollback plan before any authorized write. OpsFlow/OpsHR and other external app repositories/access remain separate dependencies. |

Gate A remains blocked; the owner screenshots do not upgrade artifact integrity or restore status. The next owner-only step is to use a trusted, authorized private computer/runner to obtain a complete restorable logical backup and manifest, then rehearse only in a disposable local/private database. Do not transfer real backup data through GitHub or Actions. Hosted UAT separately requires owner-approved branch-scoped staging bindings and Auth/SMTP configuration. No staging/production database write, Vercel change, payment access, paid resource, deployment, or merge was performed. Keep PR #55 draft and Issue #54 open. This is safe for review as a code-only patch, not authorization to merge or a live-readiness verdict.

## Owner follow-up — 2026-11-08 17:32 UTC

This continuation reviewed the 13 existing PR commits through `b3fe9ab4d429f849a24903bf3f438a9fe2cd9951`; this evidence-only update is an additional documentation commit. No Supabase, Vercel, or payment endpoint was contacted, and no secret values were accessed or disclosed.

### Project and Vercel inventory status

The connected-resource inventory reported by the owner distinguishes MYOPS Central Auth from OpsFinance, OpsPS Production, OpsFlow Production, and OpsFlow Staging. OpsFlow Staging is a separate project, not an approved MYOPS restore destination.

| Environment | Current evidence | Safety status |
| --- | --- | --- |
| MYOPS-Central-Auth production | Historical project ref `uhuukcztdifvpjuopdea`, branch `main` | Production only; never a restore target. |
| MYOPS-Central-Auth candidate staging | Historical child ref `wengxxiqwtosirealghx`, branch `myops-sso-validation`; recorded as populated, including payment, subscription, session and audit data | Existing staging; not an empty or approved restore target. |
| OpsFinance Production | Historical ref `ozkjsihuovzpujuabupa` in the legacy schema inventory | Separate app database; not MYOPS staging. |
| OpsPS Production | Historical ref `wrsigjhhbkbomtkaqlpw` in the legacy schema inventory | Separate app database; preserve order/payment data; not MYOPS staging. |
| OpsFlow Production | Owner confirms a separate project; exact ref is not established by this PR evidence | Do not infer or use as a target. |
| OpsFlow Staging | Historical inventory ref `ojamkplflqafedmxbdxb`; owner explicitly says it is separate from MYOPS | Not an approved MYOPS restore target; never reuse or overwrite. |

These are historical project observations plus the owner's current inventory statement, not a fresh live query. The documented MYOPS Vercel project slug is `mohd-syaiful-nizam1/southerndotcom-website` (historical deployment/configuration references; `vercel.json` also names `southerndotcom-website.vercel.app`). Current Vercel project metadata is not exposed in the connected tools for this continuation.

The branch-binding evidence is inconsistent and must not be interpreted as verified effective configuration: an earlier `LIVE-READINESS.md` says Preview settings were prepared for `copilot/myops-backup-restore-central-access`; the subsequent Vercel metadata audit in this report says staging variables were scoped to `feat/myops-isolated-staging`, not this PR branch. Neither historical record proves the effective current deployment environment. Production-scoped live-payment and MYOPS production credentials were observed in prior metadata, but no current values were read. **Current branch-specific Preview bindings and production/Preview runtime separation: BLOCKED pending a fresh owner-authorized metadata-only inspection (`decrypt=false`); do not copy, reveal, or request secret values in GitHub.** No Vercel settings were changed.

### Backup/export evidence still required

The owner-provided dashboard screenshots establish only that physical backup listings were visible at the time shown. They do not establish downloadable files, a logical `pg_dump`, integrity, completeness, or a successful restore. A Restore button is not a download. Gate A requires, for the exact authorized MYOPS source(s):

- Private inventory identifying source project/ref, branch, snapshot time, PostgreSQL and `pg_dump` versions, format, and SHA-256 for each artifact, with the checksum verified after transfer.
- Schema and row coverage for every required schema, plus tables, extensions, constraints, indexes, sequences and snapshot-consistent row-count manifest.
- Auth-related and custom schemas/data as in scope; custom/database roles, memberships, owners, default privileges and `GRANT`/`REVOKE` ACLs captured or separately inventoried. A normal database dump does not by itself include all cluster-global roles/settings.
- RLS enablement and policies, function definitions/security/search paths/ACLs, triggers, and constraints compared against the manifest after restore.
- Explicit Storage coverage: database metadata/bucket definitions are not the object bytes. If object bytes are in scope, separately back up and checksum them through an approved private process; do not infer coverage from a zero object count or a database dump.
- A successful non-destructive rehearsal using only an approved disposable local/private PostgreSQL target, followed by exact manifest comparisons and sanitized evidence. No production or populated staging restore.

The raw backup, credentials, detailed manifest and checksums remain private. Do not transfer them through this repository, PR comments, screenshots, GitHub Actions artifacts, or Actions logs. Use an existing approved private computer/runner to avoid new paid resources; if none is available, Gate A remains BLOCKED.

### Phone-friendly owner checklist

Android Chrome can inspect dashboard listings and authorize GitHub workflow runs, but it cannot safely execute `pg_dump`, verify/restore a large database, or provide an isolated restore target. Use the phone only for these non-executing checks:

1. In Supabase, confirm the organization and project name/ref in the project picker. Select MYOPS-Central-Auth explicitly; keep OpsFlow Staging and all production app projects distinct.
2. Open the backup/restore page and record snapshot timestamps as **listing evidence only**. If it shows only physical backup entries and Restore buttons, stop; do not claim a downloadable artifact or click Restore.
3. Ask the authorized database owner/DBA through a secure channel whether a complete, read-only logical export is supported and already available. Do not put credentials in GitHub. Android alone is not the export/restore runner.
4. On an already-approved trusted private computer/runner, obtain the approved dump and complete manifest, encrypt and checksum them, and retain them only for the owner-approved period. Restore only to a disposable local/private target with outbound access disabled; do not use Supabase production, MYOPS staging, or OpsFlow Staging.
5. After verification, retain only redacted PASS/FAIL/BLOCKED results in PR evidence; securely remove temporary copies and credentials per the approved retention procedure.
6. Separately, an authorized Vercel maintainer should inspect environment-variable *scope metadata only* for project `southerndotcom-website`, distinguish Production from Preview and the exact PR branch, and verify Auth redirect/SMTP settings without exposing values. Do not change settings without approval.

### Hosted UAT matrix

No hosted case below is certified by local mocks or builds. All remain BLOCKED until Gate A is complete and the current PR branch is independently verified to use isolated MYOPS staging, with approved test accounts, redirect/SMTP setup, and safe payment sandbox configuration.

| Case | Required safe hosted evidence | Status |
| --- | --- | --- |
| Registration and email verification | Dedicated test identity; unverified access denied; confirmation link returns to the approved Preview callback | BLOCKED |
| Confirmation and automatic login/session | Same-browser callback establishes only the expected staging session; logout revokes it | BLOCKED |
| MYOPS SSO | Finance, OpsFlow and OpsPS each receive correctly scoped, one-use app access; wrong app/user and replay are denied | BLOCKED |
| Subscription gating | Active, absent, expired and wrong-user subscription cases allow/deny server-side; retained records stay unchanged | BLOCKED |
| Seven-day trial | One eligible account, no card/live charge, exactly 168 hours, one-use and eligibility limits enforced | BLOCKED |
| Logout and 15-minute timeout | Global logout revokes app sessions; idle app access is denied after 15 minutes; polling does not extend it | BLOCKED |
| OpsHR access | Verify the current intended deny/coming-soon behavior; do not enable or grant OpsHR access until its app is approved and integration is complete | BLOCKED |

### Current tests, Actions authorization, and review status

- The recorded local code validation remains `npm test`: **257 passed, 0 failed, 0 skipped**, including the 36 native PostgreSQL tests on disposable local PostgreSQL 16, against code commit `27af64623f4ab2b14c17f10684fa2ac5a7010dba`. Later commits through `b3fe9ab` are evidence-only. Lint and production, Preview-auth and production-auth builds passed; full dependency audit reported four development-tree advisories, as detailed above.
- Immediately before this evidence amendment, the PR head was `69cd03148b37066db49a1c2df035e559d15eb2d9`; its latest runs were [validation 42505710294](https://github.com/niz262025-hub/southerndotcom-website/actions/runs/42505710294) and [quality 42505710279](https://github.com/niz262025-hub/southerndotcom-website/actions/runs/42505710279). Both are `action_required` with **zero jobs**; Actions log lookup found **zero failed jobs**. No hosted result for this documentation amendment is claimed. The API does not expose the reason for `action_required`; it is not evidence of a test failure or pass. An authorized repository maintainer must inspect each run in the GitHub Actions UI and use the normal approval control only if GitHub presents a pending-approval prompt, then confirm a fresh run actually schedules jobs. Do not bypass repository policy or claim CI passed.
- The nine Copilot reviewer threads from `2b4a38d` are still marked unresolved in GitHub, although all are marked outdated and their findings have documented code/documentation resolutions in the matrix above (workflow artifact path removed in favor of synthetic-only fixtures; output/cleanup and manifest safeguards; Vite effective-env validation; glob/selector/archive handling no longer applies to the synthetic-only workflow; private guide preserves ACL coverage). They are unresolved review metadata, not proof by themselves that the old inline finding still reproduces. A reviewer/maintainer still needs to resolve those threads in GitHub; do not describe the review as fully closed.

### Smallest owner-only next actions

1. An authorized maintainer checks the two `action_required` run pages for the displayed approval reason, approves through the normal GitHub UI only if requested, and confirms CI jobs for the final head.
2. A database owner/DBA supplies a complete authorized logical backup plus private checksum/manifest through an approved secure route to an existing trusted private runner, and identifies an approved disposable local restore target. Never post credentials or backup data in GitHub; if the physical-backup UI has no export, ask the provider/DBA for the supported export path.
3. A Vercel maintainer confirms current project and branch-specific Preview metadata without disclosing values, then the owner separately approves any configuration action and dedicated hosted-UAT accounts/SMTP/redirect setup.

Issue #54 remains open. Its current body still contains earlier 204-pass/36-skip results; this report supersedes those test counts for the unchanged code tree. The available GitHub issue tool in this session is read-only, so the Issue #54 body could not be edited here. No merge, deployment, database write, payment access, new paid resource, or secret disclosure occurred; PR #55 remains Draft and not authorized to merge.
