/**
 * Database migrations.
 *
 *   node scripts/migrate.mjs                 (reads DATABASE_URL from the env)
 *   npm run migrate                          (local; loads .env.local)
 *
 * Runs inside the Vercel build via `vercel.json`'s buildCommand, ahead of
 * `next build`, so code that reads a column can never deploy before the column
 * exists. That ordering used to be a thing to remember; twice it was not, and
 * the symptom is `service-unavailable` on sign-in with a 503 `42703` on
 * register — both of which name the wrong subsystem.
 *
 * Environment isolation is Vercel's: it injects one DATABASE_URL per
 * environment, so this only ever sees the database it is meant to touch. That
 * is an assumption we cannot verify from outside the client's project, which is
 * why the fingerprint below makes the *database* enforce it too.
 *
 * Deliberately no dependencies beyond `pg`, which is already a runtime
 * dependency and therefore survives `npm ci --omit=dev`.
 *
 * This file cannot import `src/features/auth/server/db.ts`: that module starts
 * with `import 'server-only'`, which is not resolvable outside Next's bundler.
 * The two things worth having from it are copied below and marked.
 */

import net from 'node:net'
import { readdirSync, readFileSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import pg from 'pg'

const { Pool } = pg

/**
 * COPIED FROM db.ts — do not drop.
 *
 * Node 20 turns on Happy Eyeballs with a 250 ms budget per address. Neon
 * publishes both A and AAAA records and takes ~640 ms to accept from outside
 * its own region, so every attempt is cancelled before it completes and the
 * pool reports `AggregateError` with an empty message. A CI container is
 * exactly the case that hits this.
 */
if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout === 'function') {
  net.setDefaultAutoSelectFamilyAttemptTimeout(5_000)
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const MIGRATIONS_DIR = path.join(ROOT, 'migrations')

/** One fixed key, so every runner contends for the same lock. */
const LOCK_KEY = 8_147_326_905

/**
 * What the schema must look like once every migration has run.
 *
 * This is the answer to a real hole: `CREATE TABLE IF NOT EXISTS users` cannot
 * add a column to a table that already exists, so a database that diverged
 * before migrations existed would record 0001 as applied while converging
 * nothing. Recording a version is not the same as having the shape.
 *
 * Only the columns that arrived by ALTER are listed — those are the ones a
 * CREATE TABLE cannot backfill, and therefore the ones that can be silently
 * missing. **Add to this whenever a migration adds a column.**
 */
const EXPECTED_TABLES = [
  'users',
  'accounts',
  'sessions',
  'verification_token',
  'member_profile',
  'flight_group_member',
]
const EXPECTED_USER_COLUMNS = [
  'password_hash',
  'phone',
  'account_id',
  'zoho_contact_id',
  'failed_attempts',
  'locked_until',
  'created_at',
  'password_updated_at',
  'session_version',
]

const sha256 = (s) => createHash('sha256').update(s).digest('hex')

/** Host and database only. The connection string carries a password. */
function describeTarget(url) {
  try {
    const u = new URL(url)
    return `${u.hostname}${u.pathname}`
  } catch {
    return '(unparseable DATABASE_URL)'
  }
}

function loadMigrations() {
  let names
  try {
    names = readdirSync(MIGRATIONS_DIR).filter((f) => f.endsWith('.sql')).sort()
  } catch {
    throw new Error(`No migrations directory at ${MIGRATIONS_DIR}`)
  }

  return names.map((name) => {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, name), 'utf8')
    // Cannot run inside a transaction, and a failure leaves an INVALID index
    // behind. On a database we have no console access to, that is unrecoverable.
    if (/create\s+index\s+concurrently/i.test(sql)) {
      throw new Error(
        `${name} uses CREATE INDEX CONCURRENTLY, which cannot run in a transaction. ` +
          'See migrations/README.md.',
      )
    }
    return { version: name.replace(/\.sql$/, ''), name, sql, checksum: sha256(sql) }
  })
}

async function bootstrap(client) {
  await client.query('BEGIN')
  await client.query(`SELECT pg_advisory_xact_lock(${LOCK_KEY})`)
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version    TEXT PRIMARY KEY,
      checksum   TEXT NOT NULL,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )`)
  await client.query(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    )`)
  await client.query('COMMIT')
}

/**
 * Refuse to run against a database that belongs to a different environment.
 *
 * Vercel's per-environment variable scoping is supposed to make this
 * impossible, but that scoping lives in a project we do not control and cannot
 * inspect. A `DATABASE_URL` set to "All Environments" pointing at production
 * would mean a preview build migrating production, silently. So the database
 * remembers which environment first touched it and refuses the rest.
 *
 * Skipped when VERCEL_ENV is absent, i.e. local runs.
 */
async function checkEnvironment(client) {
  const env = process.env.VERCEL_ENV
  if (!env) return

  const { rows } = await client.query(`SELECT value FROM schema_meta WHERE key = 'vercel_env'`)
  const seen = rows[0]?.value
  if (!seen) {
    await client.query(
      `INSERT INTO schema_meta (key, value) VALUES ('vercel_env', $1)
       ON CONFLICT (key) DO NOTHING`,
      [env],
    )
    console.log(`  environment  ${env} (first run — recorded)`)
    return
  }
  if (seen !== env) {
    throw new Error(
      `This database was first migrated by VERCEL_ENV="${seen}" but this build is ` +
        `"${env}". Refusing: a DATABASE_URL is almost certainly scoped to the wrong ` +
        'environment. Fix the variable rather than clearing schema_meta.',
    )
  }
  console.log(`  environment  ${env}`)
}

async function verifyChecksums(client, migrations) {
  const { rows } = await client.query('SELECT version, checksum FROM schema_migrations')
  const applied = new Map(rows.map((r) => [r.version, r.checksum]))

  for (const m of migrations) {
    const was = applied.get(m.version)
    if (was && was !== m.checksum) {
      throw new Error(
        `${m.name} has changed since it was applied.\n` +
          `  applied: ${was}\n  now:     ${m.checksum}\n` +
          'A migration is immutable once it has run. Add a new one that corrects it.',
      )
    }
  }
  return applied
}

/**
 * Apply one migration, in its own transaction.
 *
 * `pg_advisory_xact_lock` rather than the session-level `pg_advisory_lock`:
 * session locks are not honoured through PgBouncer in transaction mode, which
 * is exactly what Neon's `-pooler` endpoint is.
 *
 * The applied-set is re-read *after* the lock is held, because two runners can
 * interleave between files — the set we loaded before the loop may be stale.
 */
async function apply(client, m) {
  await client.query('BEGIN')
  try {
    // Before the DDL: this runs while the previous deployment is still serving
    // traffic, and an ALTER queued for ACCESS EXCLUSIVE stalls every query
    // behind it. A failed build is a far better outcome than a stalled site.
    await client.query(`SET LOCAL lock_timeout = '5s'`)
    await client.query(`SET LOCAL statement_timeout = '60s'`)
    await client.query(`SELECT pg_advisory_xact_lock(${LOCK_KEY})`)

    const { rowCount } = await client.query(
      'SELECT 1 FROM schema_migrations WHERE version = $1',
      [m.version],
    )
    if (rowCount) {
      await client.query('ROLLBACK')
      return false // another runner won the race
    }

    await client.query(m.sql)
    await client.query(
      'INSERT INTO schema_migrations (version, checksum) VALUES ($1, $2)',
      [m.version, m.checksum],
    )
    await client.query('COMMIT')
    return true
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {})
    throw new Error(`${m.name} failed: ${err.message}`)
  }
}

/** The shape check — see EXPECTED_USER_COLUMNS. */
async function verifyShape(client) {
  const tables = await client.query(
    `SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = ANY($1)`,
    [EXPECTED_TABLES],
  )
  const haveTables = new Set(tables.rows.map((r) => r.table_name))
  const missingTables = EXPECTED_TABLES.filter((t) => !haveTables.has(t))
  if (missingTables.length) {
    throw new Error(`Tables missing after migration: ${missingTables.join(', ')}`)
  }

  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'users'`,
  )
  const haveCols = new Set(cols.rows.map((r) => r.column_name))
  const missingCols = EXPECTED_USER_COLUMNS.filter((c) => !haveCols.has(c))
  if (missingCols.length) {
    throw new Error(
      `users is missing: ${missingCols.join(', ')}. Every migration reported as ` +
        'applied, so this database diverged before migrations existed — ' +
        'CREATE TABLE IF NOT EXISTS cannot add a column to an existing table. ' +
        'Add a migration with an explicit ALTER for each.',
    )
  }
}

async function main() {
  // First line of the build log. Its absence is how you notice that a dashboard
  // Build Command override has quietly replaced vercel.json's buildCommand.
  console.log('── aeroos migrations ─────────────────────────────────────────')

  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Locally: npm run migrate (loads .env.local). ' +
        'On Vercel: set it per environment in Project → Settings → Environment Variables.',
    )
  }
  console.log(`  target       ${describeTarget(connectionString)}`)

  const pool = new Pool({
    connectionString,
    // COPIED FROM db.ts — strict compare against 'true' is deliberate.
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: 1,
    connectionTimeoutMillis: 30_000,
  })

  const client = await pool.connect()
  try {
    const migrations = loadMigrations()
    console.log(`  found        ${migrations.length} migration(s)`)

    await bootstrap(client)
    await checkEnvironment(client)
    const applied = await verifyChecksums(client, migrations)

    let ran = 0
    for (const m of migrations) {
      if (applied.has(m.version)) continue
      const didApply = await apply(client, m)
      if (didApply) {
        console.log(`  applied      ${m.name}`)
        ran += 1
      } else {
        console.log(`  skipped      ${m.name} (applied concurrently)`)
      }
    }

    await verifyShape(client)
    console.log(ran === 0 ? '  up to date' : `  done         ${ran} applied`)
    console.log('──────────────────────────────────────────────────────────────')
  } finally {
    client.release()
    // Without this the build hangs on an open pool.
    await pool.end()
  }
}

main().catch((err) => {
  console.error('\n  MIGRATION FAILED')
  console.error(`  ${err.message}\n`)
  process.exit(1)
})
