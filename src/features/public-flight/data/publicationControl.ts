import 'server-only'

/**
 * Which groups may be served to the public. **Closed by default.**
 *
 * ── Why this replaced the de-link list ──────────────────────────────────────
 *
 * On 13 October we blocked seventeen known test groups. Counsel's reply was
 * that it is not sufficient, in his words: "removing links or blocking only
 * known test groups does not address a test page still accessible through a
 * direct URL." A denylist can only ever cover what we already know about, and
 * neither our list nor the client's was the full set — only Zoho holds that.
 *
 * So the test inverts. A group is served only if it has been affirmatively
 * cleared, and anything unlisted, unknown or newly created is closed. That is
 * counsel's requirement rather than ours: "temporarily restricting the
 * FlightBuilder group pages and associated submissions to authorized staff
 * unless a particular page has been affirmatively cleared for public use."
 *
 * ── Why it is a list here rather than a column ──────────────────────────────
 *
 * The flag belongs on the group record, and that is the eventual shape. It
 * cannot be yet: production runs the build of 1 September, which has no data
 * layer in it at all — no database driver, no migrations, nothing that can read
 * a column. A list in code needs none of that, so it is the only version that
 * protects production before the release.
 *
 * Charles, 14 October, having been told that: "Do not build the flag on the
 * group record yet… Does it invert? Closed by default, with a list of cleared
 * group ids, empty today."
 *
 * ── Why the list is empty ───────────────────────────────────────────────────
 *
 * His reasoning, and it is worth keeping: "Nothing needs to be public right
 * now. Joining is off, and every group on any list either of us holds is one of
 * ours. So the state today is everything closed and nothing cleared. If Zoho
 * holds one that is genuinely a customer's, that is what the list is for."
 *
 * ── What it deliberately does not do ────────────────────────────────────────
 *
 * It does not authorise anything. Counsel's conditions — that only designated
 * staff clear a group, after checking it is genuinely traveller-created with
 * the Organizer acknowledgment in place, and that we record who cleared it —
 * need a durable record and an identity, which is the group-record flag rather
 * than this. While the list is empty nobody is authorising anything, so those
 * conditions are not yet live and are not pretended to be here.
 *
 * Nothing is deleted. Counsel asked for records and logs to be preserved while
 * the restriction is in place, and this changes only what the public read
 * returns.
 */

import { groupIdFromSlug } from '../format'

/**
 * Groups affirmatively cleared for public use.
 *
 * **Empty, and that is the intended state.** Adding an id here publishes that
 * group to anyone with its link, so an entry is a decision rather than a
 * configuration tidy-up. Do not add one to make a test pass — use
 * `PUBLIC_GROUP_IDS` locally instead.
 */
const CLEARED: readonly string[] = [
  // Intentionally empty. See the note above.
]

/**
 * The addresses Chuck named for authorising publication, 2026-10-15.
 *
 * **Recorded, not live.** Charles: "Put them in as the editable value, not
 * live." Nothing reads this yet, and nothing should until the group-record
 * flag exists — while `CLEARED` is empty nobody authorises anything, so there
 * is no authorisation step for them to be checked against.
 *
 * Two caveats he gave with them, both of which may move this list:
 *
 *  - `chuck@mtnprime.com` is rarely used and may have no account on the
 *    application at all, which is a step rather than a list entry.
 *  - `info@perroair.com` is the address he writes to us from, so a log naming
 *    it could not say whether it was Chuck or Sarah — which is the very thing
 *    counsel's "record who authorized it" requires. Charles is going back to
 *    him and expects this one to change.
 */
export const AUTHORISING_STAFF: readonly string[] = [
  'chuck@mtnprime.com',
  'info@perroair.com',
]

/**
 * Additions from the environment, for a group cleared after this shipped.
 *
 * Comma or whitespace separated, in either the group-id or the share-slug form.
 * It exists so clearing a genuine customer's group is a variable rather than a
 * release — the same reason the de-link list had one, and the reason this can
 * respond faster than a deploy if a real group is found.
 */
function fromEnv(): string[] {
  const raw = process.env.PUBLIC_GROUP_IDS
  if (!raw) return []
  return raw
    .split(/[,\s]+/)
    .map((value) => value.trim())
    .filter(Boolean)
}

/**
 * The cleared set, normalised to the group-id form and upper-cased.
 *
 * Built once per process. `groupIdFromSlug` is pure and does no I/O, so a
 * slug-form entry ("OPF-KAO-202610-AWY84M") and a group-id-form one
 * ("202610-OPF-KAO-AWY84M") collapse to the same key — which matters because
 * the share route is given the slug and the lead endpoint is given the id.
 */
const cleared: ReadonlySet<string> = new Set(
  [...CLEARED, ...fromEnv()].map((value) => groupIdFromSlug(value.trim()).toUpperCase()),
)

/**
 * Whether this token or group id may be served to the public.
 *
 * **Fails closed.** Counsel: "A missing setting or a failed lookup must not
 * expose the page." An empty, malformed or unrecognised identifier is not
 * cleared, so it is refused rather than guessed at — there is deliberately no
 * branch here that can answer true by accident.
 *
 * Accepts either form. Callers treat a false exactly as they treat a group Zoho
 * does not know about, so the "unavailable" page and its 404 stay in one place
 * rather than being re-implemented per caller.
 */
export function isClearedForPublic(tokenOrGroupId: string | null | undefined): boolean {
  if (!tokenOrGroupId) return false
  const key = groupIdFromSlug(String(tokenOrGroupId).trim()).toUpperCase()
  if (!key) return false
  return cleared.has(key)
}

/** How many groups are cleared. For the startup log line only. */
export function clearedCount(): number {
  return cleared.size
}
