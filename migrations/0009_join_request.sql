-- 0009 · Joining becomes a request the Group Organizer approves.
--
-- Until now a join seated the member immediately: the place was taken and both
-- member.joined and flight_group.filled fired in the same request. Under the
-- approval milestone a request takes nothing. The organiser approves or
-- declines it, Perro Air runs its own check, and only the approval seats anyone
-- — which is where those two events move to (Charles, 2026-09-22: "only the
-- moment it fires moves").
--
-- A request is therefore NOT a membership. flight_group_member stays what it
-- is: people who hold a place. This table is what happens before that.
--
-- Apply with: npm run migrate

CREATE TABLE IF NOT EXISTS join_request (
  id SERIAL PRIMARY KEY,
  flight_group_id VARCHAR(64) NOT NULL,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Counted in people, not accounts — the same unit as
  -- flight_group_member.seats_committed and for the same reason (migration
  -- 0007). A party of three needs three places. Pets do not take a place.
  places_requested INTEGER NOT NULL DEFAULT 1 CHECK (places_requested >= 1),

  -- The travellers and pets as the request was sent, not as the profile holds
  -- them now. Frame 42 seeds both from the profile and lets them be changed for
  -- this flight only, so the profile is not the record of what was asked for —
  -- the same principle migration 0008 applies to a seated member's pets.
  travelers JSONB NOT NULL DEFAULT '[]'::jsonb,
  pets JSONB NOT NULL DEFAULT '[]'::jsonb,

  -- The organiser's decision.
  --
  -- 'lapsed' is not a decision anyone makes: a request still pending when the
  -- group fills lapses on its own, with no action from the organiser, and the
  -- requester is told (client's written spec, 2026-09-22 — in the spec before it
  -- was in the designs, and frame 49 now shows it).
  status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'approved', 'declined', 'lapsed')),
  requested_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  decided_at TIMESTAMPTZ,
  decided_by INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- Perro Air's own check, which is deliberately NOT the organiser's decision.
  --
  -- The requester sees "Under review" until BOTH are done (frames 43, 44), so
  -- the two have to be tracked apart. The check itself stays manual and is not a
  -- product screen: Chuck works from a queue inside Zoho and the result comes
  -- back to us (client, 2026-09-23). A failed check removes the participant and
  -- reopens the place.
  check_status VARCHAR(16) NOT NULL DEFAULT 'pending'
    CHECK (check_status IN ('pending', 'cleared', 'failed')),
  check_decided_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- One request in flight per person per group.
--
-- Partial rather than a plain UNIQUE(flight_group_id, user_id): whether someone
-- who was declined may ask again is still open with the client, and a full
-- constraint would answer it by accident. This stops a double submission
-- without deciding anything — if re-asking is allowed, a second row is legal
-- once the first is no longer pending.
CREATE UNIQUE INDEX IF NOT EXISTS join_request_one_pending_per_member
  ON join_request (flight_group_id, user_id)
  WHERE status = 'pending';

-- The organiser's list: "what is waiting on me for this group", oldest first,
-- which is the order frame 47 shows them in.
CREATE INDEX IF NOT EXISTS join_request_group_pending
  ON join_request (flight_group_id, requested_at)
  WHERE status = 'pending';

-- "Where does my request stand" — the requester's own view (frames 43, 44, 45,
-- 46), and the check that decides which screen they are shown.
CREATE INDEX IF NOT EXISTS join_request_by_member
  ON join_request (user_id, flight_group_id);

-- Deliberately NOT added: an expiry column.
--
-- Whether a request expires on its own when the organiser does not act is one
-- of the three questions still genuinely undecided (Charles, 2026-09-24), and
-- it is the only one carrying hours — "yes, after N days" means a scheduled job
-- that is not in the milestone's 62. Lapsing when the group fills is settled and
-- needs no column: it is derived from the group being full.
