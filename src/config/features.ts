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
