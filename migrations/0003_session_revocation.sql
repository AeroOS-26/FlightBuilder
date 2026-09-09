-- 0003 · Session revocation, and a phone-column guard.

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

-- `phone` is in 0001's CREATE TABLE, but a database provisioned before that
-- column was added would not have it — CREATE TABLE IF NOT EXISTS does not add
-- columns to an existing table. This is the backfill for those.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(64);
