# MYOPS Step 1 organization integration — staging UAT evidence

24 November 2026. This is a new staging checklist; the original MYOPS UAT Master Checklist was not located. Historical evidence is retained separately. Overall: **NO-GO**.

| Component | Repository / PR | Reviewed commit | CI | Migration / deployment | Evidence and remaining work |
|---|---|---|---|---|---|
| Central | southerndotcom-website #105 | 3ee70e554a3d09237de77975d1006e4a1d2ecc2e | 45352176564 PASS; 45352176558 PASS | Preview dpl_4So6NRSF1vJnXXqf5TKXagwqL5iU READY; org migration not applied as part of this work | Selection and local entitlement checks pass; hosted SSO and organization switching NOT TESTED. |
| OpsFinance | OpsFinance #59 draft | 719d806a953314ee9150a90acd00a07a5bf4300d | 45354008422 pending at capture | New mapping migration NOT APPLIED; deployment NOT VERIFIED | Local 15 transport/session tests and one isolated database ACL/FK test PASS; protected API and hosted tenant isolation NOT TESTED. |
| OpsFlow | OpsFlow #26 draft | 88f09ca5d8b00b06db746a5a2098d38aaa4dd0fa | 45354016812, 45354016732, 45354016787 pending at capture | New mapping migration NOT APPLIED; deployment NOT VERIFIED | Local mapped tenant, cross-company denial, mapping revocation and two API tests PASS. Broad local backend suite: 32/33 PASS; existing unauthenticated-status expectation differs (expected 403, got 401) with locally installed FastAPI; verify pinned CI. |
| OpsHR | OPSHR #58 draft | ddc9756fdd489d77e55a1d50129e48b0410cdc76 | No Actions run found at capture | New migration NOT APPLIED; deployment NOT VERIFIED | Five broker tests, typecheck and two isolated database tests PASS; hosted 401 and cross-tenant tests NOT TESTED. |
| OpsPS | OpsPSMobileR1 #30 draft | 37885fb07208bfadc5f0150df51688548dd570b9 | 45354011865 pending at capture | New mapping migration NOT APPLIED; deployment NOT VERIFIED | Eight contract tests and isolated mapping FK/ACL test PASS. Scoped grants intentionally rejected until tenant-scoped sessions and RLS are implemented. Hosted provisioning/SSO NOT TESTED. |
| OpsRental | OPSRENTAL #5 draft | 9839bedb1fd1c58d841c17211dc4e73b27b09457 | 45353977409 PASS; 45353977412 pending at capture | No new migration applied; deployment NOT VERIFIED | 14 targeted API/document/SSO tests PASS, including bound session switching. Database trial RPC compatibility and hosted cross-tenant tests NOT TESTED. |

## Mandatory hosted gates

- [ ] Coordinated staging migration compatibility and deployment for all six components.
- [ ] Organization-bound SSO and multiple organizations with both authorized test identities.
- [ ] Cross-tenant read/write/delete in both directions; no customer data changes.
- [ ] 15-minute idle expiry, 12-hour absolute expiry, refresh and global logout.
- [ ] Organization trial and paid entitlement including expiry and revocation.
- [ ] OpsPS provisioning, OpsHR 401, R-01 and OpsFlow functional regressions.
- [ ] ToyyibPay sandbox regression and final integrated staging UAT.

Feature flags remain disabled until each application's full security integration is validated. No production change, migration or promotion was made in this work.
