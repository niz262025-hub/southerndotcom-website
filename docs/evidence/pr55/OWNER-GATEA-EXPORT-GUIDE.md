# Owner-safe pg_dump export and transfer procedure for PR #55 Gate A

Status: non-executing guidance only. This document does not connect to Supabase, download production data, or write to any environment.

## Critical caveat

The owner screenshot shows backup listings in the Supabase dashboard and a Restore button, but it does not show a download/export artifact or a restorable pg_dump file. Physical backup listings are not automatically downloadable logical dumps. They are not a valid restore artifact for Gate A. This PR remains BLOCKED on actual artifact verification and isolated restore execution.

## What is allowed in this PR

- Read-only inventory and review of repository code.
- Local-only workflow and guardrail validation in GitHub Actions.
- Documentation of the secure export path an owner must complete outside this repository.
- No Supabase connection, no production/staging write, no automatic export, no new project creation, no paid resource creation.

## Owner action checklist (mobile-friendly, Android Chrome)

1. Confirm the two exact refs to validate:
   - MYOPS Central Auth production project
   - candidate MYOPS staging branch or approved isolated restore target
   - do not treat the OpsFlow staging project as interchangeable
2. In Supabase dashboard, go to Project > Database > Backups or Restore.
3. Record the snapshot timestamps shown in the dashboard; treat these as backup-listing evidence only.
4. Confirm whether a Download / Export / Backup file option exists.
   - If the UI only shows scheduled backups and Restore buttons, then this is not a downloadable logical backup artifact.
   - Do not treat a listing screenshot as a pg_dump or database tarball.
5. A logical `pg_dump` requires a trusted computer/runner with PostgreSQL client tools and securely authorized database connectivity. Android Chrome alone cannot run it or safely hold a full dump; GitHub Actions in this PR deliberately has no real-backup input or database access.
6. Ask the database owner/DBA whether an authorized read-only role has the required `CONNECT`, schema `USAGE`, and table `SELECT` rights for all required objects. `pg_dump` issues catalog queries and may fail or omit objects when object privileges are missing; read-only does not imply complete backup coverage. Do not elevate privileges or change database grants as part of this task.
7. Export only on an explicitly approved private computer/runner. Keep the dump, credentials, manifest details, and any roles file off GitHub, PR comments, screenshots, public artifacts and chat. Use an owner-approved encrypted temporary destination and delete local/remote copies after verification per the approved retention policy.
8. Prepare a checksum manifest and backup inventory locally that records:
   - source project/ref
   - snapshot timestamp
   - PostgreSQL version and compatible pg_dump version
   - file format (plain SQL, custom, gzip, tar)
   - checksum SHA-256 per artifact
   - schema/data coverage, auth/custom schemas, RLS, functions, triggers, and Storage caveat
   - secure retention period and cleanup steps
9. Run a real restore rehearsal only on that trusted private isolated runner/computer, using a disposable local database and the owner-verified manifest. Never transfer an actual production/staging dump through GitHub Actions artifacts.

On Android Chrome, once this workflow is available on the default branch, open **Actions**, choose **MYOPS synthetic local restore rehearsal**, and tap **Run workflow**. It restores only generated, non-sensitive synthetic test data; it cannot receive or access a real backup. GitHub only lists `workflow_dispatch` workflows present on the default branch. This PR remains draft; do not merge it to activate the workflow. A real backup rehearsal requires a trusted computer/runner and separately approved local PostgreSQL environment.

## GitHub Actions artifact handoff limitations

- The workflow contains no artifact input, upload, download action, GitHub artifact permission, or Supabase connection. It generates a tiny synthetic SQL fixture at runtime and removes it and the ephemeral local database on completion.
- GitHub Actions artifacts, even in a private repository, are not an approved path for actual customer, auth, financial, production, or staging backups. Do not add a real-dump artifact route to this workflow.
- A `workflow_dispatch` workflow must exist on the repository's default branch to be offered in the Actions UI. Do not merge this draft just to activate it. Run the synthetic test locally or wait until normal owner-approved activation; perform real backup rehearsal only on a trusted private runner.

The generated synthetic manifest uses a checksum and compares schema/table inventory, row count, RLS, policies, constraints, functions, triggers, a role, and its table grant. It exercises only the workflow tooling and is not Gate A evidence. A checksum alone does not prove source authenticity or completeness of an actual backup.

## Safe export conditions that must be true before any actual dump

The owner must confirm all of the following before a real logical export is attempted:

- read-only export access is authorized for the selected project/ref
- the chosen machine or runner is a trusted computer/runner, not a public CI environment
- the backup is created by a pg_dump version compatible with the target PostgreSQL engine
- no schema/data modifications are made to production or staging
- no raw credentials or exported SQL are stored in the repo or in public artifacts
- the destination for the export is an explicitly approved secure location
- the backup artifact is encrypted or otherwise protected before transfer

## Private owner-run export notes (not executed here)

An authorized DBA should choose a format and full schema scope for a trusted private runner. A plain or custom archive may be used, but the file stays on that private runner. Do not execute this example on a phone or paste credentials into a URI, command log, GitHub, PR or screenshot.

```bash
pg_dump --dbname="${PGSERVICE:-myops-gate-a-readonly}" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --file="$PRIVATE_BACKUP_DIR/myops-gate-a.dump"
```

Configure the `PGSERVICE` connection in a private libpq service file and credentials in a permission-restricted `.pgpass`/approved secret manager; do not put passwords in the URI, shell history, screenshots or logs. `PGSERVICE` and `PRIVATE_BACKUP_DIR` above are placeholders. Run the command only after creating the private directory and validating available disk space.

Do **not** add `--no-privileges` / `-x`: it suppresses ACL `GRANT`/`REVOKE` statements needed for privilege verification. `--no-owner` omits original object ownership; record this limitation and verify ownership/roles separately if ownership is in scope. Database-wide roles are not included in an ordinary `pg_dump`; any separately authorized roles/global-object export may contain sensitive role metadata and must remain private. Compare object grants, default privileges, role memberships and ownership to the source manifest. Use `pg_restore --exit-on-error` for custom/tar archives; decompress `.sql.gz` before piping into `psql`. A direct read-only dump may not be complete if role privileges omit objects or required catalog visibility.

## Storage and auth coverage limitations

- Supabase logical dumps generally cover database schema/data and most database objects, but they do not automatically include every Storage object payload as a complete file-system snapshot.
- Storage bucket definitions, ACL metadata, and object lists may require separate explicit verification.
- Auth/custom schemas, roles, grants, policies, functions and triggers require verification against a backup manifest rather than a table count or dashboard listing.
- A dashboard screenshot or public catalog count is not proof of a complete backup.

## Transfer and artifact handling

- Store actual dumps and manifests only on an owner-approved private secure system, encrypted in transit and at rest; use a private `.pgpass`/secret manager with least privilege rather than embedding credentials in command lines.
- Keep checksums and detailed schema/data/role manifests private with the dump. Share only redacted pass/fail summaries; never log SQL, row values, credentials, or private metadata.
- Delete temporary data and credentials after the owner-approved retention window; record cleanup without exposing file names or hashes publicly.
- GitHub workflow is for synthetic fixtures only. It restores plain SQL with `psql`; private local restore procedures use `psql` for plain SQL and `pg_restore` for custom/tar archives.

## Evidence matrix for Gate A

| Requirement | Status if no valid artifact exists | Required owner-side evidence |
| --- | --- | --- |
| Backup listing visible | PASS (metadata only) | Dashboard screenshot showing snapshot time |
| Downloadable restore artifact | BLOCKED | Real dump file, manifest, checksum, format |
| Schema/data comparison | BLOCKED | Verified local restore result |
| RLS / trigger / function verification | BLOCKED | Local restore checks against manifest |
| Storage object coverage | BLOCKED | Explicit backup of bucket metadata/object payload if required |
| Restore rehearsal | BLOCKED | Local disposable Postgres restore and validation |

## Remaining issue status

This document is designed to make the approval path explicit rather than to imply that any Supabase backup can be downloaded automatically. Gate A remains BLOCKED until a valid, encrypted, authorized backup artifact exists and a non-destructive isolated restore passes in a private local environment.
