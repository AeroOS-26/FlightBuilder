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
