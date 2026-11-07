# Web release scope — 29 October 2026 (MY/SG)

## Owner direction

Phase 1 target: six web apps — MYOPS Central, OpsFinance, OpsPS Web, OpsFlow Web, OpsWMS and OpsHR. MYOPS is the sole login and package authority for these apps. Android is Phase 2. The owner's latest instruction adds OpsWMS and OpsHR to active development scope; they must remain unavailable in the public catalog until functional acceptance passes. Do not mark them live merely because scope changed.

OpsHub is a separate standalone website with its own seller/customer accounts. Do not add MYOPS SSO or package gating to OpsHub. ToyyibPay remains deferred.

## Verified work in this execution

- MYOPS: current main 216b18c; 137 local tests pass, 36 PostgreSQL-binary tests skip; PGlite SSO database suite and production build pass. Production contains central app client/session/ticket tables. Authenticated cross-app UAT is not yet certified.
- OpsFinance: 255 tests pass, one live-persistence skip; complete migration replay and tenant/broker/atomic workflow checks pass; typecheck/build pass. PR #25 additionally requires a valid server broker credential before production SSO can start. Production has identity links but broker migration/activation and live UAT remain outstanding; do not enable SSO flags alone.
- OpsPS Web: 133 tests, session/RLS/Storage database regression, typecheck, lint and web export pass. PR #5 adds a full fresh-schema provisioning path preserving historical migrations, fixes customer-profile references and obsolete recursive policies, and makes Android builds manual-only. Full 17-table disposable database acceptance passes; web CI passes at 9f5b68f. Production still lacks MYOPS app sessions/identity links; Edge deployment and isolated hosted UAT remain outstanding.
- OpsFlow: Python SSO contract tests pass (3). Frontend dependency installation/checks are in progress. Firebase/Mongo service configuration and hosted SSO acceptance remain required; no Vercel project was found in the initial inventory.
- OpsHub: existing Supabase project iytiyugzmlsofwtortth restored from INACTIVE to ACTIVE_HEALTHY; nine public tables have RLS. New independent Vercel project opshub-standalone (prj_fQ2AVhZ5QD4Fu42JXoCzEYasFhb9) uses the existing OpsHub repository and its own database, not MYOPS. Initial deployment READY at 6bdfa6f. PR #6 fixes browser/server cookie session persistence, refresh and homepage seller/customer entry; 90 tests, typecheck/lint/build pass locally. Hosted user lifecycle acceptance remains outstanding.

## Release order and acceptance

1. MYOPS → Finance: live login-once, authorized dashboard, no-package denial, replay/expiry/revocation, global logout, direct API/Storage and tenant A/B checks.
2. OpsPS Web: isolated provisioning, reviewed Edge Function deployment, explicit identity mapping, same SSO gates plus order/inventory/payment-proof acceptance.
3. OpsFlow Web: deploy configured API/Firebase rules in staging; validate company/team/inventory workflows and tenant isolation.
4. OpsHub standalone: validate separate seller/customer registration/login, verification, product publication and order lifecycle at its independent URL.
5. Promote only passing web releases; record deployed SHA, URL and rollback target. Do not claim overall completion from CI or a READY deployment alone.

This is an execution record, not evidence that all apps are production-ready. Previous release tracker snapshots remain historical and are superseded on scope by this document.

## Six-app scope expansion

Latest owner instruction: complete MYOPS, OpsFinance, OpsPS, OpsFlow, OpsWMS and OpsHR for web. OpsHub remains an independent website and is excluded from central SSO/package integration.

GitHub inventory and local source search found no accessible OpsWMS or OpsHR implementation repository. Prior materials describe modules/designs only. These two products require new implementation; no completion percentage or full six-app 24-hour delivery guarantee is asserted.

| Product | Initial implementation scope from prior product requirements | Required acceptance evidence |
|---|---|---|
| OpsWMS | SKU/inventory, inbound receiving, bin/pallet locations, transfers, outbound pick/dispatch, barcode input, cycle counts and reports | MYOPS entitlement, role and tenant isolation; persisted receiving/transfer/dispatch; stock conservation, no double-posting, count adjustment audit and export |
| OpsHR | Employee records, roles, attendance, leave request/approval and reports; payroll/performance remain planned modules | MYOPS entitlement and tenant isolation; employee/manager access; persisted attendance; leave balance and approval audit; restricted employee data |

Payroll statutory calculation must use an explicitly selected jurisdiction and verified current rules before being called production-ready. Do not infer Malaysia or Singapore payroll from the owner's residence or employment alone.

Work order: MYOPS/Finance integration → OpsPS Web → OpsFlow Web → OpsWMS → OpsHR. Shared release gates remain authenticated login, package denial, logout/expiry, tenant A/B and real persisted workflows. All six must pass their own gates before an all-app go-live claim.
