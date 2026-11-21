# Staging integration — 11 November 2026

Staging SQL access is confirmed: `wengxxiqwtosirealghx` and Finance `tfwizcztyktdurmiynzs` are development branches of the existing production projects, rather than independent top-level projects. The earlier project-list/get-project checks did not establish SQL inaccessibility.

The verified staging admin is the confirmed `niz262001@gmail.com` identity `715a1e06-d83d-4514-b9e2-f8fd5148f37a`. Finance staging already had four identity links and the original provisioning RPC. Its compatibility migration has now been applied and checked without changing the four mappings or disabling RLS.

The integrated candidate preserves staging TAC verification, resend/rate-limit checks, verification route and regression tests. It also incorporates the reviewed production-readiness fixes and central session improvements. Validation: 211 tests passed, 36 skipped; lint/build passed. Finance candidate: 342 passed, one skipped; lint/typecheck/build passed.

A transport probe using an intentionally invalid launch ticket registered a central app nonce at 11:23:38 UTC, confirming that the request passed signature and nonce processing. The invalid-ticket HTTP 401 is expected. It is not an authenticated launch PASS.

Next gates: deploy to existing staging branches; real MYOPS login, fresh ticket, Finance dashboard, admin entitlement, tenant isolation and logout/expiry UAT. Production remains HOLD. No customer data was reset and no charges were created.
