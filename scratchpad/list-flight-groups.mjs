/**
 * Read-only listing of flight_group + roster — same safety pattern as
 * scripts/.inspect-db.mjs: one READ ONLY transaction, rolled back. Prints the
 * share link/token and the current roster so testing can be aimed precisely.
 *
 * Usage: DATABASE_URL="postgresql://…" node scratchpad/list-flight-groups.mjs
 */

import net from 'node:net'
import pg from 'pg'

if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout === 'function') {
  net.setDefaultAutoSelectFamilyAttemptTimeout(5_000)
}

const raw = process.env.DATABASE_URL
if (!raw) {
  console.error('Set DATABASE_URL. Nothing was read.')
  process.exit(1)
}

const DROP_PARAMS = ['channel_binding', 'sslmode']
let url = raw
try {
  const u = new URL(raw)
  for (const p of DROP_PARAMS) u.searchParams.delete(p)
  url = u.toString()
} catch {}

const pool = new pg.Pool({
  connectionString: url,
  ssl: process.env.DATABASE_SSL === 'false' ? undefined : { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  max: 1,
})

try {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SET TRANSACTION READ ONLY')

    const { rows: groups } = await client.query(`
      SELECT flight_group_id, status, share_link, organizer_user_id, spaces_total
      FROM flight_group ORDER BY created_at ASC
    `)

    for (const g of groups) {
      console.log(`\n  GROUP  ${g.flight_group_id}  (${g.status})`)
      console.log(`  share_link  ${g.share_link}`)
      console.log(`  organizer_user_id  ${g.organizer_user_id}`)

      const { rows: members } = await client.query(
        `SELECT m.user_id, m.role, m.joined_at, u.email
           FROM flight_group_member m
           JOIN users u ON u.id = m.user_id
          WHERE m.flight_group_id = $1
          ORDER BY m.joined_at ASC`,
        [g.flight_group_id],
      )
      console.log('  ROSTER')
      for (const m of members) {
        console.log(`    user ${m.user_id}  ${m.role.padEnd(16)} ${m.email}`)
      }
    }

    const { rows: allUsers } = await client.query(
      `SELECT id, email FROM users ORDER BY id ASC`,
    )
    console.log(`\n  ALL USERS (${allUsers.length})`)
    for (const u of allUsers) {
      console.log(`    ${u.id}  ${u.email}`)
    }

    console.log('\n  Nothing was written. Session was read-only throughout.\n')
    await client.query('ROLLBACK')
  } finally {
    await client.query('ROLLBACK').catch(() => {})
    client.release()
  }
} catch (err) {
  console.error(`\n  FAILED: ${err.message}`)
  if (err.code) console.error(`  code: ${err.code}`)
  process.exitCode = 1
} finally {
  await pool.end()
}
