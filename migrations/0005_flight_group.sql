-- Milestone 2: mirror the flight group into our own database.
--
-- Zoho stays the source of truth and keeps receiving flight_group.created, but
-- member-facing reads come from here instead of Zoho's request path. Zoho gives
-- us no retry and no alerting, which is survivable for an event that writes a
-- lead and not survivable for a page a member is looking at.
--
-- There is no inbound webhook, and creation does not need one: the app already
-- holds the whole payload at confirm, so it writes this row in the same step it
-- notifies Zoho. Only state transitions (flight_group.filled, still with Seshu)
-- need an inbound path later.
--
-- Columns mirror the flight_group.created contract so the mapping stays a
-- rename rather than a reshape. See src/types/api.ts FlightGroupCreatedEvent.
--
-- Apply with: npm run migrate

CREATE TABLE IF NOT EXISTS flight_group (
  -- The human-facing group id (YYYYMM-FROM-TO-TOKEN), generated client-side
  -- from route + date. Already how flight_group_member references a group, so
  -- it is the natural key rather than a surrogate.
  flight_group_id VARCHAR(64) PRIMARY KEY,

  -- Authoritative once flight_group.filled starts writing it. Until that event
  -- exists the read derives state from the roster against spaces_total, so a
  -- row sitting at 'forming' is expected and not a bug.
  status VARCHAR(32) NOT NULL DEFAULT 'forming'
    CHECK (status IN ('forming','filling','filled','quoting','confirmed','booked','closed')),

  share_link TEXT NOT NULL,

  -- An estimate at creation: no aircraft exists yet. spaces_remaining is
  -- deliberately NOT stored — it is spaces_total minus joined members, and
  -- storing it would let the two disagree.
  spaces_total INTEGER NOT NULL CHECK (spaces_total > 0),

  aircraft_category VARCHAR(64) NOT NULL,

  -- Route. The airport code is null unless the member locked a specific
  -- airport; a city-derived code is a routing placeholder that can change when
  -- the carrier is booked, so it is not invented here and not shown downstream.
  origin_input TEXT NOT NULL,
  origin_type VARCHAR(16) NOT NULL CHECK (origin_type IN ('city','airport')),
  origin_city TEXT NOT NULL,
  origin_airport_code VARCHAR(8),
  destination_input TEXT NOT NULL,
  destination_type VARCHAR(16) NOT NULL CHECK (destination_type IN ('city','airport')),
  destination_city TEXT NOT NULL,
  destination_airport_code VARCHAR(8),

  -- Dates are either one specific day or a window; exactly one shape is
  -- populated, which the CHECK below enforces.
  date_mode VARCHAR(16) NOT NULL CHECK (date_mode IN ('specific','range')),
  travel_date DATE,
  earliest_date DATE,
  latest_date DATE,

  pet_friendly BOOLEAN NOT NULL DEFAULT false,
  operator_notes TEXT NOT NULL DEFAULT '',

  -- The organiser also gets a flight_group_member row with role
  -- 'group_organizer', so authorisation and role both resolve through one
  -- membership lookup. This column is the convenience pointer for reads that
  -- only need "whose group is this".
  organizer_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Zoho's own record id, returned by the relay. Kept for reconciliation; the
  -- app never depends on it to render.
  zoho_record_id VARCHAR(128),

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT flight_group_dates_match_mode CHECK (
    (date_mode = 'specific' AND travel_date IS NOT NULL)
    OR (date_mode = 'range' AND earliest_date IS NOT NULL)
  )
);

-- "Which groups did this member create?" for the dashboard.
CREATE INDEX IF NOT EXISTS flight_group_organizer_idx
  ON flight_group(organizer_user_id);

-- Referential integrity between the roster and the group. Safe to add now:
-- flight_group_member is empty, and the create-time write inserts the group
-- before the organiser's membership row.
ALTER TABLE flight_group_member
  DROP CONSTRAINT IF EXISTS flight_group_member_group_fk;

ALTER TABLE flight_group_member
  ADD CONSTRAINT flight_group_member_group_fk
  FOREIGN KEY (flight_group_id) REFERENCES flight_group(flight_group_id) ON DELETE CASCADE;
