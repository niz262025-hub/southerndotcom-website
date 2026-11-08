import { createHash } from 'node:crypto';
import { copyFileSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export const LOCAL_RESTORE_TARGET = 'postgresql://127.0.0.1:5432/restore_rehearsal';
const allowedSourceRefs = new Set(['uhuukcztdifvpjuopdea', 'wengxxiqwtosirealghx']);

const expectedManifestFields = [
  'schemas',
  'tableRows',
  'rlsEnabledTables',
  'policies',
  'constraints',
  'functions',
  'triggers',
];

export function parseRestoreTarget(value) {
  if (value !== LOCAL_RESTORE_TARGET) {
    throw new Error('restore target must exactly match the disposable localhost target');
  }
  const parsed = new URL(value);
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
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
  throw new Error('unsupported backup format; accepted formats are .sql, .sql.gz, .dump, and .tar');
}

export function findBackupFiles(artifactDir) {
  const files = [];
  const visit = (directory) => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) visit(path);
      else if (entry.isFile()) files.push(path);
    }
  };
  visit(artifactDir);
  const manifests = files.filter((file) => file.split(/[\\/]/).at(-1) === 'backup-manifest.json');
  const dumps = files.filter((file) => {
    try {
      dumpFormat(file);
      return true;
    } catch {
      return false;
    }
  });
  if (files.length !== 2 || manifests.length !== 1 || dumps.length !== 1) {
    throw new Error('artifact must contain exactly one supported dump and backup-manifest.json');
  }
  return { manifestPath: manifests[0], dumpPath: dumps[0], format: dumpFormat(dumps[0]) };
}

export function resultFromOutcomes(outcomes) {
  return outcomes.length > 0 && outcomes.every((outcome) => outcome === 'success')
    ? 'RESTORE_REHEARSAL_PASS'
    : 'RESTORE_REHEARSAL_FAIL_OR_BLOCKED';
}

export function validateManifest(
  manifest,
  dumpPath,
  format,
  expectedManifestSha256,
  manifestContents = JSON.stringify(manifest),
) {
  const manifestSha256 = createHash('sha256').update(manifestContents).digest('hex');
  if (manifestSha256 !== expectedManifestSha256.toLowerCase()) {
    throw new Error('manifest checksum does not match the independently supplied checksum');
  }
  if (!/^[a-f0-9]{64}$/i.test(manifest.sha256 ?? '')) {
    throw new Error('manifest must include a SHA-256 checksum for the dump');
  }
  const dumpSha256 = createHash('sha256').update(readFileSync(dumpPath)).digest('hex');
  if (dumpSha256 !== manifest.sha256.toLowerCase()) {
    throw new Error('dump checksum does not match the manifest');
  }
  if (manifest.format !== format) {
    throw new Error('dump format does not match the manifest');
  }
  if (!allowedSourceRefs.has(manifest.sourceRef)) {
    throw new Error('manifest source project/ref is not on the MYOPS allowlist');
  }
  if (!Number.isInteger(manifest.postgresMajor) || manifest.postgresMajor !== 16 ||
      !Number.isInteger(manifest.pgDumpMajor) || manifest.pgDumpMajor !== 16) {
    throw new Error('manifest must identify a PostgreSQL 16 source and pg_dump client');
  }
  if (typeof manifest.snapshotAt !== 'string' || Number.isNaN(Date.parse(manifest.snapshotAt))) {
    throw new Error('manifest must include a valid snapshot timestamp');
  }
  const expected = manifest.expected;
  if (!expected || typeof expected !== 'object' || Array.isArray(expected)) {
    throw new Error('manifest is missing expected database checks');
  }
  for (const field of expectedManifestFields) {
    if (!(field in expected)) throw new Error(`manifest is missing expected ${field}`);
  }
  if (
    !Array.isArray(expected.schemas) ||
    expected.schemas.length === 0 ||
    !Array.isArray(expected.rlsEnabledTables) ||
    !Array.isArray(expected.policies) ||
    !Array.isArray(expected.constraints) ||
    !Array.isArray(expected.functions) ||
    !Array.isArray(expected.triggers) ||
    !expected.tableRows ||
    typeof expected.tableRows !== 'object' ||
    Array.isArray(expected.tableRows) ||
    Object.keys(expected.tableRows).length === 0
  ) {
    throw new Error('manifest expected checks are malformed or incomplete');
  }
  for (const field of ['schemas', 'rlsEnabledTables', 'policies', 'constraints', 'functions', 'triggers']) {
    if (
      expected[field].some((value) => typeof value !== 'string' || value.length === 0) ||
      new Set(expected[field]).size !== expected[field].length
    ) {
      throw new Error(`manifest expected ${field} must contain unique strings`);
    }
  }
  for (const schema of expected.schemas) {
    if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(schema)) {
      throw new Error('manifest contains an invalid schema identifier');
    }
  }
  for (const [table, count] of Object.entries(expected.tableRows)) {
    if (!/^[A-Za-z_][A-Za-z0-9_$]*\.[A-Za-z_][A-Za-z0-9_$]*$/.test(table)) {
      throw new Error('manifest contains an invalid table identifier');
    }
    if (!Number.isSafeInteger(count) || count < 0) {
      throw new Error('manifest contains an invalid row count');
    }
    if (!expected.schemas.includes(table.split('.')[0])) {
      throw new Error('manifest row count references an unlisted schema');
    }
  }
  return true;
}

function runQuery(sql) {
  let output;
  try {
    output = execFileSync('psql', [
      '--no-psqlrc',
      '--quiet',
      '--tuples-only',
      '--no-align',
      '--set=ON_ERROR_STOP=1',
      '--command',
      sql,
    ], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    throw new Error('database catalog or row-count query failed');
  }
  return JSON.parse(output || '[]');
}

function validatePostgresClients() {
  for (const binary of ['psql', 'pg_restore']) {
    let version;
    try {
      version = execFileSync(binary, ['--version'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      throw new Error('required PostgreSQL client tools are unavailable');
    }
    const major = Number(version.match(/\)\s*(\d+)\./)?.[1]);
    if (!Number.isInteger(major) || major < 16) {
      throw new Error('PostgreSQL client tools must be version 16 or newer');
    }
  }
  return true;
}

function quoteIdentifier(identifier) {
  if (!/^[A-Za-z_][A-Za-z0-9_$]*$/.test(identifier)) {
    throw new Error('manifest contains an invalid SQL identifier');
  }
  return `"${identifier}"`;
}

function compareArray(expected, actual, label) {
  const sortedExpected = [...expected].sort();
  const sortedActual = [...actual].sort();
  if (JSON.stringify(sortedExpected) !== JSON.stringify(sortedActual)) {
    throw new Error(`restored ${label} do not match the manifest`);
  }
}

export function compareDatabaseToManifest(manifest) {
  const expected = manifest.expected;
  compareArray(expected.schemas, runQuery(
    `SELECT COALESCE(json_agg(schema_name ORDER BY schema_name), '[]'::json) ` +
    `FROM information_schema.schemata WHERE schema_name NOT LIKE 'pg\\_%' ESCAPE '\\' ` +
    `AND schema_name <> 'information_schema'`,
  ), 'schemas');

  const expectedTableNames = Object.keys(expected.tableRows).sort();
  const actualTableNames = runQuery(
    `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname ORDER BY n.nspname, c.relname), '[]'::json) ` +
    `FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace ` +
    `WHERE c.relkind IN ('r', 'p') AND n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' ` +
    `AND n.nspname <> 'information_schema'`,
  );
  compareArray(expectedTableNames, actualTableNames, 'table inventory');

  const rowExpressions = Object.entries(expected.tableRows).map(([table]) => {
    const [schema, name] = table.split('.');
    const literal = table.replaceAll("'", "''");
    return `'${literal}', (SELECT count(*) FROM ${quoteIdentifier(schema)}.${quoteIdentifier(name)})`;
  });
  const actualRows = runQuery(
    `SELECT json_build_object(${rowExpressions.join(', ')})`,
  );
  if (JSON.stringify(Object.fromEntries(Object.entries(actualRows).sort())) !==
      JSON.stringify(Object.fromEntries(Object.entries(expected.tableRows).sort()))) {
    throw new Error('restored table row counts do not match the manifest');
  }

  const comparisons = [
    [
      'rlsEnabledTables',
      `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname ORDER BY n.nspname, c.relname), '[]'::json) ` +
      `FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace ` +
      `WHERE c.relrowsecurity AND n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' ` +
      `AND n.nspname <> 'information_schema'`,
      'RLS-enabled tables',
    ],
    [
      'policies',
      `SELECT COALESCE(json_agg(schemaname || '.' || tablename || '.' || policyname ` +
      `ORDER BY schemaname, tablename, policyname), '[]'::json) FROM pg_policies`,
      'policies',
    ],
    [
      'constraints',
      `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname || '.' || k.conname || ':' || ` +
      `k.contype || ':' || k.convalidated::text ORDER BY n.nspname, c.relname, k.conname), '[]'::json) ` +
      `FROM pg_constraint k JOIN pg_class c ON c.oid = k.conrelid ` +
      `JOIN pg_namespace n ON n.oid = c.relnamespace ` +
      `WHERE n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' AND n.nspname <> 'information_schema'`,
      'constraints',
    ],
    [
      'functions',
      `SELECT COALESCE(json_agg(n.nspname || '.' || p.proname || '(' || ` +
      `pg_get_function_identity_arguments(p.oid) || ')' ORDER BY n.nspname, p.proname, ` +
      `pg_get_function_identity_arguments(p.oid)), '[]'::json) ` +
      `FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace ` +
      `WHERE n.nspname NOT LIKE 'pg\\_%' ESCAPE '\\' AND n.nspname <> 'information_schema'`,
      'functions',
    ],
    [
      'triggers',
      `SELECT COALESCE(json_agg(n.nspname || '.' || c.relname || '.' || t.tgname ` +
      `ORDER BY n.nspname, c.relname, t.tgname), '[]'::json) ` +
      `FROM pg_trigger t JOIN pg_class c ON c.oid = t.tgrelid ` +
      `JOIN pg_namespace n ON n.oid = c.relnamespace WHERE NOT t.tgisinternal`,
      'triggers',
    ],
  ];
  for (const [field, sql, label] of comparisons) {
    compareArray(expected[field], runQuery(sql), label);
  }
  return true;
}

function main(args) {
  const [command, ...values] = args;
  if (command === 'target') {
    const target = parseRestoreTarget(values[0]);
    const envFile = process.env.GITHUB_ENV;
    if (!envFile) throw new Error('GITHUB_ENV is required');
    writeFileSync(envFile, [
      `PGHOST=${target.hostname}`,
      `PGPORT=${target.port}`,
      `PGDATABASE=${target.pathname.slice(1)}`,
      `RESTORE_TARGET=${target.href}`,
      'PGUSER=postgres',
      'PGSSLMODE=disable',
    ].join('\n') + '\n', { flag: 'a' });
    process.stdout.write('LOCAL_TARGET_VALIDATED\n');
    return;
  }
  if (command === 'clients') {
    validatePostgresClients();
    process.stdout.write('POSTGRES_CLIENTS_COMPATIBLE\n');
    return;
  }
  if (command === 'inspect') {
    const backup = findBackupFiles(values[0]);
    const tempDir = process.env.RUNNER_TEMP;
    if (!tempDir || !process.env.GITHUB_OUTPUT) {
      throw new Error('runner temporary directory and GitHub output file are required');
    }
    const extensions = { plain: 'sql', 'gzip-sql': 'sql.gz', custom: 'dump', tar: 'tar' };
    const manifestPath = join(tempDir, 'restore-backup-manifest.json');
    const dumpPath = join(tempDir, `restore-backup.${extensions[backup.format]}`);
    copyFileSync(backup.manifestPath, manifestPath);
    copyFileSync(backup.dumpPath, dumpPath);
    process.stdout.write(`::add-mask::${manifestPath}\n::add-mask::${dumpPath}\n`);
    writeFileSync(
      process.env.GITHUB_OUTPUT,
      `manifest=${manifestPath}\ndump=${dumpPath}\nformat=${backup.format}\n`,
      { flag: 'a' },
    );
    process.stdout.write('ARTIFACT_LAYOUT_VALIDATED\n');
    return;
  }
  if (command === 'manifest') {
    const [manifestPath, dumpPath, format, expectedSha256] = values;
    const manifestContents = readFileSync(manifestPath, 'utf8');
    const manifest = JSON.parse(manifestContents);
    validateManifest(manifest, dumpPath, format, expectedSha256, manifestContents);
    process.stdout.write('MANIFEST_AND_DUMP_CHECKSUMS_VALIDATED\n');
    return;
  }
  if (command === 'compare') {
    const manifest = JSON.parse(readFileSync(values[0], 'utf8'));
    compareDatabaseToManifest(manifest);
    process.stdout.write('MANIFEST_COMPARISONS_PASSED\n');
    return;
  }
  if (command === 'result') {
    process.stdout.write(`${resultFromOutcomes(values)}\n`);
    return;
  }
  throw new Error('unknown restore rehearsal guard command');
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    main(process.argv.slice(2));
  } catch (error) {
    process.stderr.write(`BLOCKED_OR_FAILED: ${error.message}\n`);
    process.exitCode = 1;
  }
}
