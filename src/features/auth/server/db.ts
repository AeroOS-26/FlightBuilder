import 'server-only'

/**
 * Postgres connection pool — server-only.
 *
 * One pool per process, cached on globalThis so Next's dev-mode module reloading
 * does not open a new pool on every edit and exhaust the server's connections.
 *
 * The identity store is ours; Zoho holds the CRM record, not the login. Nothing
 * in this file knows about Zoho.
 */

import net from 'node:net'
import { Pool } from 'pg'

/**
 * Give a connection attempt long enough to actually complete.
 *
 * Node 20 enables `autoSelectFamily` (Happy Eyeballs) by default and allows
 * each address **250 ms**. Neon publishes A *and* AAAA records, and accepting a
 * connection takes roughly 640 ms from outside its own region — so every
 * attempt was cancelled before it finished and the pool raised
 * `AggregateError` with an empty message and `code: 'ETIMEDOUT'`.
 *
 * That error names nothing, arrives on the first query of any request, and is
 * reported by Auth.js as `error=Configuration` — which reads as a broken auth
 * config rather than a network budget. It cost most of a day. Measured against
 * the deployed database: 250 ms fails every time, warm or cold; 5 s connects in
 * about 2 s. Credentials, TLS and schema were correct throughout.
 *
 * Raised rather than disabled: Happy Eyeballs still helps here, because an
 * unreachable IPv6 address fails in ~1 ms and falls straight through to IPv4.
 * Turning it off would pin us to whichever family DNS happened to list first.
 *
 * This is process-wide, which is why it sits beside the pool that needs it.
 */
if (typeof net.setDefaultAutoSelectFamilyAttemptTimeout === 'function') {
  net.setDefaultAutoSelectFamilyAttemptTimeout(5_000)
}

declare global {
  // eslint-disable-next-line no-var
  var __aeroosPgPool: Pool | undefined
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is not set. Copy .env.example to .env.local and point it at a Postgres instance.',
    )
  }
  return new Pool({
    connectionString,
    // Hosted Postgres almost always requires TLS; local development does not.
    ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    // Bound the wait so an unreachable database fails as a timeout we can read,
    // rather than holding a request open until the platform kills it.
    connectionTimeoutMillis: 10_000,
  })
}

function getPool(): Pool {
  if (!globalThis.__aeroosPgPool) globalThis.__aeroosPgPool = createPool()
  return globalThis.__aeroosPgPool
}

/**
 * The pool, created on first use rather than at import.
 *
 * `next build` evaluates route modules to collect page data, so constructing a
 * pool at module scope made a database a build-time requirement and failed CI
 * with no DATABASE_URL. This proxy defers that to the first actual query, so the
 * build needs no database and a missing connection string surfaces at runtime,
 * where it can be reported properly.
 */
export const pool: Pool = new Proxy({} as Pool, {
  get(_t, prop, receiver) {
    const value = Reflect.get(getPool(), prop, receiver)
    return typeof value === 'function' ? value.bind(getPool()) : value
  },
})

/** True when a connection string is configured at all. */
export function isDatabaseConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL)
}

/** Typed single-row helper — returns null rather than throwing on empty. */
export async function queryOne<T>(sql: string, params: unknown[] = []): Promise<T | null> {
  const { rows } = await pool.query(sql, params)
  return (rows[0] as T | undefined) ?? null
}
