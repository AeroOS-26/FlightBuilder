/**
 * Switches for UI that is built but has nothing behind it yet.
 *
 * The Flight Club member area — Dashboard, Flight Group Detail, the account
 * menu, How it works, Empty Legs — is drawn in Figma and coded here, but the
 * screens it would navigate to are a later phase. Charles asked for these to be
 * hidden rather than wired, the same call we made on Google and Apple sign-in:
 * a control that looks active and does nothing costs more trust than a control
 * that is not there.
 *
 * Hidden behind a flag rather than deleted, so turning the member area on is
 * one line here rather than rebuilding markup from the Figma a second time.
 * Flip to `true` when those screens exist.
 */
export const MEMBER_AREA_ENABLED: boolean = false

/**
 * Whether the privacy notice links are shown.
 *
 * Charles, 2026-09-22: a notice link beside the interest form's button and
 * "Privacy & Cookies" in the footer, **built now but kept hidden** — the notice
 * itself is not written yet, and a link to a page that does not say anything is
 * worse than no link. They switch on the day the notice lands, which is one
 * change here rather than a build.
 *
 * Both point at `/privacy`, which already exists and carries the placeholder the
 * client approved.
 */
export const PRIVACY_NOTICE_ENABLED: boolean = false

/**
 * Whether the join-approval flow is shown.
 *
 * The approval milestone turns joining into a request the Group Organizer
 * approves. The screens land before the server side does — there is no
 * `join_request` table yet, and `member.joined` / `flight_group.filled` still
 * fire on the join rather than on the approval — so everything built for it
 * stays behind this switch until the two halves meet.
 *
 * Off means the current join flow is exactly what it was. Nothing below this
 * flag may change behaviour for a member today.
 */
export const APPROVAL_FLOW_ENABLED: boolean = true

/**
 * Whether someone the organiser declined may ask to join again.
 *
 * Open with the client. The Figma gives frame 46 ("Request not approved") no
 * way forward, so as drawn a decline is final — but nothing below the UI makes
 * it final: `join_request`'s unique index only forbids a *second pending*
 * request (migration 0009), so the submit endpoint would accept a fresh one
 * today. The decision is therefore a UI one, kept as one line here rather than
 * baked into the screen, so answering it either way costs no rebuild.
 *
 * Off matches the design: frame 46 is terminal. On, a declined member falls
 * through to the join flow again and frame 46 is never reached.
 */
export const DECLINED_MAY_REQUEST_AGAIN: boolean = false
