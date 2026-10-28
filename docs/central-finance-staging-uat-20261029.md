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
