import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { PGlite } from '@electric-sql/pglite';
import {
  createSyntheticFixture,
  dumpFormat,
  LOCAL_RESTORE_TARGET,
  parseRestoreTarget,
  resultFromOutcomes,
  SYNTHETIC_EXPECTED,
  validateSyntheticManifest,
} from '../scripts/local-restore-rehearsal-guard.mjs';

const temporaryDirectory = () => mkdtempSync(join(tmpdir(), 'restore-rehearsal-'));

test('only accepts the exact disposable localhost database URL', () => {
  assert.equal(parseRestoreTarget(LOCAL_RESTORE_TARGET).hostname, '127.0.0.1');
  for (const target of [
    '',
    'localhost',
    'https://127.0.0.1:5432/restore_rehearsal',
    'postgres://127.0.0.1:5432/restore_rehearsal',
    'postgresql://localhost:5432/restore_rehearsal',
    'postgresql://127.0.0.1/restore_rehearsal',
    'postgresql://127.0.0.1:5433/restore_rehearsal',
    'postgresql://127.0.0.1:5432/production',
    '******127.0.0.1:5432/restore_rehearsal',
    'postgresql://127.0.0.1:5432/restore_rehearsal/path',
    'postgresql://db.supabase.co:5432/postgres',
    'postgresql://uhuukcztdifvpjuopdea.supabase.co:5432/postgres',
    'postgresql://127.0.0.1:5432/restore_rehearsal?sslmode=require',
  ]) {
    assert.throws(() => parseRestoreTarget(target), undefined, target);
  }
});

test('Actions workflow is synthetic-only and has no real backup or remote database path', () => {
  const workflow = readFileSync(new URL('../.github/workflows/myops-local-restore-rehearsal.yml', import.meta.url), 'utf8');
  assert.match(workflow, /workflow_dispatch:/);
  assert.match(workflow, /contents:\s*read/);
  assert.match(workflow, /Generate synthetic fixture and manifest/);
  assert.match(workflow, /Restore only the generated synthetic SQL fixture/);
  assert.match(workflow, /127\.0\.0\.1:5432:5432/);
  assert.doesNotMatch(
    workflow,
    /actions\/(?:download|upload)-artifact|artifact_run_id|backup_artifact_name|SUPABASE|pg_dump|https?:\/\/|curl\s/i,
  );
  assert.match(workflow, />"\$\{RUNNER_TEMP\}\/synthetic-restore\.log" 2>&1/);
  assert.match(workflow, /rm -rf "\$\{RUNNER_TEMP\}\/synthetic-fixture"/);
});

test('archive formats are identified explicitly; unsupported formats fail closed', () => {
  assert.equal(dumpFormat('source.sql'), 'plain');
  assert.equal(dumpFormat('source.sql.gz'), 'gzip-sql');
  assert.equal(dumpFormat('source.dump'), 'custom');
  assert.equal(dumpFormat('source.tar'), 'tar');
  for (const file of ['source.tar.gz', 'source.zip', 'source.sql.bz2', 'source']) {
    assert.throws(() => dumpFormat(file), /unsupported backup format/);
  }
});

test('workflow fixture is generated locally and contains synthetic records only', () => {
  const directory = temporaryDirectory();
  try {
    const fixture = createSyntheticFixture(directory);
    const manifestContents = readFileSync(fixture.manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContents);
    assert.equal(manifest.sourceRef, 'synthetic-fixture');
    assert.deepEqual(manifest.expected, SYNTHETIC_EXPECTED);
    assert.match(readFileSync(fixture.dumpPath, 'utf8'), /synthetic-only/);
    assert.equal(
      validateSyntheticManifest(manifest, fixture.dumpPath, manifestContents, fixture.manifestHash),
      true,
    );
    assert.throws(() => validateSyntheticManifest(
      { ...manifest, sourceRef: 'uhuukcztdifvpjuopdea' },
      fixture.dumpPath,
      manifestContents,
      fixture.manifestHash,
    ), /only the generated synthetic fixture/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('synthetic SQL restore reproduces the manifest security and ACL assertions', async () => {
  const directory = temporaryDirectory();
  const db = new PGlite();
  try {
    const fixture = createSyntheticFixture(directory);
    await db.exec(readFileSync(fixture.dumpPath, 'utf8'));
    const aggregate = async (sql) => (await db.query(sql)).rows[0].actual ?? [];
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(schema_name ORDER BY schema_name), '[]'::json) AS actual ` +
      `FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg\\_%' ESCAPE '\\' ` +
      `AND schema_name <> 'information_schema'`,
    ), SYNTHETIC_EXPECTED.schemas);
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname ORDER BY n.nspname, c.relname), '[]'::json) AS actual ` +
      `FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace ` +
      `WHERE c.relkind IN ('r', 'p') AND n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' ` +
      `AND n.nspname <> 'information_schema'`,
    ), Object.keys(SYNTHETIC_EXPECTED.tableRows));
    assert.deepEqual((await db.query('SELECT count(*)::int AS count FROM rehearsal.fixture_items')).rows[0].count, 1);
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname ORDER BY n.nspname, c.relname), '[]'::json) AS actual ` +
      `FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace ` +
      `WHERE c.relrowsecurity AND n.nspname = 'rehearsal'`,
    ), SYNTHETIC_EXPECTED.rlsEnabledTables);
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(schemaname || '.' || tablename || '.' || policyname ` +
      `ORDER BY schemaname, tablename, policyname), '[]'::json) AS actual ` +
      `FROM pg_policies WHERE schemaname = 'rehearsal'`,
    ), SYNTHETIC_EXPECTED.policies);
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname || '.' || k.conname || ':' || ` +
      `k.contype::text || ':' || k.convalidated::text ORDER BY n.nspname, c.relname, k.conname), '[]'::json) AS actual ` +
      `FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid ` +
      `JOIN pg_namespace n ON n.oid = c.relnamespace ` +
      `WHERE n.nspname = 'rehearsal' AND k.contype <> 'n'`,
    ), SYNTHETIC_EXPECTED.constraints);
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(n.nspname || '.' || p.proname || '(' || ` +
      `pg_get_function_identity_arguments(p.oid) || ')' ORDER BY n.nspname, p.proname), '[]'::json) AS actual ` +
      `FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'rehearsal'`,
    ), SYNTHETIC_EXPECTED.functions);
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname || '.' || t.tgname ` +
      `ORDER BY n.nspname, c.relname, t.tgname), '[]'::json) AS actual ` +
      `FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid ` +
      `JOIN pg_namespace n ON n.oid = c.relnamespace WHERE NOT t.tgisinternal AND n.nspname = 'rehearsal'`,
    ), SYNTHETIC_EXPECTED.triggers);
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(rolname ORDER BY rolname), '[]'::json) AS actual ` +
      `FROM pg_roles WHERE rolname = 'rehearsal_reader'`,
    ), SYNTHETIC_EXPECTED.roles);
    assert.deepEqual(await aggregate(
      `SELECT COALESCE(json_agg(grantee || '.' || table_schema || '.' || table_name || '.' || privilege_type ` +
      `ORDER BY grantee, table_schema, table_name, privilege_type), '[]'::json) AS actual ` +
      `FROM information_schema.table_privileges WHERE grantee = 'rehearsal_reader' AND table_schema = 'rehearsal'`,
    ), SYNTHETIC_EXPECTED.grants);
  } finally {
    await db.close();
    rmSync(directory, { recursive: true, force: true });
  }
});

test('rejects fake, altered, missing-checksum, or incomplete manifests', () => {
  const directory = temporaryDirectory();
  try {
    const fixture = createSyntheticFixture(directory);
    const manifestContents = readFileSync(fixture.manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContents);
    assert.throws(() => validateSyntheticManifest(manifest, fixture.dumpPath, '0'.repeat(64), fixture.manifestHash), /checksum mismatch/);
    assert.throws(() => validateSyntheticManifest(manifest, fixture.dumpPath, manifestContents, '0'.repeat(64)), /checksum mismatch/);

    const altered = { ...manifest, expected: { ...manifest.expected, tableRows: {} } };
    const alteredContents = JSON.stringify(altered);
    const alteredHash = createHash('sha256').update(alteredContents).digest('hex');
    assert.throws(() => validateSyntheticManifest(altered, fixture.dumpPath, alteredContents, alteredHash), /expectations were changed/);

    writeFileSync(fixture.dumpPath, 'not the generated fixture');
    assert.throws(() => validateSyntheticManifest(manifest, fixture.dumpPath, manifestContents, fixture.manifestHash), /dump checksum mismatch/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('never reports a rehearsal pass unless every required step succeeded', () => {
  assert.equal(resultFromOutcomes(['success', 'success', 'success']), 'SYNTHETIC_REHEARSAL_PASS');
  for (const outcomes of [
    [],
    ['success', 'failure', 'success'],
    ['success', 'skipped', 'success'],
    ['success', 'cancelled'],
  ]) {
    assert.equal(resultFromOutcomes(outcomes), 'SYNTHETIC_REHEARSAL_FAIL');
  }
});
