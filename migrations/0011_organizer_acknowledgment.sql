-- 0011 · The Group Organizer's acknowledgment.
--
-- The record that a real person took the Organizer role, and did so
-- deliberately. That is the whole point of the screen it comes from: Perro Air
-- does not assign the role, so there has to be evidence that whoever holds it
-- accepted it. Five fields, settled with the client over three exchanges and
-- written down in docs/CLIENT-DECISIONS.md §18.
--
-- Written inside createFlightGroup's transaction. Not because the group id does
-- not exist yet — `generateIdentifiers` builds it in the browser, so it does —
-- but because of the rule underneath: a Charter Group must never exist without
-- its acceptance, and the foreign key below enforces the order.

CREATE TABLE IF NOT EXISTS organizer_acknowledgment (
  id SERIAL PRIMARY KEY,

  -- Unlike flight_group_member and join_request, this carries a real foreign
  -- key. Those two predate flight_group (migration 0004 came before 0005) and
  -- keep the id as a plain column; there is no such excuse here, and §18 asks
  -- for the key. RESTRICT rather than CASCADE: counsel's retention ruling of
  -- 8 October keeps acknowledgment evidence for seven years where the group
  -- became a booking, so a delete that would silently take it with the group
  -- should fail instead. Nothing deletes a group today.
  flight_group_id VARCHAR(64) NOT NULL
    REFERENCES flight_group(flight_group_id) ON DELETE RESTRICT,

  -- Nullable and SET NULL, deliberately. Closing an account removes the login
  -- and the ordinary profile; it must not remove the evidence that the group
  -- was formed by a person. The key is for normal use.
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,

  -- The `acct_` identifier as a literal string, snapshotted at acceptance.
  -- NOT NULL, because this is the durable half: it is what survives the account
  -- the acceptance was made under, once user_id above has gone to null.
  account_id TEXT NOT NULL,

  accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Which wording was accepted. Starts at 1 and lives in code beside the
  -- statements (ACKNOWLEDGMENT_TEXT_VERSION), so a later revision of the six
  -- can be told apart from this one without reading dates.
  text_version INTEGER NOT NULL,

  -- One acceptance per Charter Group, enforced here rather than trusted to the
  -- route. The create transaction can run twice — the group insert is
  -- ON CONFLICT DO NOTHING — and a second acknowledgment row would read as a
  -- second acceptance.
  UNIQUE (flight_group_id)
);

COMMENT ON TABLE organizer_acknowledgment IS
  'Evidence that the Group Organizer accepted the role. Kept with the booking file.';
COMMENT ON COLUMN organizer_acknowledgment.account_id IS
  'The acct_ identifier, snapshotted. Survives deletion of the users row.';
