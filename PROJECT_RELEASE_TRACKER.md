# MYOPS ecosystem release tracker

Updated: 2026-10-27. This tracker records verified evidence. PR resolution is separate from production acceptance; the ecosystem is NOT production-ready.

## Verified source integration

| Application | Verified completion % | Open PRs | Tests | Deployment | Blocking gates |
|---|---|---:|---|---|---|
| MYOPS Central | Functional acceptance not yet measurable | 0 | 137 local passes, 36 PostgreSQL-dependent local skips; current-head quality and build-and-safety CI passed at 009fce4 | Preview passed; production held at 82f9808 | Authenticated SSO/subscription/logout/expiry/tenant UAT; RPC security review |
| OpsFinance | Functional acceptance not yet measurable | 0 | 255 passes, 1 live persistence skip; authoritative migration replay, tenant/broker/ACL, persisted upload→atomic post→idempotent retry→match→reconcile tests; types/lint/build and CI passed at 8094857 | Preview passed; production held at 32b9ff3 | Real SSO, Storage/direct API UAT; live migration and RPC security review |
| OpsFlow | Functional acceptance not yet measurable | 0 | 4 frontend + 3 Python SSO contract tests; frozen Yarn install/types/lint/web export CI passed at b4c5249 | No connected Vercel project in inspected scope; root/frontend main deployment holds | Firebase/Mongo staging, rule-emulator/service integration, deployed SSO/tenant UAT |
| OpsPS Web | Functional acceptance not yet measurable | 0 | 133 unit passes; migration 017 fixture replay twice, session/owner/Storage denial tests; types/lint/web export passed locally; current-head web CI passed at 21fe67c | Preview passed at 21fe67c; production held at ec89a87 | Historical migration 003 fresh replay syntax failure; staging Edge Function/identity links, full SSO/RLS UAT |
| OpsHub | Functional acceptance not yet measurable | 0 | 89 tests, types/lint/build and all three current-head quality checks passed at 7bb9d0b | Preview passed; production held at 661f49c | Shared inactive Supabase target; missing Preview key; MYOPS SSO unimplemented |

A test pass rate is not an application completion percentage. No functional completion percentage is asserted before the acceptance matrix is exercised.

## PR resolutions

Initial direct GitHub inventory: MYOPS 9, OpsFinance 16, OpsFlow 1, OpsPS 2, OpsHub 0 = 28. This corrects the earlier manual 29 count.

| Repo | PR | Final action | Reason / retained implementation |
|---|---:|---|---|
| MYOPS | #19 | Merged (82f9808) | Reviewed test-only SQL smoke coverage; merged-main tests/lint/build and head CI passed |
| MYOPS | #12, #13 | Closed | Full Git history proved both heads were already ancestors of main |
| MYOPS | #2 | Closed, superseded | Historical pricing retained in docs/archive/myops-pricing-v1.md; old satellite billing/Workspace scaffold conflicts with current architecture |
| MYOPS | #8 | Closed, consolidated | Historical audit and unapplied proposal retained in #20; no SQL applied |
| MYOPS | #10 | Closed, consolidated | Missing recovery-outage fix reconciled with main, retained in #20 |
| MYOPS | #17 | Closed, consolidated | Central login and explicit production opt-in access gates retained in #20; image assets preserved |
| MYOPS | #18 | Closed, consolidated | Historical evidence retained in docs/release-evidence-20261026.md; current tracker supersedes status |
| OpsFinance | #13 | Closed | Verified zero changed files; no functionality removed |
| OpsFinance | #10, #15 | Closed, consolidated | Tenant writes, atomic posting, journal references and validated onboarding retained in #19 ancestry |
| OpsFinance | #17, #18 | Closed, consolidated | Signed transport and direct legacy anon-RPC ACL repair retained in #19 ancestry |
| OpsFinance | #11 | Closed, superseded | Subscription navigation already absent and legacy route already redirects to business settings |
| OpsFinance | #14 | Closed, superseded | Current local-development-only bypass and hosted denial are stronger; old proposal would reopen hosted bypass |
| OpsFinance | #16, #20 | Closed, superseded | Competing legacy/placeholder SSO paths replaced by #19 sealed session, explicit identity/business mapping, central checks and server proxy |
| OpsPS | #1 | Closed, superseded | Current code retains required roles, Supabase dependency and jsdom; do not restore obsolete schema/history |


### The eleven remaining PRs resolved in this execution

| Repository | PR | Action / evidence |
|---|---:|---|
| MYOPS | #20 | Merged c0a1b00 after current-head checks. Fixed staging checkout/callback project mismatch and resolved review; added checkout-to-callback regression. |
| OpsFinance | #19 | Merged deefa94 after checks. Selectively integrated older workflows, preserving current migrations/SSO. Added actual persisted financial workflow regression. |
| OpsFinance | #4 | GitHub marked merged through #19 ancestry (c726694). No separate blind merge performed. |
| OpsFinance | #8 | GitHub marked merged through #19 ancestry (b9448d7). No separate blind merge performed. |
| OpsFinance | #5 | Closed, superseded by corrected DB-backed upload/post/reconciliation in #19. |
| OpsFinance | #6 | Closed, superseded by disabled local billing routes/navigation in #19. Inert compatibility models retained pending central runtime validation. |
| OpsFinance | #7 | Closed, superseded by stricter local-development-only bypass and hosted denial tests. Historical audit retained. |
| OpsFinance | #9 | Closed after selective security integration: direct idempotency get/reserve disabled; atomic posting/ACL tests pass; conflicting obsolete migration snapshots excluded. |
| OpsFlow | #2 | Merged 3a850a1 after web + sso-contract CI; query/fragment ticket scrub, Expo/lockfile alignment, main release hold. |
| OpsPS | #3 | Merged 0d82a0a after current-head web CI and Vercel passed, including SQL fixture tests; production/Edge/migration hold remains. |
| OpsHub | #5 | Merged 6bdfa6f after checks. Removed server credentials from compile-time env; build safely returns unavailable screen without public configuration; 89-test regression coverage. |

PR source branches were not deleted. Closure explanations are recorded in each superseded Finance PR body. No failing security check or branch protection was bypassed.

Live final inventory: zero open PRs across all five authorized repositories. Of these eleven PRs, GitHub records seven merged (including Finance #4/#8 through ancestry), and four closed as superseded.

## Delivered commits

- MYOPS 009fce4182115e09820534d79dc2dfbf197cdab6: checkout/callback staging selection regression; e94a094 main Git deployment hold.
- Finance 80948572f4c108a1094f77a523c374bbd3e5ba94: verified tenant-bound persisted accounting workflows and selective PR consolidation. Full details: docs/PR_CONSOLIDATION.md.
- Flow b4c5249e24911685454c5af373581a6854918822: align Expo manifest to locked 54.0.36; c0312b9 adds CI and release holds; 90f674e ticket scrub tests.
- OpsPS 21fe67c4d87599c712c1f5f88b040f60da445f9e: disposable PostgreSQL session/RLS/Storage migration regression; 07a8144 adds web CI/release hold.
- Hub 7bb9d0b9ae1eb10a5b904265d01e28162ffd8ee3: root/apps/web release holds; 7a64aae safe missing-config render; ab75e4f server-env exposure fix.

## Production hold verified

Root Vercel config disables Git deployments for main on all five source repositories. Additional configs cover Flow frontend and Hub apps/web. Preview branches remain enabled. This permits source integration without authorizing release.

After source merges, latest production SHAs remained unchanged:
- MYOPS 82f980848fc6081718f263989c27ed4e14317da7
- Finance 32b9ff3c7f70e5a2198a36ee728033666a61fa7b
- OpsPS ec89a872c53856c3039a1b31d497b9f1cb02ece0
- Hub 661f49cddf743cee0b57e22e64cde1c5df2c174d

No production promotion, Edge Function deployment, hosted schema/Auth write or data deletion was performed. Do not remove the release hold until staging gates pass and explicit production authorization is confirmed.

## Supabase readiness: blocked

- MYOPS production uhuukcztdifvpjuopdea; isolated staging wengxxiqwtosirealghx.
- Finance production ozkjsihuovzpujuabupa; isolated staging tfwizcztyktdurmiynzs.
- OpsPS production wrsigjhhbkbomtkaqlpw.
- Hub iytiyugzmlsofwtortth is INACTIVE; BOTH Preview and Production public URLs point to it, so it is not isolated staging. Preview public key is missing. Do not restore under a staging-only assumption.
- MYOPS staging public tables had RLS. Finance staging and OpsPS production advisors flagged anonymous SECURITY DEFINER/search_path concerns and leaked-password protection warnings. These remain individual review gates.
- Finance live production does not contain the new SSO/broker migrations. New onboarding/tenant/atomic migrations were not applied in this execution.
- OpsPS migration 017 passes a disposable Supabase-shaped fixture; this does not certify historical migrations. Historical 003 fails fresh replay at syntax near NOT; preserve applied history and develop a reviewed forward-compatible provisioning repair.

## Runtime acceptance still outstanding

Signed-out central login and source-level contracts do not prove authenticated SSO. A secure staging-login request timed out without an authenticated result. Real MYOPS→authorized dashboard, subscription denial/revocation, global logout/expiration, tenant A/B and direct database/Storage access tests remain unverified. Previous protected Finance fetch 401 is deployment protection, not app authentication evidence.

Next executable work:
1. Run isolated MYOPS→Finance authenticated staging UAT with approved test identity and package; verify denial, expiry, logout, direct API/Storage and tenant A/B.
2. Review flagged RPC privileges/search_path and validate fixes in staging.
3. Provision Flow Firebase/Mongo staging and validate rules/services; provision OpsPS isolated staging and trusted identity links with Edge Function.
4. Select an isolated Hub staging database, configure Preview securely, implement MYOPS SSO and test.
5. Complete dashboard/workflow acceptance matrix across five apps; production promotion only after all gates and explicit authorization.
