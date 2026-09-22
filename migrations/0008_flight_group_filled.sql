-- 0008 · What flight_group.filled needs that was never kept.
--
-- flight_group.filled (contract section 4) is the push that creates the Deal in
-- Zoho, and it carries every member of the group with the pets they are
-- bringing on this flight. Until now those pets were never stored on our side:
-- the organiser's went out inside flight_group.created and the joiner's inside
-- member.joined, and neither was written anywhere. By the time a group filled
-- there was nothing left to send. Charles, 2026-09-22: the event is part of
-- M2's task list ("handle flight_group.filled for the join that fills the
-- group") and is built before M2 is signed off.
--
-- Apply with: npm run migrate

-- The party's pets for this flight, exactly as they were sent to Zoho on the
-- event that seated this member — the contract's pet objects, already mapped,
-- readiness included. Stored as sent rather than re-derived from the profile:
-- contract section 7 makes the flight payload the source every time, and a
-- member may have edited their saved pets since. The party's pets sit with the
-- account that brought them, which is how both events already carry them.
--
-- Default '[]' is the truth for every existing row that has none recorded, and
-- the rows that predate this are test data only.
ALTER TABLE flight_group_member
  ADD COLUMN IF NOT EXISTS pets JSONB NOT NULL DEFAULT '[]'::jsonb;

-- When the join that filled the group committed. Written in the same
-- transaction as that join, so there is exactly one filling join per group:
-- the update only lands while this is still null. It is also the payload's
-- filled_at, so a resend carries the real moment rather than the resend's.
ALTER TABLE flight_group
  ADD COLUMN IF NOT EXISTS filled_at TIMESTAMPTZ;

-- When Zoho confirmed it accepted flight_group.filled. Null on a filled group
-- means the Deal was never created — Zoho gives no retry and no alerting, so
-- this is the only record that one was missed, and the query that finds them:
--   SELECT flight_group_id FROM flight_group
--    WHERE filled_at IS NOT NULL AND filled_event_sent_at IS NULL;
ALTER TABLE flight_group
  ADD COLUMN IF NOT EXISTS filled_event_sent_at TIMESTAMPTZ;
