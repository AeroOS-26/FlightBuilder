/**
 * The three help lines on the Join Review screen's Stage 1 fields.
 *
 * Supplied by Murtaza on 2026-10-21, verbatim. Client copy: not to be edited,
 * shortened or reflowed here.
 *
 * ── Why only three fields carry one ─────────────────────────────────────────
 *
 * The frames draw a help icon on all six text fields — passport name, email,
 * nationality, date of birth, pet name-and-type and weight. Only these three
 * have words. Murtaza settled on 2026-10-22 that the icon renders where there
 * is something to show, so the other three lose the icon rather than gain
 * invented copy.
 *
 * That follows the rule already applied to the builder's navigation and
 * recorded in `config/features.ts`: "a control that looks active and does
 * nothing costs more trust than a control that is not there." An icon that
 * opens an empty tooltip is exactly that control.
 *
 * The confirmations deliberately carry none. They are full sentences already,
 * and they are counsel's eligibility wording — a tooltip sitting on a legal
 * line is a second, unapproved gloss on it.
 */

export const STAGE1_HELP = {
  passportName:
    'Type it exactly as it appears on the passport you will travel with, including any ' +
    'middle names. A name that does not match the passport can stop someone travelling.',
  nationality:
    'The country that issued the passport you will travel with. If you hold more than one, ' +
    'choose the one you will use for this trip.',
  dateOfBirth: "The traveller's own date of birth, as shown on the passport.",
} as const

/**
 * The three confirmations, as the frames word them.
 *
 * Counsel's eligibility wording via Chuck, so the sentences are not ours to
 * adjust. `isAdult` and `guardianBookingForMinor` are two separate checkboxes
 * rather than one choice, drawn that way and kept that way; one of the two
 * must be ticked before the request sends, which is a completeness check and
 * not a judgment about anyone's eligibility (Murtaza, 2026-10-21).
 *
 * "after my arrival date" and not after return: the product has never held a
 * return date and the Flight Builder is one way only (Chuck, 2026-10-14).
 */
export const STAGE1_CONFIRMATIONS = {
  isAdult: 'I confirm I am 18 or above.',
  guardianBookingForMinor: 'I am a parent or guardian booking for a minor.',
  passportValidSixMonths:
    'I confirm my passport is valid for at least six months after my arrival date, or ' +
    'longer if my destination requires it.',
} as const

/** The label frame 42 gives the name field, which is not the builder's label. */
export const PASSPORT_NAME_LABEL = 'Full legal name as shown on the passport'
