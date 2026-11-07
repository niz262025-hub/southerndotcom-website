# MYOPS Phase 1 Web and seven-day trial acceptance scope

Owner order, 30 October 2026. Staging only. Preserve completed MYOPS/OpsFinance; finish OpsFlow full web UAT, then OpsPS full web UAT, then central subscriptions. OpsWMS, OpsHR, Android and iOS are Phase 2. OpsHub stays separate. This document records requirements, not implementation PASS.

## Central plans
- Free Trial: RM0 for exactly7×24hours from explicit server-side activation; no payment card, charge or automatic renewal.
- First100Subscribers: promotional package; allocation must be atomic and tested, with final prices/terms from owner-approved configuration.
- Normal Subscription:2 chosen applications.
- All Apps: every available application.

## Trial identity, quotas and retention
- One trial per eligible account/company;1user and1company.
- Maximum30related transactions per application. Define each app's actual transaction event before implementing counters; use atomic/idempotent server-side quota enforcement. Failed or rolled-back writes must not consume quota.
- Trial expiry locks access/premium actions automatically; preserve all data. Upgrade retains identities, company and data.
- Eligibility, activation time, expiry and feature checks belong to central/server APIs. UI controls alone are insufficient. No duplicate app billing/auth/subscription systems.

## Requested feature limits
| App | Trial scope | Premium/restricted |
|---|---|---|
| OpsFinance | Dashboard/basic transactions;2bank-statement files;5invoice/receipt documents | Reconciliation and P&L/Balance Sheet preview only;PDF/Excel export premium |
| OpsFlow | At most2workflows, adapted to actual implemented workflow model | Automation/advanced approval premium |
| OpsPS | At most2projects | Advanced reporting/export/multi-user premium |

Map quotas to real existing functionality without breaking essential evaluation flows. Document any mapping before claiming it implemented; do not invent workflow functionality that the current app does not contain.

## Security and UAT gates
- Single MYOPS login; entitled apps open dashboard without another application login.
- Central subscription and feature authorization rechecked server-side.
-15-minute inactivity logout, existing RLS/audit/tenant boundaries retained.
- Test trial activation/repeat rejection/expiry, exact UTC duration, quota boundaries/concurrent requests/retries, denied premium APIs, upgrades preserving data and no payment/card/automatic renewal.
- Keep subscription/payment schemas and changes in staging. ToyyibPay FPX/DuitNow is the final step after separate owner approval. No production deployment/merge under this order.
