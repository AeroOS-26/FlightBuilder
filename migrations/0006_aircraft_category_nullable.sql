-- aircraft_category is not known at creation.
--
-- 0005 declared it NOT NULL, which was wrong. The client settled this on
-- 2026-09-09: there is no aircraft until Quoting, so there is nothing to
-- capture when a group is created. `spaces_total` is an estimated group size
-- and explicitly not a confirmed aircraft capacity — the payload contract
-- already says as much. The app stops sending the hardcoded "Light Jet" and
-- sends nothing until a quote comes back.
--
-- With NOT NULL in place, every group created after that change would fail to
-- insert. This relaxes the column rather than editing 0005, which is already
-- applied and whose checksum the runner verifies.
--
-- Apply with: npm run migrate

ALTER TABLE flight_group
  ALTER COLUMN aircraft_category DROP NOT NULL;
