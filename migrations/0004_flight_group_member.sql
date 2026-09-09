-- Milestone 2: Group membership tracking
--
-- Stores member joins to flight groups, enabling:
-- - Membership queries for authorization
-- - Idempotency checks (prevent duplicate joins)
-- - Group member roster (organizer vs joiner role tracking)
-- - Join history (who joined when)
--
-- Apply with: psql "$DATABASE_URL" -f migrations/0004_flight_group_member.sql

CREATE TABLE IF NOT EXISTS flight_group_member (
  id SERIAL PRIMARY KEY,
  flight_group_id VARCHAR(64) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role VARCHAR(32) NOT NULL CHECK (role IN ('group_organizer', 'joiner')),
  join_method VARCHAR(32) NOT NULL CHECK (join_method IN ('group_organizer', 'shared_link', 'manual')),
  member_status VARCHAR(32) NOT NULL DEFAULT 'joined' CHECK (member_status IN ('joined', 'left', 'cancelled')),
  joined_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  left_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Idempotency: each user can only be in a group once
  UNIQUE(flight_group_id, user_id)
);

-- Fast lookups for:
-- - "Is user X in group Y?" (authorization)
-- - "Who are all members of group Y?" (roster)
-- - "What groups is user X in?" (user's groups)
CREATE INDEX IF NOT EXISTS flight_group_member_group_user_idx
  ON flight_group_member(flight_group_id, user_id)
  WHERE member_status = 'joined';

CREATE INDEX IF NOT EXISTS flight_group_member_user_idx
  ON flight_group_member(user_id)
  WHERE member_status = 'joined';

CREATE INDEX IF NOT EXISTS flight_group_member_group_idx
  ON flight_group_member(flight_group_id)
  WHERE member_status = 'joined';
