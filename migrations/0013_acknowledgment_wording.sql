-- 0013 · The wording that was accepted, kept on the acceptance.
--
-- 0011 records which wording was accepted as an integer and leaves the words
-- in code. Version 1's words now survive only as a *comment* there, which is
-- precisely what counsel asked us not to depend on: "an exact copy of each
-- earlier version preserved from the application or source history, linked to
-- the corresponding acceptance records… not relied on solely from application
-- code that may later change." (Via Murtaza, 2026-10-22; CLIENT-DECISIONS §37.)
--
-- Chuck, 10-21: the application records the acknowledgment with the exact
-- wording accepted. This column is that record. The other half — the event that
-- carries it to Zoho, so staff can see it before ticking Published — waits on
-- which event carries it; that is open with Vivek and does not block this.
--
-- The text is assembled server-side from `text_version` by
-- src/features/group/server/acknowledgmentWording.ts and never read off the
-- request. A client chooses a version; it does not choose the words.
--
-- **Nullable, and not backfilled.** Two acceptances exist, both at version 1,
-- both our own test organiser (§37), and counsel ruled on 10-23 that test
-- records need not be reaccepted. Writing text into them now would also be the
-- first UPDATE this table has ever taken — nothing rewrites an acceptance, by
-- design — and a reconstruction written into a row is indistinguishable from
-- something captured at the time. Their wording stays linked by version,
-- through the archive in that module, which is the link counsel asked for.
--
-- NOT NULL is therefore wrong today and would also be wrong later: it would
-- make an unresolvable version fail the whole create transaction, costing a
-- real group to record an evidential detail more neatly.

ALTER TABLE organizer_acknowledgment
  ADD COLUMN IF NOT EXISTS wording TEXT;

COMMENT ON COLUMN organizer_acknowledgment.wording IS
  'The exact text accepted, assembled server-side from text_version: the '
  'heading, the six numbered statements, then the checkbox line, newline '
  'separated (version 2 is 1,011 characters). NULL means the row predates this '
  'column or carried a version this build could not resolve — read text_version '
  'against the archive in acknowledgmentWording.ts.';
