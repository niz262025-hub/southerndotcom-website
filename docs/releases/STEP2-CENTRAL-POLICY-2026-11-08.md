# Step 2 — central subscription and trial policy

Status: implementation and local verification complete; not deployed to production.

Owner selected the recommended original package set in this session.

| Package | Price | Access metadata |
| --- | --- | --- |
| Free Trial | RM0 / 7 days | One trial, 1 user, 1 company, 30 transactions per eligible live app |
| First 100 Subscribers | RM29 once | Capacity 100; lifetime scope |
| Normal Subscription | RM49/month | Two selected available apps |
| All Apps | RM79/month | All available MYOPS apps |

Canonical trial app identifiers: `opsfinance`, `opsflow`, `opsp`, `opshr`.
OpsFlow is retail POS; OpsPS is personal shopper management.
OpsWMS stays Coming Soon; OpsHub is separate and is not a MYOPS subscription tier.

## Completed in code

- Public pricing and server plan metadata share `src/subscriptionPolicy.js`.
- Removed conflicting 14-day trial and cheaper unselected public package copy.
- Replaced the OpsHR-only trial launcher with centrally returned eligible app buttons.
- Added OpsHR to central trial entitlements and server quota feature validation.
- One immutable seven-day window is shared across all apps; switching apps cannot restart it.
- Existing verified identity, one-company membership, no-card/no-auto-renewal, paid-access preservation and 15-minute inactivity validation remain in place.
- Production trial access is off by default and cannot enable an OpsHR-only subset: all four app adapters must be explicitly certified before admission.
- Paid lookup disables both staging and production trial grants, preventing a trial being labelled paid.
- Prepared HR quota SQL as a proposal, tested against the existing trial schema in isolated PGlite. Historical migrations were not edited.

## Verification

- MYOPS suite: 209 PASS, 36 SKIP, 0 FAIL. Skips require native PostgreSQL binaries; the PGlite trial database test ran and passed.
- Public production build and authenticated Preview build: PASS.
- Trial database cases cover 30/31 transactions for each of four apps, HR employee 30/31, replay/idempotency, expiry, shared identity, company membership, immutable window and browser RPC denial.
- Signed production quota contract tested with explicit release gates; production action remains disabled without them.
- Account trial UI tested in both Preview and production component modes.
- OpsFinance policy correction: 340 PASS / 1 environment-dependent SKIP; typecheck PASS.
- OpsPS PR #17 policy correction: 208 PASS; typecheck PASS.

## Remaining release work (later plan steps)

- Review/merge these exact changes with the other release candidates.
- Reconcile OpsFlow's diverged production baseline and open trial PRs; finish all app adapters.
- Convert `supabase/proposals/step2_four_app_trial_quotas.sql` into a CLI-created migration after inspecting the target schema and at the planned release stage. It is not applied to any hosted database.
- Verify each app's mutation and failed-write behavior against its quota mechanism. A central policy/SQL fixture is not cross-app live UAT.
- Certify all four apps, set server readiness flags, then deploy the complete release. Do not set readiness merely because unit tests pass.
- End-to-end payment and real production browser UAT remain later steps. This change does not enable new paid checkout plans or alter existing payments/subscriptions.

## Rollback

Production has not changed. Before any later release, record its current domain deployment and retain that as the rollback target. Disabling `MYOPS_ENABLE_PRODUCTION_TRIAL_ACCESS` denies new trial admission without changing paid entitlements or deleting trial records. Any later hosted SQL change requires its own reviewed rollback plan.
