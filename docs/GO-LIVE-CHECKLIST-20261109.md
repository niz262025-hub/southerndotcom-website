# MYOPS paid go-live checklist — 9 November 2026 (MY/SG)

This checklist follows the owner's instruction to complete each step, mark it DONE only with evidence, then continue. Scope definition is not product acceptance or authorization to activate unfinished products. The full programme remains MYOPS Central, OpsFinance, OpsPS Web, OpsFlow Web, OpsHR and OpsWMS. OpsHub remains independent; mobile builds remain outside this web release.

## Step 1 — Define the launch scope: DONE

The initial paid offering under review is the existing Founders 100 offer (RM29 once); monthly RM49/RM79 plans remain unavailable until their billing lifecycle passes acceptance. No price, plan, payment setting, entitlement or catalog state is changed by this checklist.

| Product | Current evidence | Paid-launch requirement |
| --- | --- | --- |
| MYOPS Central | Public registration/login/account entry and pricing exist. | New-user email verification, profile/onboarding, checkout and automatic entitlement acceptance. |
| OpsFinance | Existing implementation and historical authenticated admin UAT in PROJECT_RELEASE_TRACKER.md. | Fresh subscriber launch, persisted accounting workflows, tenant isolation and plan enforcement. Direct signed-out redirect is not evidence of a broken app. |
| OpsFlow Web | Existing implementation and historical authenticated admin UAT. | Fresh subscriber launch, sales/purchase/inventory persistence, tenant isolation and plan enforcement. |
| OpsPS Web | Existing implementation and historical authenticated admin UAT. | Fresh subscriber launch and product/trip/order/inventory/finance/report acceptance, with founder and platform expenses kept separate. |
| OpsHR | Current public copy offers employee-management Live UAT and an OpsHR-only trial: one user, one company, 30 employee records. Other modules are explicitly in development. | Verify persisted employee management, authorization, tenant isolation and trial limits before counting it as an accepted paid product. Attendance, leave, payroll, documents and reports are not certified by the public copy. |
| OpsWMS | Public Coming Soon. | Remain unavailable until implementation and functional acceptance pass. |

The seven-day trial currently advertised is OpsHR-only; do not present it as a trial of all apps. The Founders promise covers current/future apps, but purchase information must distinguish available functionality from unreleased modules. Historical scope/QA reports are retained as evidence for their dates, not fresh acceptance.

## Remaining steps

| Step | Work | Status / acceptance evidence |
| --- | --- | --- |
| 2 | Consistent application entry | DONE for existing administrator access: central login, product entry, application launch, refresh and return navigation verified. OpsPS and OpsHR use MYOPS custom domains. New-customer registration, billing and tenant-isolation acceptance remain separate gates below. |
| 3 | Registration / email / password recovery | DONE for registration → confirmation email → verification → login, based on the owner's confirmation on 9 November 2026 that their earlier test succeeded. Automated auth checks passed separately; no new live registration was performed in this follow-up. Password recovery remains a separate unverified check. |
| 4 | Onboarding | NOT VERIFIED: individual/business profile, company and usable next action. |
| 5 | Checkout | NOT VERIFIED: success, failure, cancellation and expected amount. |
| 6 | Automatic access | NOT VERIFIED: verified server callback, correct account/plan, retry and duplicate-payment handling. |
| 7 | Subscription management | NOT VERIFIED: status, payment history, expiry, renewal/cancellation for monthly plans before enabling purchase. |
| 8 | Product workflows | NOT VERIFIED for fresh subscriber; historical admin UAT is insufficient. |
| 9 | Security / backup recovery | NOT VERIFIED: tenant A/B, admin boundaries, API/storage denial and restore evidence. |
| 10 | Pricing / purchase terms | NOT VERIFIED: available apps, lifetime scope, limits and product-specific refund terms. |
| 11 | Support / monitoring | NOT VERIFIED: enquiry delivery, WhatsApp entry and operational error/payment monitoring. |
| 12 | Production customer acceptance | NOT VERIFIED: desktop and phone register → verify → pay → access → persist workflow → relogin. |

## Evidence for this change

- Source base: 5682c57dee07c5c3c39157d7fca5927802f91e95.
- Inspected src/App.jsx, src/session.jsx and src/AuthPortal.jsx: account redirects unauthorized sessions to /login; application launches remain authorized by the server.
- Public browser audit on 9 November MY/SG: pricing monthly buttons disabled, OpsHR employee-only Live UAT, OpsWMS Coming Soon, inconsistent solution-page CTAs.
- No fresh account, real payment, production configuration, database change or deployment performed by this patch.
