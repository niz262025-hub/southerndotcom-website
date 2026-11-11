# Production SSO repair — 11 November 2026

Release decision: HOLD. Authenticated staging UAT, payment UAT and backup verification have not passed. No production deployment was made during this repair.

## Verified blockers and changes

- Confirmed `niz262001@gmail.com` resolves to auth user `5fcf0a1d-84be-4db0-b853-a0abac5f7578` in central production project `uhuukcztdifvpjuopdea`. The configured admin ID `42857de2-cb25-4be3-93ee-54790276822c` no longer exists. The existing production `MYOPS_ADMIN_USER_IDS` Vercel setting was corrected to the confirmed ID. Existing deployments retain their old environment until a gated redeployment.
- Finance production database `ozkjsihuovzpujuabupa` has zero identity links and no `opsfinance_provision_myops_identity(text,uuid,text,text,text)` function. Zero links in this database does not establish the state of isolated staging.
- MYOPS previously sent Finance onboarding labels only in Preview. The patch permits them in explicitly enabled production app access, still behind `MYOPS_FINANCE_PROVISIONING_READY=true`, and only after signed ticket redemption and entitlement verification. Labels never authorize tenant membership or admin status.
- Finance also requires its coordinated code/migration patch. Its deployed auth-user trigger creates a public profile automatically; the old provisioning function rejects that profile.

## Environment and release gates

The connected Supabase accounts cannot access central staging `wengxxiqwtosirealghx` or Finance staging `tfwizcztyktdurmiynzs`. Finance's configured staging portal origin is the protected MYOPS isolated-staging branch alias. Staging ticket transport, Ed25519 key pairing, identity creation and authenticated browser redirects remain unverified. Do not replace these databases with production or disable Vercel protection.

After access is restored: verify backups/recovery; inspect staging trigger/schema; apply the reviewed Finance migration on staging; enable both provisioning readiness flags in their intended environments; exercise real MYOPS login → launch ticket → signed redeem → tenant-scoped Finance dashboard → logout/expired session. Verify the ordinary unpaid user is denied and the platform admin is exempt from billing without access to other tenants. Run payment sandbox cases separately. Production requires all release gates to pass.

## Executed verification

- MYOPS full suite after patch: 205 passed, 36 skipped, zero failed.
- Lint and production build passed.
- Signed redemption regression includes production readiness off/on and invalid signatures.
- Finance companion patch includes database tests for auth-trigger compatibility, retry idempotency, membership isolation and browser-role denial.
- GitHub Actions runs 43005426833 and 43005426710 passed for the MYOPS candidate. Finance run 43005430272 passed, including its signed-out desktop browser suite.
- Existing six production entry URLs returned HTTP 200 (Finance login redirects to MYOPS login). This does not verify authenticated workflows.
- Secure browser credential submission did not produce a visible signed-in session; authenticated end-to-end remains unverified.

## Inventory and release dashboard

`BLOCKED` means the release gate has not passed; it is not evidence every feature is broken.

| Application | Code fix | UAT | New production deployment | Existing production |
| --- | --- | --- | --- | --- |
| MYOPS Master | Candidate tested | BLOCKED | Not released | `www.myops.com.my`, deployment `dpl_ATvNZZxYmYxPUikwBqnxcvnygGnJ`, commit `d35abea71aecd8ccaeeaa15377064aa132fad79f` |
| OpsFinance | Coordinated candidate | BLOCKED | Not released | `app.myops.com.my`, deployment `dpl_68GwQ4J4KXUL63iAKbDgMsT3mwj5`, commit `1bbd75c2d86ea68d1c75a4babeb1290d9e523482` |
| OpsFlow | Not modified in this repair | Not run | Not released | `opsflow.myops.com.my`, deployment `dpl_kAWWpsYseK5PmKNtWAoAXkJFgZ6d`, commit `faeca4e02b198ddc2a06e63dcb9e58511085d6d9` |
| OpsPS Web | Not modified in this repair | Not run | Not released | `opsps.myops.com.my`, deployment `dpl_21dy75b6yShU5j3dqTed1HhjL8PJ`, commit `4ce533e89426d997cf1dd52af6af8a9faba46800` |
| OpsHub | Not modified; standalone retained | Not run | Not released | `opshub.myops.com.my`, project `opshub-standalone`, deployment `dpl_32EfZQz21yGrYksDDUix45ZoQbLV`, commit `30e4a0defc3472d9e8a6827b5274b93873130e59` |
| OpsHR | Repository discovered: `niz262025-hub/OPSHR` | Not run | Not released | `opshr.myops.com.my`, deployment `dpl_5JJyMELdQPUy3uiFPw2rbbTfYfcs`, commit `9df4b9bb68bc4045c09fc411d82b30e313731e1a` |

Vercel READY describes deployment build state, not customer readiness. Paying-customer go-live remains HOLD. The existing central production live-payment flag was already enabled; this repair did not enable payments or create charges. Merchant approval, sandbox lifecycle, production webhook verification and reconciliation remain unverified.

## Rollback

Production code and database are unchanged. Before a coordinated release retain the deployment IDs above and verified database recovery point. Turn off both provisioning readiness flags to stop new mappings without deleting existing users or businesses. Roll back both applications together if the release fails. The corrected admin allowlist can be returned to its recorded previous configuration if needed, although that previous ID is known deleted. Do not reset customers or delete provisioned data as a rollback.
