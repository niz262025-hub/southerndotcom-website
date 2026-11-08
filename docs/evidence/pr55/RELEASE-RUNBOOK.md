# MYOPS controlled release and rollback runbook

Prepared only. Release execution remains BLOCKED. Follow the current owner instructions: approval to merge is separate from approval to deploy production.

## 1. Gate A evidence and isolated restore

Obtain private backup artifacts for BOTH uhuukcztdifvpjuopdea and wengxxiqwtosirealghx, never upload customer backups to public GitHub or CI artifacts. Each manifest must identify source ref, snapshot timestamp, PostgreSQL version, schema coverage, SHA-256 per file, snapshot-consistent table counts and schema/role/ACL/function/trigger/RLS/Storage coverage. Production also has custom schemas such as OpsHR; a public-only dump is insufficient. Database backups do not contain Storage object bytes. Current zero objects does not remove the need to capture bucket definitions/ACLs and check coverage at backup time.

No export artifact or database credentials are currently available here. Supabase management backup-list/download and database-password access are not exposed by the connected tools. A service-role API key is NOT a database password or a complete backup.

Use a disposable local PostgreSQL 17 / compatible Supabase stack with required extensions. Native PostgreSQL ran in GitHub CI for synthetic tests, but that is not approval to publish real customer backups there. Local Work currently has no Docker/psql/pg_dump/pg_restore and cannot initialize a native cluster under an unprivileged user. Owner must supply approved private artifact access and a suitable private restore runner, or authorize an appropriate private runner once the artifact is available.

Before executing any restore:

1. Validate backup file checksums against the private manifest and verify exact source snapshot/schema coverage.
2. Create a fresh disposable local cluster/database. Bind only to a local socket/127.0.0.1, disable outbound integration/webhooks, and record local cluster identity. Reject all supabase.co destinations and reject either existing project ref as a target.
3. Confirm the target is empty. Restore the approved roles, schema and data in the documented order with stop-on-error; use pg_restore --exit-on-error for custom-format dumps or psql -X -v ON_ERROR_STOP=1 for SQL dumps. Do not strip errors or silently skip extensions/objects.
4. Compare exact schema objects, columns/types/defaults, table counts, constraints/validation state, indexes, sequences, roles/ownership/grants, RLS/policies, function definitions/search_path/ACLs, triggers, auth and Storage metadata against the BACKUP manifest. Do not compare a static backup to later live counts and call a mismatch corruption without checking snapshot time.
5. Exercise authorized/unauthorized reads/writes and relevant security-definer/invoker functions on this LOCAL copy. Never invoke restored webhooks/payment/network functions against external services.
6. Record only redacted results/checksums/counts in the PR. Stop the disposable cluster, create a second fresh local target and repeat the restore to rehearse recovery. Keep the original artifacts and reconciliation evidence. No restore over existing remote environments.

A synthetic repository SQL replay, plan, screenshot of backup settings, READY deployment or table inventory does not pass this gate.

## 2. Staging setup and UAT

- Use only the isolated branch project wengxxiqwtosirealghx and the PR #55 Preview branch settings.
- Owner supplies the ORIGINAL staging MYOPS_APP_USER_REF_SECRET through Vercel Preview for branch copilot/myops-backup-restore-central-access; do not paste secrets into chat/PR. Do not replace it: stable app identity mapping must be preserved.
- Verify Auth redirect allowlist includes the exact trusted Preview /auth/callback. Verify app-side broker origin, trusted MYOPS staging project, signed-client audience and existing public keys for OpsFinance, OpsFlow and OpsPS. Do not weaken exact-origin/signature checks to make a test pass.
- The portal's three staging app destinations were copied from existing staging configuration. Their own broker-origin settings are not automatically updated by this portal change.
- Keep live payments disabled and use sandbox only. Trial activation remains false until Gate A and eligible-app integration prerequisites PASS.
- Use dedicated approved individual/company UAT accounts, no real payment charges and no changes/deletions to existing historical records.

| UAT case | Required evidence |
| --- | --- |
| Individual registration / verified email | No access before verification; same-browser callback; resulting verified session |
| Company registration / membership | SSM/contact validation, actual org/member roles, unrelated-company denial |
| Central SSO per app | Exact approved destination, one-use app-bound ticket, no direct-app independent registration/login |
| Paid / no subscription / expired | Correct admission/denial; caller-edited browser state never grants access |
| Seven-day trial | One user/company, exact 168 hours, one use, no card/renewal; 30th transaction allowed, 31st denied per certified app |
| Trial display and navigation | Buttons come from certified server list; no hardcoded OpsHR; retained paid access unchanged |
| Session and logout | Global logout, app revocation, passive polling does not extend inactivity, exact 15-minute denial |
| Finance | Journal/ledger/bank records unchanged; trial limits and import/account checks work |
| OpsFlow Retail POS | Retail sale/inventory/payment behavior and subscription boundary preserved |
| OpsPS Personal Shopper | Trip/order/payment records retained; business payments independent of subscription billing |
| OpsHR / OpsWMS | Preserve current staging coming_soon and deny launch; do not enable unfinished products |
| EN / MS / Chinese / Tamil | Labels, validation, messages, navigation, long text, mobile layout; record remaining English fallback and all cross-app gaps |
| Mobile + desktop | Test supported browser widths and touch/keyboard navigation, no horizontal overflow or lost form values |
| Legacy migration | Snapshot reconciliation, idempotent second import, unrelated-user denial and actual rollback |

## 3. Merge control — after all release gates PASS

1. Review exact final head SHA, base drift, changed files, all CI jobs, backup/restore, migration reconciliation and signed hosted UAT. No unresolved critical finding.
2. Verify Vercel production Git integration before merge. A push/merge to main may automatically deploy production. To honor separate merge/deploy approvals, an approved effective production deployment hold must exist BEFORE merging. This session has not changed production deployment settings and has not certified such a hold. Do not assume the default Git integration is paused.
3. Present final evidence and obtain explicit owner merge approval for the exact SHA. If a deployment hold requires a production setting change, request that specific authorization first. Do not merge if it would trigger an unapproved deployment.
4. Merge only the reviewed PR #55; do not create a duplicate. Keep Issue #54 open until all acceptance criteria, including migration/integrated UAT, are satisfied.

## 4. Production deployment — separately authorized

Record existing production deployment ID/domain/commit, environment key scope and rollback candidate. Verify production project uhuukcztdifvpjuopdea, production-only keys, canonical www.myops.com.my origin, live-payment opt-in and app audiences without publishing values. Run production preflight against effective configuration. No automatic migration is part of this release.

Present the exact release SHA, migration plan (or explicit no-migration release) and rollback candidate; obtain separate production deployment approval. Build/stage with production configuration without assigning live domains, inspect results, then promote only under that approval. A staging Preview build is not equivalent to a production build.

## 5. Production smoke tests and rollback

After approved promotion: public pages/assets, protected routes signed-out, central verified login, actual authorized/no-access app admission, expired session/logout, trial/subscription display, supported language controls and mobile navigation. Use approved test accounts. No real charge, schema write or arbitrary test transaction without explicit scope. Verify retained financial/order/audit counts against the release snapshot, accounting for legitimate concurrent activity.

If auth, entitlement isolation, data integrity, payments or critical navigation fails: halt rollout and revert to the recorded healthy deployment under the approved rollback procedure. Vercel rollback can affect automatic domain assignment; verify domain/production state afterward. Revert application code/config only; never restore production DB or delete new/historical rows as a rollback shortcut. For an approved data migration use the separately verified, batch/version-aware rollback in LEGACY-MIGRATION-PLAN.md. Any changed/renewed records require reconciliation instead of overwriting.

Close Issue #54 only after complete evidence is accepted. This runbook is preparation, not deployment/merge authorization or proof of a restore.
