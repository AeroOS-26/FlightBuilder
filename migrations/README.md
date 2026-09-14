# Migrations

Every change to the database shape is a numbered SQL file here. They are applied
by `scripts/migrate.mjs`, which records what it has run in a
`schema_migrations` table, so each file runs exactly once per database.

```bash
npm run migrate          # local — loads .env.local
```


On Vercel this runs automatically, ahead of `next build`, via `vercel.json`'s
`buildCommand`. That ordering is the point: code that reads a column cannot
deploy before the column exists. Getting that wrong produces
`error=CredentialsSignin&code=service-unavailable` on sign-in and a 503
`42703` on register — neither of which names the database.

## Adding one

1. Create `NNNN_short_slug.sql`, numbering from the highest existing file.
   Lexicographic order **is** execution order, which is why these are numbered
   rather than dated.
2. Write plain SQL. Include a comment saying *why*, not just what — the comments
   in `0001`–`0003` are the only record of several decisions.
3. **If it adds a column, add it to `EXPECTED_USER_COLUMNS` in
   `scripts/migrate.mjs`. If it adds a table, add it to `EXPECTED_TABLES`.**
   That list is asserted after every run; without it the migration is recorded
   as applied whether or not it converged anything.
4. Run `npm run migrate` against your local database and confirm it applies.

## Three rules

**Additive only. Never `DROP`, never rename in place.**
Vercel's Instant Rollback re-serves a previous *build* without rebuilding, so a
rollback moves code but not schema. A dropped column is a column the rolled-back
code still expects.

**A migration is immutable once applied.**
The runner checksums each file and refuses to continue if an applied one has
changed. To correct a mistake, add a new migration. Do not edit history, and do
not edit `schema_migrations` by hand — on the client's databases we have no
console access to undo it.

**No `CREATE INDEX CONCURRENTLY`.**
It cannot run inside a transaction, and a failure leaves an INVALID index that
would have to be dropped manually — which we cannot do on a database we cannot
reach. The runner refuses these before opening a connection.

## What the runner guarantees

| | |
| --- | --- |
| Runs once | `schema_migrations` ledger, keyed on filename |
| Safe to re-run | Idempotent; "up to date" and no writes |
| Safe on an existing database | Every statement is `IF NOT EXISTS`, so a database provisioned by hand converges and simply records the versions |
| Concurrency-safe | `pg_advisory_xact_lock`, which survives PgBouncer transaction mode — Neon's `-pooler` endpoint |
| Cannot half-apply | One transaction per file; Postgres DDL is transactional |
| Cannot stall the site | `lock_timeout 5s` / `statement_timeout 60s`, so a queued `ALTER` fails the build rather than blocking live queries |
| Cannot cross environments | The first `VERCEL_ENV` to migrate a database is recorded; a different one is refused |
| Cannot hide drift | Tables and ALTER-added columns are asserted after every run |

## Endpoints

Use the **pooled** (`-pooler`) host for the application and the **direct** host
for schema work. DDL through PgBouncer in transaction mode is a known source of
odd failures.

Set `DATABASE_SSL=true` explicitly rather than relying on `?sslmode=require`
surviving a paste — `db.ts` only enables TLS on that exact string, and a lost
query parameter has already cost a day.

## History

`0001_initial_schema.sql` was `src/features/auth/server/schema.sql` until
2026-09-02. That file was both the bootstrap script and, by accident, an
append-only migration log: new columns were appended as trailing
`ALTER TABLE … ADD COLUMN IF NOT EXISTS` because `CREATE TABLE IF NOT EXISTS`
will not add a column to a table that already exists. It had no ordering and no
record of what had been applied where, and it had already drifted out of step
with the one file in this directory.
