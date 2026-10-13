import 'server-only'

/**
 * Test groups whose public pages are withheld.
 *
 * ── Why this exists ─────────────────────────────────────────────────────────
 *
 * Groups created for testing are reachable on the live site to anyone with the
 * link, signed out, with a working interest form on them asking for name,
 * email, phone and pet details. Charles found fourteen in the browser on 12
 * October; our own mirror held three more with live Zoho records that were not
 * on his list. Chuck asked for them taken off their public links.
 *
 * **Nothing is deleted and nothing in Zoho is touched.** Charles, 13 October:
 * "The evidence I want kept is the row in the database and in Zoho rather than
 * the public page." The rows stay — they are the only evidence the join and
 * approval events have run end to end — and this changes only what the public
 * read returns.
 *
 * ── Why a list in our code, and why it is a stopgap ─────────────────────────
 *
 * The public page resolves through Zoho's public-view function, which the
 * preview and the live site both point at, so the pages are not reachable
 * because of anything in our database. The fix that stops this recurring is a
 * second Zoho environment or a filter inside that function, which is Chuck,
 * Pavan and Vivek's side. This is the half we own and it is immediate.
 *
 * It is a floor rather than the set, and Chuck has accepted it on that basis:
 * we cannot enumerate Zoho from here, so a test group neither party knows about
 * stays reachable until the Zoho-side filter exists. `DELINKED_GROUP_IDS` is
 * read from the environment for exactly that reason — one more found next week
 * is a variable rather than a deploy.
 *
 * ── What it does and does not close ─────────────────────────────────────────
 *
 * Checked on the two public read paths, which between them are every way the
 * public view is served: `resolvePublicFlight` (the share page, its tab title,
 * and the JSON relay behind it) and the interest-lead endpoint. A de-linked
 * group answers as an unknown one does.
 *
 * The signed-in surfaces are **not** affected and deliberately so. The
 * organiser's group page, the request list on it, and the request detail screen
 * all read our own database and never touch the public view, so they stay open
 * at `/group/<group id>`. What does go is the share link as a route *in*: the
 * share page answers unavailable before it reaches the branches that bounce a
 * member or a waiting requester to their group page. They reach it at its own
 * address instead.
 *
 * One consequence worth knowing before removing an id from this list is the
 * reverse: frame 46, "Your request was not approved", lives on the share route,
 * so a declined requester on a de-linked group gets the unavailable page rather
 * than that screen. Raised with Charles on 13 October; the row is untouched
 * either way.
 */

import { groupIdFromSlug } from '../format'

/**
 * The seventeen agreed with Charles on 13 October — his fourteen from the
 * browser check of 12 October, plus three from our mirror that were not on it.
 *
 * `202610-HSH-TEB-PJAJCT` is deliberately **absent**: it carries a local
 * test-double record id, never reached Zoho, and is not publicly reachable.
 * Charles, 13 October: "HSH-TEB-PJAJCT is outside it and needs nothing."
 */
const DELINKED: readonly string[] = [
  // Charles's fourteen. Two of these have guessable suffixes rather than
  // random ones — `202606-SFO-JFK-01` and `202611-SFO-LAX-ZZTEST` — so the
  // obscure-link protection on them was close to nothing. The first is the
  // replayed contract sample and it carries pet details.
  '202606-SFO-JFK-01',
  '202609-TEB-SCF-N02OHU',
  '202609-EGKN-VNY-XDXBQL',
  '202609-17AR-MHEI-TPTJV5',
  '202609-OPF-MBU-G930CJ',
  '202609-FXE-LIR-MPTUF1',
  '202609-TX05-APA-DCVQP6',
  '202609-ALS-PAAM-ZA234Z',
  '202610-HWO-SYQ-NX52WR',
  '202610-HWO-SYQ-O2BVUM',
  '202610-APA-PWK-DLJ00R',
  // Holds request 20 (declined) and jr_22 (still pending) from the 11 October
  // run. Charles asked for it included: the evidence is the row, and the
  // pending request stays openable on the group page.
  '202610-OPF-KAO-AWY84M',
  '202611-HWO-SYQ-PICBYB',
  '202611-SFO-LAX-ZZTEST',

  // Ours, from the staging mirror — live Zoho records, not on his fourteen.
  '202610-RSH-TEB-IAMBFH',
  '202610-PDK-NHD-VCGO9N',
  // Pavan's cleanup removed this once already, so it may resolve to nothing.
  // Listed anyway: an id that is gone costs a set lookup.
  '202609-17AR-WSAC-FOI0AP',
]

/**
 * Anything found after this shipped, without a deploy.
 *
 * Comma or whitespace separated, in either the group-id or the share-slug form
 * — both are normalised below, so whichever form is to hand is accepted.
 */
function fromEnv(): string[] {
  const raw = process.env.DELINKED_GROUP_IDS
  if (!raw) return []
  return raw
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

/**
 * The set, normalised to the group-id form and upper-cased.
 *
 * Built once per process. `groupIdFromSlug` is pure and does no I/O, so a
 * slug-form entry ("OPF-KAO-202610-AWY84M") and a group-id-form one
 * ("202610-OPF-KAO-AWY84M") collapse to the same key — which matters because
 * the share route is given the slug and the lead endpoint is given the id.
 */
const delinked: ReadonlySet<string> = new Set(
  [...DELINKED, ...fromEnv()].map((value) => groupIdFromSlug(value.trim()).toUpperCase()),
)

/**
 * Whether this token or group id has been taken off its public link.
 *
 * Accepts either form. Callers on the public read paths treat `true` exactly as
 * they treat a group Zoho does not know about — the caller decides what that
 * means, so the "unavailable" page and its 404 status stay in one place rather
 * than being re-implemented here.
 */
export function isDelinked(tokenOrGroupId: string): boolean {
  if (!tokenOrGroupId) return false
  return delinked.has(groupIdFromSlug(tokenOrGroupId.trim()).toUpperCase())
}

/** How many are withheld. For the startup log line only. */
export function delinkedCount(): number {
  return delinked.size
}
