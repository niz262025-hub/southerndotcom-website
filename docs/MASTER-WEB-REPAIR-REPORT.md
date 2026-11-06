# MYOPS live web repair — implementation and UAT preparation

Date: 7 November 2026, Malaysia. Release recommendation: **NOT READY**.

This is an interim implementation report. Four development PRs and preview builds exist. The nine-item programme and OpsHR V1 are not complete. No production promotion, database mutation, paid service, APK, native iOS build or app-store configuration was performed in this work.


## Latest recovery update — 7 November 2026

The Central/Finance staging database APIs are operational. A missing project in the connected Management API is not proof the database is unavailable: direct publishable-key health checks returned HTTP 200 for both existing isolated projects. Management access remains unavailable, so schema administration through that connector is still blocked.

Root cause: preview credentials and SSO flags are scoped to the existing staging branches, not the new repair branches. The registration repair was integrated into `feat/myops-isolated-staging` and Finance repairs into `feat/myops-launch-session-bridge`; no production credential was copied or production branch merged.

| Recovery surface | Evidence |
| --- | --- |
| Central UAT source | `fb4b79e94fda7deeb83b6e545a88b8b2df22ee64`; 168 tests passed, 36 skipped; lint/build passed |
| Finance UAT source | `bc6ebdca6852ebb0580d6d1cba311cd85866c353`; 291 tests passed, 1 skipped; typecheck/build passed |
| Central preview deployment | `dpl_8v2fmRQNJbwtv9VCYrfRQDjHVKA6`, READY |
| Finance preview deployment after transport renewal | `dpl_6fESeJyhauKJeWjGPNeUrxFsfTMR`, READY |
| Central signed-out session probe | HTTP 200, `signedIn:false` |
| Central public subscription-capacity probe | HTTP 200, expected bounded response fields |
| Unauthenticated application launch | HTTP 401, “Sign in to continue.” |
| Finance login and protected dashboard without session | HTTP 307 to the isolated central staging login |
| Browser state | Secure credential request reported submitted, but a fresh /account tab returned to /login. No explicit error was displayed and field validation passed. Authenticated session is NOT verified; manual sign-in handoff is required. |

Stable UAT login: https://southerndotcom-website-git-feat-myop-ca0019-mohd-syaiful-nizam1.vercel.app/login

The expiring central preview transport authorization was renewed only on Finance's existing staging-scoped environment variable, and Finance was rebuilt to receive it. Protection remains enabled. The renewal expires within 23 hours and may need renewal for later UAT.

These recovery counts describe the existing staging branches. They are not added to the earlier 698-test count, and the staging branches must still be reconciled with the exact final release candidates before production approval. In particular, neither a healthy API nor the signed-out redirect tests prove successful SSO launch, subscription/trial activation, email confirmation, tenant isolation or global logout.

Current next gate: complete manual sign-in in the existing central UAT browser and verify a positive signed-in signal, then test entitled application launch and session handling. The secure form reported submitted but did not produce a verifiable session; do not treat submission as PASS. No database mutation or production promotion was performed during this recovery.

## Source and deployment inventory

All new work uses `fix/myops-web-master-repair` in the four changed repositories. MYOPS, OpsFlow and OpsPS use the inspected live branch as their PR base, avoiding unrelated changes in other branches. Finance uses latest main to retain the newly added bank-ledger feature and explicitly restores report fixes found on the live branch.

| Application | PR | Source commit inspected before this work | New implementation |
| --- | --- | --- | --- |
| MYOPS | https://github.com/niz262025-hub/southerndotcom-website/pull/36 | `71cbb0f8c0a35faf3995e5ecc7c4b2c0c05abfff` | Contact profile and confirmation redirect |
| OpsFinance | https://github.com/niz262025-hub/OpsFinance/pull/37 | Live `1bbd75c2d86ea68d1c75a4babeb1290d9e523482`; main `17302c8184c7790b0d987c7f32d24f9437711419` | Shell, mobile header, report corrections, hosted auth guard and P&L aggregation |
| OpsFlow | https://github.com/niz262025-hub/OpsFlow/pull/7 | `99cf601aa6d7f639561059ca92f90031128fe538` | Narrow web menu and scrollable tables |
| OpsPS | https://github.com/niz262025-hub/OpsPSMobileR1/pull/9 | `4ce533e89426d997cf1dd52af6af8a9faba46800` | Trip action wrapping and readable web tabs |
| OpsHR | Existing draft https://github.com/niz262025-hub/OPSHR/pull/22 | `fix/opshr-homepage-build`, `03cea6353135431e7a5b734e608a33bb0812d006` | Inspected only; no new OpsHR implementation in this batch |
| OpsWMS | No independent repository/deployment identified in this audit | Central catalog and portal | Kept Coming Soon |

## Completed implementation in this batch

- MYOPS: new company form captures name, SSM, company email, PIC, contact and address; individual form captures name, account email, contact and address. Metadata validation bounds length/type and rejects malformed contacts. New forms require their fields; legacy partial profile updates remain compatible. These details are descriptive and cannot establish organization membership, subscription or roles.
- Confirmation callback: existing server PKCE/session validation retained; confirmed registrations redirect to `/account`. Password recovery retains its fixed password-update route; invalid links retain login fallback. Full email-delivery UAT is outstanding.
- Finance: account name in shell, collapsible navigation preserving routes, removal of customer-facing technical labels, local-time greeting/date/clock, narrow header wrapping. Clock state is isolated from financial data rendering. Full requested dashboard composition, company logo and approved character illustration remain incomplete.
- Finance regression: reproduced five failures against latest main using tests carried by the inspected live branch. Restored signed refund/reversal P&L and selected-account ledger/statement details. Final tests pass.
- Finance security: browser inspection found a standalone local login in the initial preview when SSO flags were absent. Hosted builds now deny that fallback. Missing SSO yields a no-store 503 for protected pages/APIs and redirects login/registration to MYOPS. This secures the boundary but does not configure a working integrated preview session.
- OpsFlow: web below 900px uses an expandable menu instead of an always-visible 260px sidebar; wide financial tables scroll inside their own container.
- OpsPS: web trip heading/action wraps, Create Trip has at least a 44px touch target, and web below 600px gets readable two-row tabs with 60px targets. Native rendering is unchanged by the web-only branches.

## Requirement acceptance status

FAIL means a known requirement is still unmet. BLOCKED means the specified acceptance test cannot yet be completed. Individual passing unit tests do not make the entire item PASS.

| Item | Status | Evidence and remaining work |
| --- | --- | --- |
| 001 Central registration/profile | FAIL | New fields and validation implemented; logo upload/update/removal and live profile synchronization to all apps incomplete. No claim of tenant provisioning. |
| 002 Finance dashboard | FAIL | Shell, greeting, clock and responsive header implemented. Full approved illustration, logo, quick actions, upcoming payments and receivables remain incomplete; authenticated browser UAT blocked. |
| 003 Four languages | FAIL | Full English/BM/Simplified Chinese/Tamil translation and central preference propagation not implemented in this batch. |
| 004 Performance | BLOCKED | P&L CPU improvement measured below. No agreed end-to-end network/device baseline and no authenticated dashboard/transition timing. Targets are not claimed. |
| 005 Navigation/logout | FAIL | Finance groups and web layouts improved. Current app exit still returns to portal rather than completing global sign-out; centralized signed revocation and one top-right control across all apps remain pending. |
| 006 Verification/auto-login | BLOCKED | Server callback tests pass with `/account` redirect. Real inbox delivery, one-use expiry and full browser confirmation/session UAT not completed. |
| 007 Mobile responsiveness | BLOCKED | Four PRs include web layout changes. Real 320/360/390/768px Android/iPhone/tablet acceptance and authenticated financial pages not verified; OpsHR audit/fixes pending. |
| 008 Central SSO/subscription | FAIL | Existing session/authorization tests pass, and Finance missing-config fallback is denied. Preview SSO environment and OpsHR launch/tenant/role integration remain incomplete. |
| 009 Seven-day trial | FAIL | Production central schema inspected has no trial lifecycle tables; trial code exists on a separate isolated-staging branch, not this release base. Full live activation, repeated activation prevention, per-app 30-transaction quotas and expiry/retention UAT remain pending. |
| OpsHR V1 | FAIL | Existing protected UAT is largely synthetic UI; persistence and central authorization are not complete. Module acceptance below. |
| OpsWMS Coming Soon | PASS (catalog only) | Read-only SQL confirms `opswms=coming_soon`; no release or product-state change. Full direct-access UAT remains to be executed. |

## Test evidence

| Scope | Automated results | Build/type validation | Browser evidence |
| --- | --- | --- | --- |
| MYOPS | 164 passed, 36 environment-dependent skipped | Lint and Vite build passed | Desktop preview shows individual fields; switching to Business displays SSM/company email/PIC/address. No registration submitted and no real inbox UAT. |
| Finance | 307 passed, 1 skipped | TypeScript and Next build passed | Initial local-login defect observed; corrected preview HTTP probes return 307 to MYOPS login/register and no-store 503 for unconfigured protected dashboard. Authenticated UI not passed. |
| OpsFlow | 28 passed, no skips | TypeScript and Expo web export passed | Authenticated desktop/mobile workflows not executed. |
| OpsPS | 199 passed, no skips | TypeScript and Expo web export passed | Authenticated desktop/mobile workflows not executed. |
| OpsHR | No new test run | Existing PR evidence only; do not count as current acceptance | Prior report explicitly records in-memory employee changes lost on reload. |

Total for four changed repositories: **698 passing automated tests, 37 skips, zero final failures**. This is not 698 browser UAT cases. Finance test summaries, build logs and benchmark JSON are retained in the Finance PR under `docs/uat-evidence/`. Other counts above are execution results from this session.

The local browser installation failed because the downloaded archive was invalid. The available cloud browser verified the desktop form but offered no viewport-resizing capability. Phone/tablet browser tests are therefore BLOCKED, not inferred from CSS or screenshots.

## Preview deployments

| App | Build status | Preview URL |
| --- | --- | --- |
| MYOPS | READY | https://southerndotcom-website-jy7739jt5-mohd-syaiful-nizam1.vercel.app |
| Finance | READY (including P&L optimization) | https://opsfinance-alde4zff2-mohd-syaiful-nizam1.vercel.app |
| OpsFlow | READY | https://opsflow-staging-cokwwhye0-mohd-syaiful-nizam1.vercel.app |
| OpsPS | READY | https://opsp-mobile-r1-nkzxxsz0m-mohd-syaiful-nizam1.vercel.app |

READY means Vercel completed its build. It does not mean module UAT passed. No preview was promoted and no production alias was assigned in this work.

## Performance evidence and limits

The reproducible `scripts/benchmark-pnl.cjs` runs only synthetic in-memory P&L calculations: 200 accounts, 10,000 journal rows, 3 warmups and 7 timed samples, same runtime and fixture. Compare the pre-optimization report implementation from Finance commit `54cb03075437ecd446d29e87b9c921390653f096` with the optimized version. It aggregates each line once instead of rescanning the journal snapshot per account; DecimalMoney arithmetic, tenant authorization, dates and signed reversals remain in place.

| Measure | Before | After |
| --- | --- | --- |
| Median P&L CPU time | 146.013 ms | 11.260 ms |
| Full result SHA-256 | `948e9af635c67c6b047308cda17d89055f4c4647a4adbb9a90a48bf6403df94f` | Same |
| Authenticated dashboard usable time | Not measured | Not measured |
| Ordinary route transition | Not measured | Not measured |

This is about 92% lower CPU time for that fixture; it is not a site-loading benchmark. Current local uncompressed web bundles are approximately 306KB (MYOPS), 2.68MB (OpsFlow) and 4.7MB (OpsPS); Finance shared first-load JS is 103KB and dashboard first-load JS 190KB. These are build outputs, not before/after speed measurements or gzip-equivalent comparisons.

## Supabase and UAT blockers

- Read-only discovery confirmed Central Auth `uhuukcztdifvpjuopdea`, Finance `ozkjsihuovzpujuabupa`, OpsFlow production `sdrcndkdvvveisgtrlvp`, OpsPS production `wrsigjhhbkbomtkaqlpw`, and existing OpsFlow staging `ojamkplflqafedmxbdxb`.
- Central `myops_profiles` has only user/name/account type/created timestamp, and organizations lack company-contact/logo fields. This batch uses existing descriptive Auth metadata; no tenant/role changes or schema migration were applied.
- Production catalog is `opsfinance`, `opsflow`, `opsp` live; `opshr` and `opswms` Coming Soon. No product state changed.
- OpsHR staging has 11 private `opshr_stage` tables with RLS enabled. RLS metadata alone does not prove correct tenant access.
- The central staging project is not visible through the connected Management APIs, but its Auth/Data API health has now been verified. See the latest recovery update above; the remaining immediate gate is secure UAT account sign-in.
- OpsHR has no active central app client/verified launch-to-tenant contract in the inspected work. Employee persistence, attendance/leave approval, payroll/payslips, private documents and reports need implementation, not just a release switch.

## OpsHR acceptance backlog

| Module | Status | Required evidence |
| --- | --- | --- |
| Employees | FAIL | Persistent create/edit/deactivate, departments/designations, reload persistence, organization A/B denial |
| Attendance/leave | FAIL | Clock records, requests, balances and authorized approvals persisted with audit |
| Payroll/payslips | FAIL | Reviewed salary/allowance/deduction rules, exact-cent calculations, authorized approval/publish, employee-only payslip access |
| HR documents | FAIL | Private upload/download/update, bounded file validation, signed access, cross-tenant denial |
| Reports | FAIL | Employee/attendance/leave/payroll data reconciliation and authorized exports |
| MYOPS integration | FAIL | One-use launch, server-verified tenant/member roles, subscription/trial enforcement, logout/revocation/idle tests |

## Ordered UAT execution checklist

1. MYOPS: synthetic individual and company registration, server validation, email delivery, confirmation replay/expiry, account profile reload, logo lifecycle, repeat trial rejection, expiry/data retention, 30th/31st transaction including concurrency.
2. Central SSO: valid/wrong-audience/replayed tickets, direct URL denial, organization A/B isolation, role removal, subscription expiry, central sign-out, 15-minute inactivity in one and multiple tabs/apps. Passive polling must not renew activity.
3. Finance: onboarding/ledger/bank creation, money in/out/transfer/journal posting, refunds/reversals, statement import account mismatch, reconciliation, report balances and exports. Compare persisted totals with UI.
4. OpsFlow retail POS: sales/refunds/payments, stock movements, purchase and finance totals; mobile menu/financial tables.
5. OpsPS personal shopper: trip/product/order/payment flow, Create Trip action, all seven web navigation tabs and labels.
6. OpsHR: execute each module/tenant/role scenario above using synthetic employee data only.
7. OpsWMS: Coming Soon display, no active launch, direct entry denial.
8. All four languages: menus/forms/messages/report labels, centrally saved preference on relaunch, financial values unchanged; desktop, Android browser, iPhone Safari and tablet widths.
9. Cross-app integration: permitted subscription combinations, independent app use, verified organization identity and finance reconciliation.
10. Performance/security/regression: agree network/browser/cache/data conditions, record before/after repeated usable-dashboard and route timings, audit RLS/storage, test negative authorization and rollback.

## Production release and rollback plan — not authorized yet

- [ ] Complete all known unmet requirements and clear skipped environment-dependent acceptance checks.
- [ ] Configure approved isolated previews without production credentials; record exact app and migration commits.
- [ ] Pass desktop/mobile UAT in the required order with screenshots, HTTP evidence and database assertions.
- [ ] Review migrations and non-destructive rollback on test data; none were created by this batch.
- [ ] Resolve all draft PR review findings and rerun checks on the exact release heads.
- [ ] Prepare a production-configured staged deployment without assigning live domains, then verify it; do not assume a preview build is identical to a production build.
- [ ] Present complete evidence and request owner release approval. No approval request is made in this interim report.
- [ ] Promote the approved tested build to existing domains, then run controlled production smoke/UAT.
- [ ] Roll back if auth/tenant isolation, accounting accuracy, critical workflow or mobile access fails.

Recorded pre-work production rollback candidates: MYOPS `dpl_FAqxWU7ArhnXAQagerZLBfMDh22p`, Finance `dpl_68GwQ4J4KXUL63iAKbDgMsT3mwj5`, OpsFlow `dpl_5ZtAyiEnsWXZxe17Ug7TKRPmcN4C`, OpsPS `dpl_21dy75b6yShU5j3dqTed1HhjL8PJ`. Re-read domain aliases and actual active production IDs immediately before release; these are historical inspection records, not permission to restore them. OpsHR protected UAT rollback is documented in existing PR 22.

Current rollback is simply to discard these previews/branches: this batch made no database mutation or production deployment. Future rollback must preserve customer data; reverting an app does not revoke issued sessions or undo a migration. Disable affected access gates and revoke only affected sessions through the reviewed central flow, and use a tested compatible migration strategy.
