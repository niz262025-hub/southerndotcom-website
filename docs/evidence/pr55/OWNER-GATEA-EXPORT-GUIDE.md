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
5. If an owner-approved secure transfer path exists, use a trusted computer or runner with a read-only database role and a proper logical dump command. Do not use GitHub repo files, public Actions artifacts, PR comments, screenshots or chat to hold secrets or raw dumps.
6. Use a private, encrypted transfer route only: approved temp storage, encrypted object store, or secure transfer service with explicit owner approval. Do not upload to GitHub, public artifact storage, or any unrestricted file share.
7. Keep the file out of the repository and out of the Actions workflow log output. Redact or mask all credentials and raw SQL output before sharing any summary.
8. Prepare a checksum manifest and a backup inventory that records:
   - source project/ref
   - snapshot timestamp
   - PostgreSQL version and compatible pg_dump version
   - file format (plain SQL, custom, gzip, tar)
   - checksum SHA-256 per artifact
   - schema/data coverage, auth/custom schemas, RLS, functions, triggers, and Storage caveat
   - secure retention period and cleanup steps
9. Only then supply the approved artifact to the existing localhost-only restore workflow in the repo.

## Safe export conditions that must be true before any actual dump

The owner must confirm all of the following before a real logical export is attempted:

- read-only export access is authorized for the selected project/ref
- the chosen machine or runner is a trusted computer/runner, not a public CI environment
- the backup is created by a pg_dump version compatible with the target PostgreSQL engine
- no schema/data modifications are made to production or staging
- no raw credentials or exported SQL are stored in the repo or in public artifacts
- the destination for the export is an explicitly approved secure location
- the backup artifact is encrypted or otherwise protected before transfer

## Recommended minimal pg_dump command pattern (owner-run only, examples only)

These are examples for a trusted owner machine. They are not executed by this repository and must not be pasted into PRs or public logs.

```bash
pg_dump "postgresql://readonly_user@host:5432/dbname" \
  --format=custom \
  --compress=9 \
  --no-owner \
  --no-privileges \
  --clean \
  --if-exists \
  --schema=public \
  --schema=auth \
  --schema=storage \
  > /tmp/myops-production-backup.dump
```

If a full logical export is required, the owner may need separate schema coverage and a manifest that explicitly records custom schemas, RLS/policies, functions, triggers, and any Storage object export limitations.

## Storage and auth coverage limitations

- Supabase logical dumps generally cover database schema/data and most database objects, but they do not automatically include every Storage object payload as a complete file-system snapshot.
- Storage bucket definitions, ACL metadata, and object lists may require separate explicit verification.
- Auth/custom schemas, roles, grants, policies, functions and triggers require verification against a backup manifest rather than a table count or dashboard listing.
- A dashboard screenshot or public catalog count is not proof of a complete backup.

## Transfer and artifact handling

- The artifact must be placed only in an approved private transfer location.
- The file must be encrypted or protected before transfer and uploaded only to a secure, explicitly authorized destination.
- The repo and GitHub Actions logs must never contain raw dump contents, DB credentials, or unredacted backup metadata.
- The artifact should be consumed only by the localhost-only GitHub Actions restore rehearsal workflow after explicit owner approval.

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
