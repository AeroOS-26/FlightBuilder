-- Least-privilege database roles.
--
-- Approved by Chuck on 2026-10-27, four hours of the ten, with the encryption
-- of the Stage 1 identity fields (§47). The two halves are meant to compose:
-- encryption makes a row unreadable without the key, and these roles make most
-- of the row unreachable in the first place.
--
-- ── RUN THIS BY HAND. IT IS NOT A MIGRATION. ────────────────────────────────
--
-- `scripts/migrate.mjs` executes every .sql in `migrations/` on the client's
-- database during their Vercel build. Role and grant changes must never ride
-- in on a build, so this file lives outside that directory on purpose. It is
-- run once per environment, by someone holding the Neon project's owner role,
-- after the passwords below have been replaced.
--
--   psql "$MIGRATION_DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/sql/least-privilege.sql
--
-- ── What it does ────────────────────────────────────────────────────────────
--
--   aeroos_app        the role the running application connects as. Reads and
--                     writes the data. Cannot CREATE, ALTER or DROP anything.
--   aeroos_reporting  read-only, for support and counting. Cannot reach a
--                     credential of any kind.
--
-- The existing owner role keeps DDL and becomes the migration role: it goes in
-- MIGRATION_DATABASE_URL, and DATABASE_URL moves to aeroos_app. `migrate.mjs`
-- falls back to DATABASE_URL when the first is unset, so nothing breaks before
-- this is run and the two can be switched over in either order.
--
-- ── Why aeroos_app gets every table ─────────────────────────────────────────
--
-- Our own SQL writes seven tables and reads nine. `sessions` and `accounts` are
-- never touched by code in this repository — but `@auth/pg-adapter` owns those
-- four tables and we do not control its SQL, and a grant trimmed against an
-- adapter's internals is how sign-in breaks in production at the worst moment.
-- So the privilege actually being removed here is **DDL and ownership**, not
-- individual tables, and that is stated plainly rather than dressed up: this
-- role can still read and write the application's data, because it is the
-- application.
--
-- The narrow one is aeroos_reporting, and that is where the exclusions earn
-- their keep.

\set ON_ERROR_STOP on

BEGIN;

-- ── Roles ───────────────────────────────────────────────────────────────────
--
-- Replace both passwords before running. Generate them with
-- `openssl rand -base64 32`, put them straight into Vercel, and do not paste
-- them back into this file, a chat or a commit.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aeroos_app') THEN
    CREATE ROLE aeroos_app LOGIN PASSWORD 'REPLACE_ME_APP';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'aeroos_reporting') THEN
    CREATE ROLE aeroos_reporting LOGIN PASSWORD 'REPLACE_ME_REPORTING';
  END IF;
END
$$;

-- Nothing inherited by accident: both roles start with nothing and are granted
-- forward. PUBLIC's implicit CREATE on the schema is the one people forget —
-- without this revoke, either role could create its own tables.
REVOKE ALL ON SCHEMA public FROM PUBLIC;
REVOKE CREATE ON SCHEMA public FROM aeroos_app, aeroos_reporting;

-- GRANT ... ON DATABASE takes a name and not an expression, so the database's
-- own name is substituted rather than hard-coded: this script is run against
-- preview and production, and those are two different databases.
DO $$
BEGIN
  EXECUTE format(
    'GRANT CONNECT ON DATABASE %I TO aeroos_app, aeroos_reporting',
    current_database()
  );
END
$$;
GRANT USAGE ON SCHEMA public TO aeroos_app, aeroos_reporting;

-- ── aeroos_app: the application's data, and nothing structural ──────────────

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO aeroos_app;

-- SERIAL primary keys. Without this, every INSERT fails on nextval().
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO aeroos_app;

-- The next migration creates a table this role has never heard of. Default
-- privileges are what stop that being a production outage: they apply to
-- objects created *later* by the owner role, which is the only role that runs
-- migrations. Replace CURRENT_USER if this script is not run as that owner.
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO aeroos_app;
ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO aeroos_app;

-- ── aeroos_reporting: everything except a way in ────────────────────────────
--
-- Excluded outright, and each for a specific reason rather than on principle:
--
--   verification_token  live single-use sign-in and password-reset tokens. A
--                       reader of this table can become any member who has a
--                       link outstanding. This is the one that matters most.
--   sessions, accounts  session and provider records owned by the auth
--                       adapter. Nothing to report on, everything to lose.
--
-- `users` is granted by column, so `password_hash` is unreachable while the
-- roster, verification state and timestamps stay readable.

-- Read from the schema rather than remembered: 0001 plus the ALTERs in 0002
-- and 0003. `password_hash` is the only column left out.
GRANT SELECT (
  id, name, email, "emailVerified", image, phone, account_id, zoho_contact_id,
  failed_attempts, locked_until, created_at, session_version, password_updated_at
) ON users TO aeroos_reporting;

GRANT SELECT ON
  flight_group,
  flight_group_member,
  join_request,
  member_profile,
  organizer_acknowledgment,
  schema_migrations
TO aeroos_reporting;

ALTER DEFAULT PRIVILEGES FOR ROLE CURRENT_USER IN SCHEMA public
  GRANT SELECT ON TABLES TO aeroos_reporting;

-- `join_request.travelers` is readable by this role and that is deliberate: the
-- identity fields inside it are sealed (`identityCrypto.ts`), so what comes
-- back is an envelope and the key lives in the application's environment, not
-- in the database. This is the point of doing both halves — a support query can
-- count requests and see their status without any route to a passport name.

COMMIT;

-- ── Verification. Run after committing; both should return no rows. ─────────
--
-- 1. Can reporting reach a sign-in token or a password hash?
--
--   SELECT grantee, table_name, privilege_type
--     FROM information_schema.table_privileges
--    WHERE grantee = 'aeroos_reporting'
--      AND table_name IN ('verification_token', 'sessions', 'accounts');
--
--   SELECT grantee, column_name
--     FROM information_schema.column_privileges
--    WHERE grantee = 'aeroos_reporting' AND column_name = 'password_hash';
--
-- 2. Can the application role change the schema?
--
--   SELECT has_schema_privilege('aeroos_app', 'public', 'CREATE');   -- false
--   SELECT has_table_privilege('aeroos_app', 'users', 'TRUNCATE');   -- false
--
-- 3. And the positive check, which is the one that catches a grant trimmed too
--    far: sign in on preview, create a group, send a join request, approve it.
--    A missing grant surfaces as 42501 `permission denied`, which reads as a
--    database outage to anyone who has not seen it before.
