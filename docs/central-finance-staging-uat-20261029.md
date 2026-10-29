# MYOPS → OpsFinance staging UAT — 29 October 2026 (MY/SG)

## Verified environment

- MYOPS isolated staging database: wengxxiqwtosirealghx.
- Finance isolated staging database: tfwizcztyktdurmiynzs.
- Finance preview deployment: dpl_6HWAijrF1S26m4NK4J2jaETG6KhS, source 4a345fcfa03e5e59eefbc4a5bd111ffb6414858a, READY.
- Explicit owner authorization: one-hour temporary OpsFinance entitlement in staging and one-hour Vercel staging share-access renewal for the Finance → MYOPS server connection.
- No production deployment, production entitlement, production database change or payment was performed.

## Results

| Boundary | Result | Evidence |
|---|---|---|
| Real MYOPS sign-in | PASS | Secure user sign-in; settled navigation shows My Account and Logout |
| No-package state | PASS (UI) | Authenticated account initially displayed No subscription and no Finance Open App button |
| Temporary package state | PASS | Owner-approved one-hour Finance-only staging entitlement produces Open App; other products remain unavailable without their package |
| Launch ticket issuance | PASS | MYOPS audit event ticket_issued; ticket passed in fragment, removed by Finance launch page |
| Ticket redemption | PASS | MYOPS audit event ticket_redeemed at 2026-10-28 20:40:56 UTC |
| Identity exchange and protected dashboard | PASS | No second password prompt; Finance /dashboard displays authenticated SSO Staging Fixture workspace using its existing explicit identity link |
| Central logout | PASS | MYOPS Logout returns navigation to Register/Login |
| Existing Finance session after central logout | PASS | Reloading the previously authenticated Finance dashboard redirects to MYOPS /login |

## Diagnosed and repaired

The first launch failed before accepted redemption. The existing Finance staging share-access configuration was stale. After explicit owner permission, renew its Vercel access for one hour, update the preview-branch-only server environment, and redeploy the same Finance commit. A server-side bootstrap probe confirms HTTP 307 to the original endpoint and a protection cookie. The subsequent signed redemption and dashboard load succeed. No bypass token, auth cookie, launch ticket, password or private signing key is stored in this document.

An earlier check compared email addresses across the two identity stores and found no email match. That is not a mapping failure: the actual SSO uses the pre-provisioned opaque MYOPS user reference mapped to an existing Finance fixture identity. Do not add automatic email matching or create duplicate identities based on that check.

## Limits and next gates

This proves the real two-app login/launch/logout story in staging. It does not certify production, the other apps, idle/absolute expiry in the live browser, package revocation, cross-tenant direct API/Storage denial, or accounting workflows. Existing unit/database regressions cover several of these paths, but hosted acceptance remains required before production cutover. Production MYOPS app-client enrollment and the Finance production broker gate remain outstanding.

The temporary package and share access expire automatically; do not renew or expand them without the owner's authorization. They do not authorize purchases or an ongoing automation.


## Staging-only repair revalidation — 29 October 2026, 09:15 MY/SG

This entry supersedes the earlier temporary-access limits and readiness observations above where explicitly stated. No production configuration or deployment was changed in this continuation.

- Current MYOPS staging: dpl_4RgtQ2sqRY6pK3GwaJVyRhNbuipw, feat/myops-isolated-staging, c05fd4c72cbe5f7537d988df209b7722dca2af2f, READY.
- Confirmed Finance MYOPS_ORIGIN matches the MYOPS staging branch alias, which resolves to that deployment. MYOPS Vercel Authentication remains enabled.
- Finance's sensitive share-token variable was last updated for the previous one-hour renewal. Its value cannot be decrypted through Vercel. The alias has an existing unexpired share link; no link was created, deleted, or expanded.
- Reused that existing link in MYOPS_STAGING_SHARE_TOKEN, restricted to Finance preview branch feat/myops-launch-session-bridge. This repairs stale deployment-protection transport configuration without changing application authentication or entitlements.
- Redeployed Finance staging only, same source 4a345fcfa03e5e59eefbc4a5bd111ffb6414858a, new deployment dpl_9fSiy69DDmxAZZYkx4TKnFBWZxbx, READY. No source change or runtime PR needed for this configuration-only repair.
- Alias share access expires automatically at 2026-10-29T19:16:29Z (30 October 03:16 MY/SG). Finance SSO will fail closed after expiry unless an authorized access arrangement is provided.
- Current user's existing Finance staging subscription is active through 2026-10-29T23:08:26.649593Z (30 October 07:08 MY/SG). No subscription was modified in this continuation.
- Ed25519 public key derived from Finance's configured private key matches MYOPS's registered current public key. No private material is stored here.
- Live bootstrap with the existing alias link: HTTP 307 and protection cookie present. Signed /api/app/redeem with a fabricated ticket reached the application and returned 401 'Launch ticket is invalid or expired.' Signed /api/app/entitlement for a nonexistent session returned 403 with entitled=false/session_active=false. These are expected application denials and prove accepted transport/signature without granting access.
- Existing Finance staging identity links are enabled and backed by OWNER business memberships.
- Automated Finance SSO regression: 21/21 pass (transport, session, launch, identity bridge). MYOPS suite: 140 pass, 36 skipped because PostgreSQL binaries are unavailable, zero failures.
- Browser credential request returned submitted, but fresh MYOPS page still showed Login/Register and no website error. Therefore this repair's full browser acceptance is BLOCKED at confirmed sign-in, not passed. Earlier historical successful UAT above does not certify this deployment.

### Remaining web checks in priority order

| Application | Development | Integration | Testing in this continuation | Go-live readiness |
|---|---|---|---|---|
| MYOPS | Existing portal preserved | Finance transport repaired; browser launch pending | 140 pass, 36 skip | Blocked on current authenticated browser acceptance |
| OpsFinance | Existing dashboard | Staging token aligned, new preview READY | 21 SSO tests pass; live negative endpoints pass | Browser dashboard unverified |
| OpsFlow | Existing frontend and Python backend | SSO code exists; hosted dependencies not verified | 4 frontend tests pass using existing adjacent TypeScript dependency; 3 Python signing/response tests pass | Partial; full install/build and hosted Firebase/MongoDB/session checks outstanding |
| OpsPS | Existing web code; fix/web-first-provisioning | Hosted central SSO not verified here | 133/133 unit tests pass (16 files); TypeScript passes; fresh-schema provisioning test passes (17 tables, RLS, bootstrap denial, existing-install guard) | Partial; hosted UAT outstanding; existing draft PR #5 not merged |
| OpsWMS | Repository lookup returned GitHub 404 | Unverified | Untested | Blocked on repository existence/access |
| OpsHR | Repository lookup returned GitHub 404 | Unverified | Untested | Blocked on repository existence/access |

No percentages are assigned: there is no verified acceptance denominator for any complete application. OpsHub remains separate. Mobile development remains Phase 2.


## Navigation latency follow-up — 29 October 2026

User confirmed dashboard access, then reported slow function clicks. A live browser session was observed in the authenticated SSO Staging Fixture. This supersedes the prior sign-in blocker for that session.

Two confirmed serial costs were reduced on Finance preview branch feat/myops-launch-session-bridge only:

- Commit 1ac522167ec02c5ab55c53ed66b42a1ff0632359: reuse Vercel protection transport cookie for at most 30 seconds on a warm server, keyed by portal origin and a hash of the existing share token. Concurrent bootstrap requests share a promise. Failed exchanges are discarded. Production forwarding remains disabled. Every application entitlement request still makes its signed upstream POST; no user/session entitlement is cached. Regression suite 22/22 passed and TypeScript passed. Deployment dpl_HhKEXJr1SEQc5WVbbjmPyWcdHiRL READY.
- Commit 4d14de19f8fa6ce16e478cdf0896c34ba5d2a791: run entitlement and explicit identity-map lookup concurrently, then run Supabase identity validation and business membership lookup concurrently. All results must succeed before returning the RLS user client. Identity/proxy/middleware tests 10/10 passed; TypeScript passed. Deployment dpl_CRnd78z4JXvHBzpJPW2sFFN7dBQU READY. Browser reload retained the authenticated workspace; Transactions data finished loading (table present, loading indicator absent). Recent scoped warning/error logs returned no entries.

Browser dashboard, Chart of Accounts and Transactions navigation succeeded on the first optimization. No financial write or posting was submitted. Navigation still shows latency; no before/after percentage or full performance pass is claimed. Cold starts, duplicate per-page verification and database query timing remain to be measured. No production deployment was performed; no branches or infrastructure were duplicated.


## Finance accounting and session validation follow-up

- Full local Finance suite: 256 passed, one skipped (hosted persistence test has no configured test credentials). Database replay/isolation harness passed all 17 available migrations and identity ACL, tenant isolation, broker, cross-business journal-reference and bootstrap checks.
- Hosted Finance staging rollback-only SQL acceptance: MONEY_IN 100, MONEY_OUT 30, TRANSFER 20 and JOURNAL 10 all POSTED with balanced journals. Repeated idempotency keys returned DUPLICATE with the original transaction IDs. Cash balance 50, bank balance 20, revenue 110, expenses 40, net profit 70 matched. Unbalanced posting was rejected with no leftover transaction. All generated accounts, journals, transactions, financial accounts and audit rows rolled back; no lasting business data changes.
- Hosted MYOPS staging rollback-only session acceptance: 14m59s idle session active; passive validation leaves activity timestamp unchanged; exact 15m idle is denied even when touch=true; revoked central login invalidates app session. All temporary session fixtures rolled back.
- These hosted tests call installed database functions through the administrative SQL connector with a test user claim; they do not independently prove browser/API authentication or RLS. RLS/broker negatives were covered by the separate database harness. Report UI rendering/export and full browser posting remain acceptance gates.
- Browser session from the previous turn is no longer present (inventory contains only about:blank). No replacement session, entitlement, credentials, deployment or infrastructure was created in this validation run. Current runtime deployment remains the previously verified staging build dpl_CRnd78z4JXvHBzpJPW2sFFN7dBQU, source 4d14de19f8fa6ce16e478cdf0896c34ba5d2a791. No runtime source change or new runtime PR was needed.


## Authenticated UI acceptance and account privilege repair

- Fresh user sign-in verified by MYOPS My Account/Logout. Clicking Finance Open App reached the authenticated Finance dashboard without another login.
- Chart-of-accounts creation initially failed with 'permission denied for table accounts'. Hosted inspection confirmed authenticated INSERT/UPDATE absent on accounts and financial_accounts; tenant owner/admin RLS and restrictive broker policies were already present and broker enabled.
- Applied migration staging_account_management_privileges to Finance staging only: grant INSERT/UPDATE on those two tables to authenticated, guarded by RLS and restrictive broker policy presence. DELETE, anonymous and identity-mapping privileges unchanged. Rollback: REVOKE INSERT, UPDATE on these two tables from authenticated (snapshot showed neither previously granted). Production untouched.
- Chart UI created UAT-REV-1029 / UAT Test Revenue and financial UI created UAT-CASH-1029 / UAT Test Cash 1029. Rows persisted and appeared in their tables. Financial UI allows blank/raw-UUID COA mapping; initial posting was correctly rejected until mapped. A UAT Cash Ledger and explicit same-business mapping were supplied as staging fixture setup via SQL; this part was not completed via the mapping UI.
- Money In UAT-UI-IN-1029, RM100, successfully POSTED through browser and confirmed in hosted transactions. Its recorded date is 2026-10-05. Profit & Loss browser report for October displayed Revenue RM100, Expenses RM0, Net Profit RM100. These UAT rows intentionally remain in the staging fixture; they were not part of the earlier rollback-only SQL test.
- Fixed chart form stale errors and disabled duplicate submissions while saving/loading. Repository OpsFinance, existing preview branch feat/myops-launch-session-bridge, commit 4addaa51fb5c75963747e94ede6ff94b64c83646. Migration saved as supabase/migrations/20261029020000_staging_account_management_privileges.sql. Deployment dpl_G9v7gADLdnHgLETBa2fb1vL9f5TB READY. No new branch or production deployment.
- TypeScript passed; 22 targeted chart, financial-account UI and transaction workflow tests passed.
- Remaining gates: Money Out/Transfer/Journal through browser, financial-account mapping usability, report export (no export control currently implemented), reliable navigation performance measurements, and hosted RLS negative validation of newly granted account writes. Historical admin-SQL posting success does not satisfy those UI gates.


## Four UI postings, CSV export and named ledger mapping

- User-authorized staging fixtures: UAT Test Expense, UAT Bank Ledger and UAT Test Bank 1029 created via SQL fixture setup, without production changes.
- Real authenticated browser postings verified in transaction table and hosted database: UAT-UI-OUT-1029 MONEY_OUT 30; UAT-UI-TRANSFER-1029 TRANSFER 20 from cash to bank ledger; UAT-UI-JOURNAL-1029 JOURNAL 10 cash/expense adjustment. Alongside the earlier MONEY_IN 100, all four are POSTED. This exercises the current two-line cash-linked Journal form, not a general multi-line journal editor.
- Hosted journal balances: Cash 40 debit, Bank 20 debit, Expense 40 debit, Revenue 100 credit. Browser October P&L shows revenue 100, expenses 40 and profit 60.
- Added named active-ledger COA selector and required mapping before financial-account creation. Unit UI acceptance verifies visible code/name option, inactive exclusion and selected ID submitted. Ledger/financial-account reads run concurrently. Browser acceptance of this selector remains pending because the final navigation redirected to central login after the export test; no further login or entitlement bypass performed. Investigate central-login versus app-session activity propagation if active app use reproduces this timeout.
- Added Export CSV for the currently selected report and period; neutralizes spreadsheet formula prefixes and quotes embedded CSV delimiters. Browser clicked Export CSV, actual download completed, parsed file contained revenueTotal=100.00, expensesTotal=40.00, netProfit=60.00 matching the rendered report. Export is CSV only; PDF/XLSX not claimed. The CSV is a field/value representation of the current report object.
- OpsFinance existing branch feat/myops-launch-session-bridge, commit c9697789fc6e8635671d0c483d2d26b26ee97ba8; Vercel preview dpl_4Edgz5ur1VyvdMVnGpk4iPCDEXJC READY and alias verified. No new branch or production change. Full tests 258 passed, one skipped; TypeScript passed. React review applied to the two edited components (parallel independent reads, labelled controls, disabled unavailable export, no new dependency).
- Hosted account-write RLS validation under authenticated role passed: own-business insert allowed with valid broker; unauthorized business insert and brokerless insert denied with insufficient_privilege. Used a temporary broker hash scoped to the rollback transaction; all test rows/configuration rolled back and original live credential retained.
- Remaining release gates: live named-mapping selector acceptance, session activity propagation investigation, reliable latency measurements, broader hosted cross-tenant/Storage tests and upload/reconciliation/export coverage beyond this CSV story. Do not classify Finance as fully production ready from these tests.
