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

import { Pool } from 'pg'

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
