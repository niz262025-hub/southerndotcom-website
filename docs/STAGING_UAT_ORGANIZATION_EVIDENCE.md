# MYOPS Step 1 organization integration — staging UAT evidence

24 November 2026. This is a new staging checklist; the original MYOPS UAT Master Checklist was not located. Historical evidence is retained separately. Overall: **NO-GO**.

| Component | Repository / PR | Reviewed commit | CI | Migration / deployment | Evidence and remaining work |
|---|---|---|---|---|---|
| Central | southerndotcom-website #105 | 3ee70e554a3d09237de77975d1006e4a1d2ecc2e | 45352176564 PASS; 45352176558 PASS | Preview dpl_4So6NRSF1vJnXXqf5TKXagwqL5iU READY; org migration not applied as part of this work | Selection and local entitlement checks pass; hosted SSO and organization switching NOT TESTED. |
| OpsFinance | OpsFinance #59 draft | afffbacfb559b412230aa05c770568f49826d9b0 | 45354008422 FAIL on prior commit; fixes verified by 45354426142 PASS | New mapping migration NOT APPLIED; deployment NOT VERIFIED | Local 15 transport/session tests and one isolated database ACL/FK test PASS; protected API and hosted tenant isolation NOT TESTED. |
| OpsFlow | OpsFlow #26 draft | 41f9c8951991b23927547e8ef2db1e7c1c755fcf | 45354315117, 45354315215 and 45354315266 PASS | New mapping migration NOT APPLIED; deployment NOT VERIFIED | Local mapped tenant, cross-company denial, mapping revocation and two API tests PASS. Broad local backend suite: 32/33 PASS; existing unauthenticated-status expectation differs (expected 403, got 401) with locally installed FastAPI; pinned CI SSO and browser jobs PASS on current commit. |
| OpsHR | OPSHR #58 draft | a2d356dd596fd3ac48d45d6779ffa39c350eb76c | 45356503510 PASS on prior commit; 45357241145 PASS on current commit | New migration NOT APPLIED; prior Preview dpl_7nxbtu9PEjfHNkUJJAUceoXEZyK9 READY | Reconciled existing staging broker fixes; 100 local tests and two isolated database tests PASS; hosted 401 and cross-tenant tests NOT TESTED. |
| OpsPS | OpsPSMobileR1 #30 draft | d4b8da7858b6667d2ab378ea913d7bdf2c56cea2 | 45356872698 PASS | New mapping migration NOT APPLIED; deployment NOT VERIFIED | Contract, mapping FK/ACL and bidirectional tenant RLS tests PASS in isolation. Scoped grants remain rejected until session, Storage and privileged RPC integration is verified. Hosted provisioning/SSO NOT TESTED. |
| OpsRental | OPSRENTAL #5 draft | 8413c260d754d40ed75c4959fe0b69e6f79b951d | 45356447967 and 45356447971 PASS on prior commit; current test-only CI pending | No new migration applied; deployment NOT VERIFIED | 14 targeted API/document/SSO tests PASS, including bound session switching. Bound and legacy trial RPC cases PASS in isolated PostgreSQL; coordinated migration and hosted cross-tenant tests NOT TESTED. |

## Mandatory hosted gates

- [ ] Coordinated staging migration compatibility and deployment for all six components.
- [ ] Organization-bound SSO and multiple organizations with both authorized test identities.
- [ ] Cross-tenant read/write/delete in both directions; no customer data changes.
- [ ] 15-minute idle expiry, 12-hour absolute expiry, refresh and global logout.
- [ ] Organization trial and paid entitlement including expiry and revocation.
- [ ] OpsPS provisioning, OpsHR 401, R-01 and OpsFlow functional regressions.
- [ ] ToyyibPay sandbox regression and final integrated staging UAT.

Feature flags remain disabled until each application's full security integration is validated. No production change, migration or promotion was made in this work.
