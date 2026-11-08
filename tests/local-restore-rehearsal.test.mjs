import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import {
  dumpFormat,
  findBackupFiles,
  LOCAL_RESTORE_TARGET,
  parseRestoreTarget,
  resultFromOutcomes,
  validateManifest,
} from '../scripts/local-restore-rehearsal-guard.mjs';

const temporaryDirectory = () => mkdtempSync(join(tmpdir(), 'restore-rehearsal-'));

test('only accepts the exact disposable localhost database URL', () => {
  assert.equal(parseRestoreTarget(LOCAL_RESTORE_TARGET).hostname, '127.0.0.1');
  for (const target of [
    '',
    'localhost',
    'https://127.0.0.1:5432/restore_rehearsal',
    'postgresql://localhost:5432/restore_rehearsal',
    'postgresql://127.0.0.1/restore_rehearsal',
    'postgresql://127.0.0.1:5433/restore_rehearsal',
    'postgresql://127.0.0.1:5432/production',
    'postgresql://user@127.0.0.1:5432/restore_rehearsal',
    '******127.0.0.1:5432/restore_rehearsal',
    '******127.0.0.1:5432/restore_rehearsal',
    '******127.0.0.1:5432/restore_rehearsal',
    'postgresql://127.0.0.1:5432/restore_rehearsal/path',
    'postgresql://db.supabase.co:5432/postgres',
    'postgresql://uhuukcztdifvpjuopdea.supabase.co:5432/postgres',
    'postgresql://127.0.0.1:5432/restore_rehearsal?sslmode=require',
  ]) {
    assert.throws(() => parseRestoreTarget(target), undefined, target);
  }
});

test('supports matching pg_dump readers and rejects unsupported formats', () => {
  assert.equal(dumpFormat('source.sql'), 'plain');
  assert.equal(dumpFormat('source.sql.gz'), 'gzip-sql');
  assert.equal(dumpFormat('source.dump'), 'custom');
  assert.equal(dumpFormat('source.tar'), 'tar');
  for (const file of ['source.tar.gz', 'source.zip', 'source.sql.bz2', 'source']) {
    assert.throws(() => dumpFormat(file), /unsupported backup format/);
  }
});

test('requires a single supported dump and manifest in the artifact', () => {
  const directory = temporaryDirectory();
  try {
    assert.throws(() => findBackupFiles(directory), /exactly one supported dump/);
    writeFileSync(join(directory, 'backup-manifest.json'), '{}');
    writeFileSync(join(directory, 'backup.dump'), 'dump');
    assert.equal(findBackupFiles(directory).format, 'custom');
    writeFileSync(join(directory, 'extra.sql'), 'extra');
    assert.throws(() => findBackupFiles(directory), /exactly one supported dump/);
    rmSync(join(directory, 'extra.sql'));
    rmSync(join(directory, 'backup.dump'));
    writeFileSync(join(directory, 'backup.tar.gz'), 'not supported');
    assert.throws(() => findBackupFiles(directory), /exactly one supported dump/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('fails closed for missing, fake, malformed, or mismatched manifests', () => {
  const directory = temporaryDirectory();
  try {
    const dumpPath = join(directory, 'backup.sql');
    const dumpContents = 'SELECT 1;';
    writeFileSync(dumpPath, dumpContents);
    const manifest = {
      sourceRef: 'uhuukcztdifvpjuopdea',
      snapshotAt: '2026-11-07T22:56:25Z',
      postgresMajor: 16,
      pgDumpMajor: 16,
      format: 'plain',
      sha256: createHash('sha256').update(dumpContents).digest('hex'),
      expected: {
        schemas: ['public'],
        tableRows: { 'public.example': 0 },
        rlsEnabledTables: [],
        policies: [],
        constraints: [],
        functions: [],
        triggers: [],
      },
    };
    const manifestContents = JSON.stringify(manifest);
    const manifestHash = createHash('sha256').update(manifestContents).digest('hex');
    const rejectManifest = (candidate, expectedError) => {
      const contents = JSON.stringify(candidate);
      const hash = createHash('sha256').update(contents).digest('hex');
      assert.throws(() => validateManifest(candidate, dumpPath, 'plain', hash, contents), expectedError);
    };
    assert.equal(validateManifest(manifest, dumpPath, 'plain', manifestHash, manifestContents), true);
    assert.throws(() => validateManifest(manifest, dumpPath, 'plain', '0'.repeat(64), manifestContents), /independently supplied checksum/);
    assert.throws(() => validateManifest(manifest, dumpPath, 'custom', manifestHash, manifestContents), /format does not match/);
    rejectManifest(
      { ...manifest, sourceRef: 'ojamkplflqafedmxbdxb' },
      /source project\/ref is not on the MYOPS allowlist/,
    );
    rejectManifest(
      { ...manifest, postgresMajor: 17 },
      /PostgreSQL 16/,
    );
    const incomplete = { ...manifest, expected: { ...manifest.expected, functions: undefined } };
    const incompleteContents = JSON.stringify(incomplete);
    const incompleteHash = createHash('sha256').update(incompleteContents).digest('hex');
    assert.throws(() => validateManifest(incomplete, dumpPath, 'plain', incompleteHash, incompleteContents), /malformed or incomplete/);
    writeFileSync(dumpPath, 'changed');
    assert.throws(() => validateManifest(manifest, dumpPath, 'plain', manifestHash, manifestContents), /dump checksum/);
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('never reports PASS unless every required step succeeded', () => {
  assert.equal(resultFromOutcomes(['success', 'success', 'success']), 'RESTORE_REHEARSAL_PASS');
  for (const outcomes of [
    [],
    ['success', 'failure', 'success'],
    ['success', 'skipped', 'success'],
    ['success', 'cancelled'],
  ]) {
    assert.equal(resultFromOutcomes(outcomes), 'RESTORE_REHEARSAL_FAIL_OR_BLOCKED');
  }
});
