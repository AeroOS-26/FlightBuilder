-- Session revocation — run against every deployed database before the code
-- that reads this column is deployed.
--
-- Safe to re-run: IF NOT EXISTS on both statements, and existing rows get
-- version 0, which is what tokens issued before this change are treated as.
--
-- Environments: local dev, Neon preview branch, Neon production branch.

ALTER TABLE users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

-- Frame 31's optional phone field writes here. The column already exists in
-- schema.sql; this is the no-op guard for databases created before it.
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(64);

-- Verify:
--   SELECT column_name, data_type, column_default, is_nullable
--     FROM information_schema.columns
--    WHERE table_name = 'users' AND column_name IN ('session_version','phone');
