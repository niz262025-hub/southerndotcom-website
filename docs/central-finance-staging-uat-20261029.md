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
| OpsPS | Existing web code; fix/web-first-provisioning | Hosted central SSO not verified here | TypeScript passes; fresh-schema provisioning test passes (17 tables, RLS, bootstrap denial, existing-install guard) | Partial; hosted UAT outstanding; existing draft PR #5 not merged |
| OpsWMS | Repository lookup returned GitHub 404 | Unverified | Untested | Blocked on repository existence/access |
| OpsHR | Repository lookup returned GitHub 404 | Unverified | Untested | Blocked on repository existence/access |

No percentages are assigned: there is no verified acceptance denominator for any complete application. OpsHub remains separate. Mobile development remains Phase 2.
