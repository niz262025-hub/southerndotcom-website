import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const LOCAL_RESTORE_TARGET = 'postgresql://127.0.0.1:5432/restore_rehearsal';

export const SYNTHETIC_EXPECTED = Object.freeze({
  schemas: ['public', 'rehearsal'],
  tableRows: { 'rehearsal.fixture_items': 1 },
  rlsEnabledTables: ['rehearsal.fixture_items'],
  policies: ['rehearsal.fixture_items.fixture_reader_select'],
  constraints: [
    'rehearsal.fixture_items.fixture_items_label_key:u:true',
    'rehearsal.fixture_items.fixture_items_pkey:p:true',
  ],
  functions: ['rehearsal.fixture_touch()'],
  triggers: ['rehearsal.fixture_items.fixture_touch_trigger'],
  roles: ['rehearsal_reader'],
  grants: ['rehearsal_reader.rehearsal.fixture_items.SELECT'],
});

export function parseRestoreTarget(value) {
  if (value !== LOCAL_RESTORE_TARGET) {
    throw new Error('restore target must exactly match the disposable localhost target');
  }
  const parsed = new URL(value);
  if (
    parsed.protocol !== 'postgresql:' ||
    parsed.hostname !== '127.0.0.1' ||
    parsed.port !== '5432' ||
    parsed.pathname !== '/restore_rehearsal' ||
    parsed.username ||
    parsed.password ||
    parsed.search ||
    parsed.hash
  ) {
    throw new Error('restore target is malformed or not the fixed local database');
  }
  return parsed;
}

export function dumpFormat(filePath) {
  const name = filePath.toLowerCase();
  if (name.endsWith('.sql')) return 'plain';
  if (name.endsWith('.sql.gz')) return 'gzip-sql';
  if (name.endsWith('.dump')) return 'custom';
  if (name.endsWith('.tar')) return 'tar';
  throw new Error('unsupported backup format; custom and tar archives require pg_restore');
}

export function resultFromOutcomes(outcomes) {
  return outcomes.length > 0 && outcomes.every((outcome) => outcome === 'success')
    ? 'SYNTHETIC_REHEARSAL_PASS'
    : 'SYNTHETIC_REHEARSAL_FAIL';
}

export function createSyntheticFixture(directory) {
  mkdirSync(directory, { recursive: true });
  const sql = [
    'CREATE ROLE rehearsal_reader NOLOGIN;',
    'CREATE SCHEMA rehearsal;',
    'CREATE TABLE rehearsal.fixture_items (id integer PRIMARY KEY, label text NOT NULL UNIQUE);',
    "INSERT INTO rehearsal.fixture_items (id, label) VALUES (1, 'synthetic-only');",
    'ALTER TABLE rehearsal.fixture_items ENABLE ROW LEVEL SECURITY;',
    'CREATE POLICY fixture_reader_select ON rehearsal.fixture_items FOR SELECT TO rehearsal_reader USING (true);',
    'CREATE FUNCTION rehearsal.fixture_touch() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;',
    'CREATE TRIGGER fixture_touch_trigger BEFORE UPDATE ON rehearsal.fixture_items FOR EACH ROW EXECUTE FUNCTION rehearsal.fixture_touch();',
    'GRANT SELECT ON rehearsal.fixture_items TO rehearsal_reader;',
    '',
  ].join('\n');
  const dumpPath = join(directory, 'synthetic-fixture.sql');
  const manifestPath = join(directory, 'synthetic-manifest.json');
  const manifest = {
    sourceRef: 'synthetic-fixture',
    snapshotAt: new Date().toISOString(),
    postgresMajor: 16,
    pgDumpMajor: 16,
    format: 'plain',
    sha256: createHash('sha256').update(sql).digest('hex'),
    expected: SYNTHETIC_EXPECTED,
  };
  const manifestContents = `${JSON.stringify(manifest, null, 2)}\n`;
  writeFileSync(dumpPath, sql, { mode: 0o600 });
  writeFileSync(manifestPath, manifestContents, { mode: 0o600 });
  return {
    dumpPath,
    manifestPath,
    manifestHash: createHash('sha256').update(manifestContents).digest('hex'),
  };
}

export function validateSyntheticManifest(manifest, dumpPath, manifestContents, expectedHash) {
  const manifestHash = createHash('sha256').update(manifestContents).digest('hex');
  if (!/^[a-f0-9]{64}$/i.test(expectedHash ?? '') || manifestHash !== expectedHash.toLowerCase()) {
    throw new Error('synthetic manifest checksum mismatch');
  }
  if (manifest.sourceRef !== 'synthetic-fixture' || manifest.format !== 'plain') {
    throw new Error('only the generated synthetic fixture is accepted');
  }
  if (manifest.postgresMajor !== 16 || manifest.pgDumpMajor !== 16 ||
      typeof manifest.snapshotAt !== 'string' || Number.isNaN(Date.parse(manifest.snapshotAt))) {
    throw new Error('synthetic fixture manifest metadata is invalid');
  }
  const dumpHash = createHash('sha256').update(readFileSync(dumpPath)).digest('hex');
  if (dumpHash !== manifest.sha256) throw new Error('synthetic dump checksum mismatch');
  if (JSON.stringify(manifest.expected) !== JSON.stringify(SYNTHETIC_EXPECTED)) {
    throw new Error('synthetic fixture manifest expectations were changed');
  }
  return true;
}

function runQuery(sql) {
  let output;
  try {
    output = execFileSync('psql', [
      '--no-psqlrc', '--quiet', '--tuples-only', '--no-align',
      '--set=ON_ERROR_STOP=1', '--command', sql,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error('synthetic database catalog or row-count query failed');
  }
  return JSON.parse(output || '[]');
}

function compareArray(expected, actual, label) {
  if (JSON.stringify([...expected].sort()) !== JSON.stringify([...actual].sort())) {
    throw new Error(`synthetic ${label} do not match the fixture manifest`);
  }
}

export function compareDatabaseToSyntheticManifest(manifest) {
  if (manifest.sourceRef !== 'synthetic-fixture' ||
      JSON.stringify(manifest.expected) !== JSON.stringify(SYNTHETIC_EXPECTED)) {
    throw new Error('only the generated synthetic fixture manifest can be compared');
  }
  const expected = manifest.expected;
  compareArray(expected.schemas, runQuery(
    `SELECT COALESCE(json_agg(schema_name ORDER BY schema_name), '[]'::json) ` +
    `FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg\\_%' ESCAPE '\\' ` +
    `AND schema_name <> 'information_schema'`,
  ), 'schema inventory');
  compareArray(Object.keys(expected.tableRows), runQuery(
    `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname ORDER BY n.nspname, c.relname), '[]'::json) ` +
    `FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace ` +
    `WHERE c.relkind IN ('r', 'p') AND n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' ` +
    `AND n.nspname <> 'information_schema'`,
  ), 'table inventory');

  const actualRows = runQuery(
    `SELECT json_build_object('rehearsal.fixture_items', ` +
    `(SELECT count(*) FROM rehearsal.fixture_items))`,
  );
  if (JSON.stringify(actualRows) !== JSON.stringify(expected.tableRows)) {
    throw new Error('synthetic row counts do not match the fixture manifest');
  }

  compareArray(expected.rlsEnabledTables, runQuery(
    `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname ORDER BY n.nspname, c.relname), '[]'::json) ` +
    `FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace ` +
    `WHERE c.relrowsecurity AND n.nspname = 'rehearsal'`,
  ), 'RLS table inventory');
  compareArray(expected.policies, runQuery(
    `SELECT COALESCE(json_agg(schemaname || '.' || tablename || '.' || policyname ` +
    `ORDER BY schemaname, tablename, policyname), '[]'::json) FROM pg_policies WHERE schemaname = 'rehearsal'`,
  ), 'policies');
  compareArray(expected.constraints, runQuery(
    `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname || '.' || k.conname || ':' || ` +
    `k.contype::text || ':' || k.convalidated::text ORDER BY n.nspname, c.relname, k.conname), '[]'::json) ` +
    `FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid ` +
    `JOIN pg_namespace n ON n.oid = c.relnamespace WHERE n.nspname = 'rehearsal' AND k.contype <> 'n'`,
  ), 'constraints');
  compareArray(expected.functions, runQuery(
    `SELECT COALESCE(json_agg(n.nspname || '.' || p.proname || '(' || ` +
    `pg_get_function_identity_arguments(p.oid) || ')' ORDER BY n.nspname, p.proname), '[]'::json) ` +
    `FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace WHERE n.nspname = 'rehearsal'`,
  ), 'functions');
  compareArray(expected.triggers, runQuery(
    `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname || '.' || t.tgname ` +
    `ORDER BY n.nspname, c.relname, t.tgname), '[]'::json) ` +
    `FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid ` +
    `JOIN pg_namespace n ON n.oid = c.relnamespace WHERE NOT t.tgisinternal AND n.nspname = 'rehearsal'`,
  ), 'triggers');
  compareArray(expected.roles, runQuery(
    `SELECT COALESCE(json_agg(rolname ORDER BY rolname), '[]'::json) FROM pg_roles WHERE rolname = 'rehearsal_reader'`,
  ), 'roles');
  compareArray(expected.grants, runQuery(
    `SELECT COALESCE(json_agg(grantee || '.' || table_schema || '.' || table_name || '.' || privilege_type ` +
    `ORDER BY grantee, table_schema, table_name, privilege_type), '[]'::json) ` +
    `FROM information_schema.table_privileges WHERE grantee = 'rehearsal_reader' AND table_schema = 'rehearsal'`,
  ), 'grants');
  return true;
}

function main(args) {
  const [command, ...values] = args;
  if (command === 'target') {
    const target = parseRestoreTarget(values[0]);
    if (!process.env.GITHUB_ENV) throw new Error('GITHUB_ENV is required');
    writeFileSync(process.env.GITHUB_ENV, [
      `PGHOST=${target.hostname}`,
      `PGPORT=${target.port}`,
      `PGDATABASE=${target.pathname.slice(1)}`,
      `RESTORE_TARGET=${target.href}`,
      'PGUSER=postgres',
      'PGSSLMODE=disable',
    ].join('\n') + '\n', { flag: 'a' });
    process.stdout.write('LOCAL_SYNTHETIC_TARGET_VALIDATED\n');
    return;
  }
  if (command === 'fixture') {
    if (!process.env.RUNNER_TEMP || !process.env.GITHUB_OUTPUT) {
      throw new Error('runner temp/output paths required');
    }
    const fixture = createSyntheticFixture(join(process.env.RUNNER_TEMP, 'synthetic-fixture'));
    for (const [key, value] of Object.entries({
      dump: fixture.dumpPath,
      manifest: fixture.manifestPath,
      manifest_hash: fixture.manifestHash,
    })) {
      process.stdout.write(`::add-mask::${value}\n`);
      writeFileSync(process.env.GITHUB_OUTPUT, `${key}=${value}\n`, { flag: 'a' });
    }
    process.stdout.write('SYNTHETIC_FIXTURE_GENERATED\n');
    return;
  }
  if (command === 'manifest') {
    const [manifestPath, dumpPath, expectedHash] = values;
    const contents = readFileSync(manifestPath, 'utf8');
    validateSyntheticManifest(JSON.parse(contents), dumpPath, contents, expectedHash);
    process.stdout.write('SYNTHETIC_MANIFEST_VERIFIED\n');
    return;
  }
  if (command === 'compare') {
    compareDatabaseToSyntheticManifest(JSON.parse(readFileSync(values[0], 'utf8')));
    process.stdout.write('SYNTHETIC_DATABASE_COMPARISONS_PASSED\n');
    return;
  }
  if (command === 'result') {
    process.stdout.write(`${resultFromOutcomes(values)}\n`);
    return;
  }
  throw new Error('unknown synthetic rehearsal command');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`SYNTHETIC_REHEARSAL_FAILED: ${error.message}\n`);
    process.exitCode = 1;
  }
}
