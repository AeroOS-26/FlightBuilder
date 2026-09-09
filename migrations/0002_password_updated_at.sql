-- 0002 · Record when a password was last changed.

-- Added 2026-08-26. Frame 38B states when the password was last changed; that
-- was a fixed string from the design until now, with nothing recording the real
-- event. ALTER rather than a column in CREATE TABLE above, because the table
-- already exists on deployed databases and CREATE TABLE IF NOT EXISTS will not
-- add a column to one.
ALTER TABLE users ADD COLUMN IF NOT EXISTS password_updated_at TIMESTAMPTZ;
