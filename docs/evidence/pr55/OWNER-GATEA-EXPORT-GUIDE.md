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
6. Use an approved private, access-controlled transfer route. A private GitHub Actions artifact is permitted only if the owner explicitly approves access for all repository readers and the short retention period; otherwise do not upload the data to GitHub and rehearse on a trusted local runner.
7. Keep the file out of the repository and out of the Actions workflow log output. Redact or mask all credentials and raw SQL output before sharing any summary.
8. Prepare a checksum manifest and a backup inventory that records:
   - source project/ref
   - snapshot timestamp
   - PostgreSQL version and compatible pg_dump version
   - file format (plain SQL, custom, gzip, tar)
   - checksum SHA-256 per artifact
   - schema/data coverage, auth/custom schemas, RLS, functions, triggers, and Storage caveat
   - secure retention period and cleanup steps
9. Only then supply the approved artifact to the localhost-only workflow from a run in this same private repository. The artifact bundle must contain exactly `backup-manifest.json` and one supported `.sql`, `.sql.gz`, `.dump`, or `.tar` file. Supply the artifact's source run ID/name and the manifest SHA-256 through workflow dispatch; verify the manifest hash out of band.

On Android Chrome, once the workflow is available on the default branch, open the repository's **Actions** tab, choose **MYOPS local restore rehearsal**, tap **Run workflow**, select the fixed localhost target, and enter the artifact run ID, exact artifact name, and verified manifest SHA-256. The dispatch form cannot upload a file; an approved artifact must already exist from a trusted owner-controlled runner. If the workflow is not listed, it is not on the default branch yet—do not merge this draft to make it available.

## GitHub Actions artifact handoff limitations

- The workflow downloads an artifact only from a named earlier Actions run in this same repository. It does not accept uploads from the mobile dispatch form and never downloads a Supabase physical backup or contacts a Supabase endpoint.
- The workflow refuses to run against a public repository. A private-repository artifact is still visible to people with repository access; the owner must explicitly approve that access and the temporary retention before using it. Use a short artifact retention period (one day where supported), do not create an artifact if that exposure is not approved, and delete the source artifact/run after the rehearsal. The workflow's ephemeral runner copy is removed when its job ends.
- GitHub Actions artifacts expire according to their configured retention and can persist until deletion/expiry. Downloading an artifact does not shorten or delete the source artifact. Logs report only status, not file names, checksums, row data, or SQL.
- GitHub requires a `workflow_dispatch` workflow to exist on the repository's default branch before it can be manually dispatched. This PR is draft; do not merge it just to activate the workflow. Until the workflow is already available on the default branch and the owner has approved the private artifact route, use a trusted owner-controlled computer/runner for a localhost-only rehearsal or leave the work BLOCKED.
- The workflow can read the dump only after GitHub has decrypted its artifact storage copy; it does not support a client-encrypted dump or request a decryption secret. Do not weaken the private-repository gate, add a secret/passphrase to workflow inputs, or expose a raw dump in logs, the repository, PR comments, screenshots, or a public artifact. If there is no owner-approved private handoff, the exact prerequisite is an owner-provisioned, access-controlled private artifact in this repository with an approved retention window; otherwise use a trusted local runner.

The workflow accepts a separate SHA-256 for the exact manifest bytes and verifies the dump SHA-256 recorded in that manifest. The manifest must identify only MYOPS Central Auth production (`uhuukcztdifvpjuopdea`) or its candidate staging branch (`wengxxiqwtosirealghx`), include the snapshot timestamp and PostgreSQL/pg_dump major versions, and identify a PostgreSQL 16 source. It must include the complete user-schema inventory, every user table's row count, RLS-enabled tables, policies, constraints, functions, and non-internal triggers. Other source refs or database majors are rejected. A checksum proves integrity relative to the supplied hash, not source authenticity; the owner must verify the manifest/hash and source snapshot independently. Unsupported formats (including `.tar.gz`) are rejected rather than sent to `psql`.

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
- The file must be encrypted or protected before transfer and uploaded only to a secure, explicitly authorized destination. For the Actions path, GitHub artifact storage is the protection boundary; owner approval must explicitly accept repository-reader access. Client-encrypted artifacts require a separate trusted local restore path because this workflow has no decryption mechanism.
- The repo and GitHub Actions logs must never contain raw dump contents, DB credentials, or unredacted backup metadata.
- The artifact may be consumed only by the localhost-only GitHub Actions restore rehearsal workflow after explicit owner approval and confirmation of private-repository access/retention. The workflow uses `psql` for plain/gzip SQL and `pg_restore` for custom/tar archives.

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
