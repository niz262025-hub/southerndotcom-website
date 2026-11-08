# Legacy subscription migration and compatibility plan

Status: inventory and design only. Actual migration/rollback BLOCKED by Gate A and verified identity mapping. No SQL applied; no tables may be deleted.

Read-only observations, 8 November 2026 20:11–20:12 Malaysia:

| Application / project | Inventory | Dependencies / treatment |
| --- | --- | --- |
| OpsFinance / ozkjsihuovzpujuabupa | subscriptions: 2; subscription_payments: 0 | KEEP both. subscriptions.business_id FK has ON DELETE RESTRICT; subscription_payments.subscription_id FK has ON DELETE CASCADE. create_business_with_owner and set_subscription_payment_updated_at reference subscription structures. |
| OpsPS / wrsigjhhbkbomtkaqlpw | subscriptions: 0; payments: 1; orders: 3 | KEEP all. These are order/business payments, not MYOPS subscription billing. subscriptions has business FK ON DELETE CASCADE and status/payment-status CHECKs. No public function reference found; app/dynamic-SQL dependencies remain unverified. |
| MYOPS staging / wengxxiqwtosirealghx | enabled clients: opsfinance, opsflow, opsp | OpsHR/OpsWMS remain coming_soon. No promotion as a migration side effect. |
| OpsFlow / ojamkplflqafedmxbdxb | Retail POS; read-only legacy schema/count inventory captured in opsflow-legacy-inventory.json | KEEP subscriptions, order/payment/document and trial tables. No migration run; code/edge/dynamic dependencies remain to verify. |

Captured column types/nullability, FK/CHECK/unique constraints and dependent function names. No customer names, emails, payment references or subscription payloads published. Identity mapping must not be inferred from matching names/emails.

## Mapping contract

- Source key: project ref + schema + table + legacy subscription id.
- Explicitly verify source business_id to central organization/members or verified central individual. Never guess company ownership.
- Approve legacy plan_code/plan_name to central plan/product mapping. Finance-only access cannot become All Apps/lifetime without evidence.
- Preserve original status, start/end, source version and provenance; document status case conversions. Never extend an expired trial, fabricate payments, reset trial clocks or silently turn grace periods into paid access.
- Reconcile active/trial/paused/cancelled/expired/overdue/refunded separately. Ambiguous rows remain BLOCKED. Zero subscriptions does not mean the application no longer reads its subscription table.

## Proposed up migration — not executable or applied

1. After Gate A PASS, snapshot approved isolated source data and checksum/count it. Keep order/payment/audit tables untouched.
2. Design a private service-only reconciliation ledger with unique source key, approved central target, source hash, batch and status. Review its RLS/grants against actual central schema before creating it.
3. Dry-run mapping: exactly one central target/source, no missing/duplicate source keys, no conflicting central entitlement. Stop on identity/plan/schema/status ambiguity.
4. Transactionally link/import approved central subscriptions idempotently. Matching rows are no-ops; conflicting content stops instead of overwriting. Retain every legacy row and payment record.
5. Reconcile source snapshot count = linked/imported + explicit blocked exclusions. Current Finance count is 2; refresh immediately before rehearsal. Live counts are not a backup manifest.
6. Verify individual/company roles and RLS, unrelated-user denial, expiry/cancellation, paid/lifetime preservation, app audience and 15-minute logout. Recheck Finance journals/bank accounts/ledger and OpsPS orders/payments.
7. Switch app access to MYOPS only after hosted UAT/reconciliation PASS; retain old tables and compatibility readers.

## Down / rollback design

Record prior central rows/hashes and compatibility settings before import. Restore the prior app compatibility setting first. Revoke only access introduced by the reviewed batch; preserve pre-existing or subsequently renewed access. Compare versions/hashes before reversing; changed rows BLOCK rollback for reconciliation. Never overwrite renewals/payments. Retain source rows, mapping history and audits; mark mapping entries reversed instead of erasing them. Re-run reconciliation/access tests after rollback and after a second idempotent up run.

Missing evidence: actual restored source snapshots, verified central identity/plan mapping, complete OpsFlow dependency inventory, app compatibility at exact commits, executable migration against verified schema, hosted UAT and actual rollback. This plan does not claim a completed migration.
