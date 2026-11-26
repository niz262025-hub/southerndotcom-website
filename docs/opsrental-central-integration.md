# OpsRental trial and administrator integration — blocked release gates

## Approved policy

The trial runs for exactly 168 hours with no card or renewal. The total limit is 30 successful operations across create property, create tenancy, record payment, create maintenance ticket and upload document. Edits, deletes, views, downloads, listing, login, logout, navigation and reporting are free. Failed actions consume nothing; retries of the same operation are idempotent; data remains after expiry.

The approved policy is declared but OpsRental remains deliberately excluded from trial admission. Declaring the policy does not enforce a limit. Do not enable the trial until all five backend operations use a reviewed atomic protocol and the 31st operation, failures, concurrency and retries are tested end-to-end.

## Atomic database implementation

OpsRental contains `supabase/proposals/rental_trial_atomic.sql`, a review-only implementation for installations where the central trial, session and rental tables share one database. It locks the trial row and atomically inserts the business row and an idempotency ledger entry for property, tenancy, payment and ticket creation. Isolated PGlite tests execute that SQL for 30 successful operations, operation 31, changed-payload retry, invalid insert, expired trial and revoked session. This is not wired into the production API; concurrent connections, upload reservations and actual Storage recovery still require implementation and testing. Do not enable OpsRental trial admission.

## Unresolved implementation work

The current central trial quota RPC immediately commits usage in a separate request; the OpsRental APIs write business records through separate HTTP calls, and Storage is independent from PostgreSQL. Calling the existing RPC before or after a create is insufficient: crashes or timeouts can consume quota without a record, create a record without quota, or duplicate an operation. A reservation must not be released solely on a timeout when the create or upload could have committed. The quota ledger, idempotency key and database mutation need one transaction or an equivalent proven protocol, with a durable upload state machine and reconciliation of uncertain Storage outcomes. Cross-database placement and write-path bypass need to be established before choosing a transaction boundary. Paid and admin entitlements must remain separate from trial usage.

## Revocable administrator proposal

`supabase/proposals/opsrental_revocable_admin.sql` is review-only and is not applied to hosted environments. It creates a central active/revoked administrator registry and audit table; the scoped OpsRental authorization check reads the registry and current owner/admin membership on each request. Existing product-wide launch and other central administrator features still depend on the legacy environment allowlist; migrating those paths safely without changing other applications remains open. Until the migration is applied, the new scoped check fails closed. The proposal requires review of role grants, audit custody, administrative provisioning and rollback before use.

## Hosted UAT and release

Use only a dedicated approved non-production environment with central MYOPS client signing keys, rental tables with reviewed RLS, a private bucket and synthetic users, organizations and documents. Test desktop/mobile login, logout, inactivity, quota and expiry, admin revocation, role changes, cross-organization and tenant isolation, upload recovery and cache controls. Hosted migrations, provisioning, merge and production deployment require separate approval. Never reset trial usage or production data.
