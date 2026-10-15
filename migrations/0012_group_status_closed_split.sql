-- Split `closed` into the two terminal states the CRM sends.
--
-- The inbound status event (`flight_group.status_changed`, spec of 6 October,
-- extract of 14 October) carries one of eight statuses, and two of them are
-- `closed_completed` and `closed_unfilled`. This column accepted seven, with a
-- single `closed` — so either of those two values was rejected by the CHECK
-- before anything could store it, and a message that was correct by the spec
-- would have come back from us as a 500 with no obvious cause.
--
-- Vivek is building the Zoho side to those two values, so ours moves to meet
-- them rather than asking the CRM to collapse a distinction it holds.
--
-- `closed` is KEPT, and only for rows that already carry it. Nothing new should
-- write it. It is not migrated onto one of the new values because we cannot
-- tell from the row which of the two it meant — a group that closed full and a
-- group that closed empty are the same string today, and guessing would invent
-- a fact. If the CRM later tells us which, those rows can be corrected then.
--
-- The distinction already exists on the public side: `BannerTone` has carried
-- `completed` and `unfilled` as separate states, with their own colours and
-- labels, since the public screens were built. This brings the group's own
-- status into line with what the public page was already drawing.

ALTER TABLE flight_group
  DROP CONSTRAINT IF EXISTS flight_group_status_check;

ALTER TABLE flight_group
  ADD CONSTRAINT flight_group_status_check
  CHECK (status IN (
    'forming',
    'filling',
    'filled',
    'quoting',
    'confirmed',
    'booked',
    'closed_completed',
    'closed_unfilled',
    -- Legacy. Pre-dates the split; no new writes.
    'closed'
  ));

COMMENT ON COLUMN flight_group.status IS
  'Lifecycle state. The eight the CRM sends (flight_group.status_changed), plus '
  'legacy "closed" for rows written before the terminal split. Set from the CRM '
  'for quoting onward; forming/filling/filled are derived from occupancy.';
