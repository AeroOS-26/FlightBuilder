-- Capacity is counted in people, but the roster was counted in accounts.
--
-- flight_group_member holds one row per user account. The travellers an
-- organiser types into the Flight Builder, and the ones a joiner adds on the
-- review screen, have no account of their own — user_id is NOT NULL against
-- users, so they cannot be represented at all. They are sent to Zoho inside
-- flight_group.created and then vanish from our side.
--
-- The result was two rosters counting different units. Zoho counts travellers;
-- this table counted accounts. On a six-space flight booked for a party of
-- three, Zoho saw three spaces left and we saw five, so the join endpoint would
-- admit five people into three spaces. That is the overbooking the client ruled
-- out on 2026-09-10, arriving by a different door than the manual adds Chuck
-- confirmed do not happen.
--
-- Rather than invent placeholder user rows for people who have no account, each
-- membership records how many seats that member occupies: their own plus the
-- companions travelling with them. Occupancy is then SUM(seats_committed) over
-- joined members, which is a count of people and directly comparable with
-- flight_group.spaces_total.
--
-- Default 1 is the honest value for a lone traveller and keeps the column
-- NOT NULL without a lie. Existing rows take it. They cannot be backfilled
-- accurately, because the companion counts were never stored anywhere on this
-- side -- the only record of them is in Zoho. Pre-launch this affects test data
-- only; if it ever matters, the party size is recoverable from the Zoho record.

ALTER TABLE flight_group_member
  ADD COLUMN IF NOT EXISTS seats_committed INTEGER NOT NULL DEFAULT 1;

-- A membership always occupies at least the member's own seat. Guarding the
-- lower bound only: the upper bound is the group's spaces_total, which is not
-- visible from this row and is enforced in the application at join time.
ALTER TABLE flight_group_member
  DROP CONSTRAINT IF EXISTS flight_group_member_seats_committed_check;

ALTER TABLE flight_group_member
  ADD CONSTRAINT flight_group_member_seats_committed_check
  CHECK (seats_committed >= 1);
