-- AeroOS Flight Club — identity schema (Milestone 1)
--
-- Identity is owned by the application: this database holds members,
-- credentials and sessions. Zoho holds the CRM record, not the login, and the
-- two are reconciled on email (see docs/FLIGHT-CLUB-M1-HANDOFF.md §2).
--
-- The first four tables are Auth.js's required shape for @auth/pg-adapter and
-- must keep these names and columns. Everything AeroOS adds lives either as
-- extra columns on "users" or in member_profile, so an adapter upgrade cannot
-- silently drop our data.
--
-- Apply with:  psql "$DATABASE_URL" -f src/features/auth/server/schema.sql

-- Account ids are issued from a sequence so they match the payload contract's
-- form exactly: acct_5001, acct_5002, … The contract's own samples start at
-- 5001, so the sequence does too.
CREATE SEQUENCE IF NOT EXISTS account_id_seq START WITH 5001 INCREMENT BY 1;

CREATE TABLE IF NOT EXISTS verification_token (
  identifier TEXT NOT NULL,
  expires    TIMESTAMPTZ NOT NULL,
  token      TEXT NOT NULL,
  PRIMARY KEY (identifier, token)
);

CREATE TABLE IF NOT EXISTS accounts (
  id                  SERIAL,
  "userId"            INTEGER NOT NULL,
  type                VARCHAR(255) NOT NULL,
  provider            VARCHAR(255) NOT NULL,
  "providerAccountId" VARCHAR(255) NOT NULL,
  refresh_token       TEXT,
  access_token        TEXT,
  expires_at          BIGINT,
  id_token            TEXT,
  scope               TEXT,
  session_state       TEXT,
  token_type          TEXT,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS sessions (
  id             SERIAL,
  "userId"       INTEGER NOT NULL,
  expires        TIMESTAMPTZ NOT NULL,
  "sessionToken" VARCHAR(255) NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE IF NOT EXISTS users (
  id              SERIAL,
  name            VARCHAR(255),
  email           VARCHAR(255),
  "emailVerified" TIMESTAMPTZ,
  image           TEXT,

  -- ── AeroOS additions ────────────────────────────────────────────────────
  -- Credentials. Null for a member who has only ever used a magic link, which
  -- is why sign-in must not assume a hash exists.
  password_hash   TEXT,
  phone           VARCHAR(64),

  -- The account id. This is the SAME value the payload contract carries as
  -- `account_id` on every member object (acct_5001, acct_5002, …) and the same
  -- value frame 35 shows — they are one concept, not two. Issued from the
  -- sequence below so the format matches the contract exactly.
  account_id      VARCHAR(32) UNIQUE,

  -- Reconciliation with the CRM. Email is Zoho's dedup key, so this is the
  -- link between an account and its Contact.
  zoho_contact_id VARCHAR(64),

  -- Lockout, per frame 32 variant 3. CONFIRM: threshold and duration are not
  -- specified; the values live in config/authConfig.ts, not here.
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  locked_until    TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (id)
);

-- Email is the identity key and the CRM dedup key, so it is unique and
-- case-insensitive. Addresses are lower-cased on write as well; the index is
-- the backstop, not the only guard.
CREATE UNIQUE INDEX IF NOT EXISTS users_email_lower_idx ON users (LOWER(email));

CREATE INDEX IF NOT EXISTS sessions_token_idx ON sessions ("sessionToken");
CREATE INDEX IF NOT EXISTS accounts_user_idx   ON accounts ("userId");

-- Profile captured on frame 31. Travelers and pets are documents rather than
-- tables: they are drafts a member edits as a set, always read and written
-- whole, and their shape is owned by the payload contract rather than by us.
CREATE TABLE IF NOT EXISTS member_profile (
  user_id                  INTEGER PRIMARY KEY,
  travelers                JSONB NOT NULL DEFAULT '[]'::jsonb,
  pets                     JSONB NOT NULL DEFAULT '[]'::jsonb,
  pets_enabled             BOOLEAN NOT NULL DEFAULT FALSE,
  travel_readiness_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  notify_email             BOOLEAN NOT NULL DEFAULT TRUE,
  notify_sms               BOOLEAN NOT NULL DEFAULT TRUE,
  notify_routes            BOOLEAN NOT NULL DEFAULT FALSE,
  completed_at             TIMESTAMPTZ,
  updated_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Added 2026-08-26. Frame 38B states when the password was last changed; that
-- was a fixed string from the design until now, with nothing recording the real
-- event. ALTER rather than a column in CREATE TABLE above, because the table
-- already exists on deployed databases and CREATE TABLE IF NOT EXISTS will not
-- add a column to one.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;

-- Added 2026-09-01. Session revocation.
--
-- Sessions are JWTs, so there is no row to delete when we need to end one. The
-- standard remedy is a version the token carries and the server compares: bump
-- this column and every token minted before the bump stops validating, while
-- the device that caused the bump is re-issued a token carrying the new value
-- and stays signed in.
--
-- Client's instruction, 29 Aug: a password reset signs in the device that
-- completed it and ends every other session; changing a password while signed
-- in behaves the same way for the device doing the changing.
--
-- NOT NULL DEFAULT 0 so existing rows are valid immediately and a token minted
-- before this column existed (which carries no version) can be treated as
-- version 0 rather than as a forgery.
ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;
