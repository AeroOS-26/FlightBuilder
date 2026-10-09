-- 0010 · The address a join request should be answered on.
--
-- Frame 42 shows the requester their email and lets them change it. Until now
-- that edit went nowhere: `join_request.created` took the address from
-- `users.email`, so someone could correct it on the screen, pass validation,
-- send the request, and still have the decision go to the old one.
--
-- Stored on the request rather than written back to the account, for the same
-- reason travellers and pets are: everything else on that screen is per flight.
-- Changing the address for one request must not silently change the address
-- they sign in with.
--
-- NULL means "no change" — the account's address is used. That keeps every
-- request made before this column existed correct rather than backfilled with
-- a guess.
--
-- Apply with: npm run migrate

ALTER TABLE join_request
  ADD COLUMN IF NOT EXISTS contact_email TEXT;

COMMENT ON COLUMN join_request.contact_email IS
  'Per-request contact address from frame 42. NULL means use users.email.';
