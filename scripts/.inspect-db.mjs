/**
 * Read-only inspection of a Neon database.
 *
 * Answers "what is actually in there" before any migration is run, and cannot
 * change anything: everything runs inside one READ ONLY transaction that is
 * rolled back, so Postgres itself rejects any write, DDL included, with 25006.
 * Running it against the wrong database is therefore harmless — the point.
 *
 * Usage:
 *   DATABASE_URL="postgresql://…" node scratchpad/inspect-db.mjs
 *
 * The URL comes from the environment, never a file, so it stays out of the repo.
 */

import net from 'node:net'
import pg from 'pg'

// Node 20's Happy Eyeballs budget is 250ms; Neon's cold connect is ~640ms, so
// without this the connection dies before it is established. This cost a day
// once already.
if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout === 'function') {
  net.setDefaultAutoSelectFamilyAttemptTimeout(5_000)
}

const raw = process.env.DATABASE_URL
if (!raw) {
  console.error('Set DATABASE_URL. Nothing was read.')
  process.exit(1)
}

/**
 * Neon hands out URLs carrying libpq parameters that node-postgres does not
 * implement — `channel_binding` above all, which it forwards verbatim and the
 * server then rejects. `sslmode` is dropped too because SSL is set explicitly
 * on the pool below, and two sources for one setting is how they disagree.
 *
 * Stripped here rather than by hand, so the string the client sent can be
 * pasted exactly as given. Editing a production connection string in a
 * terminal is precisely where a wrong-database mistake gets made.
 */
const DROP_PARAMS = ['channel_binding', 'sslmode']
const stripped = []
let url = raw
try {
  const u = new URL(raw)
  for (const p of DROP_PARAMS) {
    if (u.searchParams.has(p)) {
      stripped.push(`${p}=${u.searchParams.get(p)}`)
      u.searchParams.delete(p)
    }
  }
  url = u.toString()
} catch {
  // Not a parseable URL — hand it to pg unchanged and let it report the fault.
}

/** Tables this application expects, in the order they were introduced. */
const TABLES = [
  'users',
  'accounts',
  'sessions',
  'verification_token',
  'member_profile',
  'flight_group_member',
  'flight_group',
  'schema_migrations',
  'schema_meta',
]

/** Columns added to `users` after the initial schema — the drift suspects. */
const USER_COLUMNS = [
  'password_hash',
  'phone',
  'account_id',
  'zoho_contact_id',
  'failed_attempts',
  'locked_until',
  'password_updated_at',
  'session_version',
]

const pool = new pg.Pool({
  connectionString: url,
  // SSL on by default, because every Neon endpoint requires it. Only a local
  // Docker Postgres needs it off, via DATABASE_SSL=false.
  ssl: process.env.DATABASE_SSL === 'false' ? undefined : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  max: 1,
})

const pad = (s, n) => String(s).padEnd(n)

try {
  const client = await pool.connect()
  try {
    /*
      Read-only is set on the transaction, not as a startup parameter.

      `options: '-c default_transaction_read_only=on'` is the obvious way and it
      fails on Neon's pooled endpoint: PgBouncer refuses unsupported startup
      parameters outright (08P01). Setting it inside the transaction is honoured
      by PgBouncer's transaction mode, so this works on the `-pooler` host and
      the direct one alike — and the guarantee is identical, because Postgres
      rejects any write in a read-only transaction with 25006.

      Everything below therefore runs in one transaction, which is rolled back
      at the end. Nothing is ever committed.
    */
    await client.query('BEGIN')
    await client.query('SET TRANSACTION READ ONLY')

    // ---- 1. Confirm which database we actually reached -------------------
    const { rows: [who] } = await client.query(`
      SELECT current_database() AS db,
             current_user       AS usr,
             inet_server_addr()::text AS addr,
             version()          AS ver
    `)
    const host = url.replace(/:\/\/[^@]*@/, '://***@').match(/@([^/?]+)/)?.[1] ?? '?'

    console.log('\n  CONNECTED TO')
    console.log(`    host      ${host}`)
    console.log(`    database  ${who.db}`)
    console.log(`    user      ${who.usr}`)
    console.log(`    server    ${who.ver.split(' ').slice(0, 2).join(' ')}`)
    if (stripped.length) {
      console.log(`    ignored   ${stripped.join(', ')}  (not supported by node-postgres)`)
    }

    // Prove the session really is read-only before reporting anything else.
    const { rows: [ro] } = await client.query('SHOW transaction_read_only')
    console.log(`    read-only ${ro.transaction_read_only}`)

    // ---- 2. Which tables exist ------------------------------------------
    console.log('\n  TABLES')
    const present = []
    for (const t of TABLES) {
      const { rows: [r] } = await client.query(
        `SELECT to_regclass('public.' || $1) IS NOT NULL AS exists`,
        [t],
      )
      if (r.exists) present.push(t)
      console.log(`    ${r.exists ? '✔' : '·'}  ${t}`)
    }

    // ---- 3. Row counts for what is there --------------------------------
    console.log('\n  ROW COUNTS')
    const counts = {}
    for (const t of present) {
      const { rows: [c] } = await client.query(`SELECT count(*)::int AS n FROM "${t}"`)
      counts[t] = c.n
      console.log(`    ${pad(t, 22)} ${String(c.n).padStart(6)}`)
    }

    // ---- 4. The migration ledger ----------------------------------------
    if (present.includes('schema_migrations')) {
      const { rows } = await client.query(
        `SELECT version, applied_at FROM schema_migrations ORDER BY version`,
      )
      console.log('\n  MIGRATIONS APPLIED')
      if (!rows.length) console.log('    (ledger exists but is empty)')
      for (const r of rows) {
        console.log(`    ${pad(r.version, 30)} ${r.applied_at?.toISOString?.() ?? ''}`)
      }
    } else {
      console.log('\n  MIGRATIONS APPLIED')
      console.log('    no schema_migrations table — this database has never been')
      console.log('    touched by scripts/migrate.mjs. A first run would be a baseline.')
    }

    // ---- 5. Column drift on users ---------------------------------------
    if (present.includes('users')) {
      const { rows } = await client.query(
        `SELECT column_name FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'users'`,
      )
      const have = new Set(rows.map((r) => r.column_name))
      const missing = USER_COLUMNS.filter((c) => !have.has(c))
      console.log('\n  USERS COLUMNS')
      console.log(missing.length
        ? `    MISSING: ${missing.join(', ')}`
        : '    all expected columns present')
    }

    // ---- 6. The question that decides whether 0005 is safe --------------
    console.log('\n  FOREIGN KEY READINESS (migration 0005)')
    if (!present.includes('flight_group_member')) {
      console.log('    flight_group_member does not exist — 0004 will create it empty,')
      console.log('    so 0005 adds its foreign key to an empty table. SAFE.')
    } else if (counts.flight_group_member === 0) {
      console.log('    flight_group_member exists and is empty. SAFE.')
    } else if (!present.includes('flight_group')) {
      console.log(`    STOP. flight_group_member holds ${counts.flight_group_member} row(s) and`)
      console.log('    flight_group does not exist, so every row would violate the new')
      console.log('    foreign key. Backfill flight_group first.')
    } else {
      const { rows: [o] } = await client.query(`
        SELECT count(*)::int AS n
          FROM flight_group_member m
          LEFT JOIN flight_group g USING (flight_group_id)
         WHERE g.flight_group_id IS NULL
      `)
      console.log(o.n === 0
        ? '    every member row references a real group. SAFE.'
        : `    STOP. ${o.n} member row(s) reference no group. Backfill first.`)
    }

    console.log('\n  Nothing was written. Session was read-only throughout.\n')
    // Nothing above wrote anything; the rollback makes that structural rather
    // than a matter of trusting the queries.
    await client.query('ROLLBACK')
  } finally {
    await client.query('ROLLBACK').catch(() => {})
    client.release()
  }
} catch (err) {
  console.error(`\n  FAILED: ${err.message}`)
  if (err.code) console.error(`  code: ${err.code}`)
  console.error('  Nothing was written.\n')
  process.exitCode = 1
} finally {
  await pool.end()
}
