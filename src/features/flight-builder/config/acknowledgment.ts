/**
 * The Group Organizer acknowledgment — the client's own wording.
 *
 * Sent by Charles on 8 October 2026 as final, and checked character for
 * character against all six frames (`4495:99695`, `4495:99750`, `4495:99805`
 * and the three mobile variants): every line matches, punctuation included.
 *
 * **Version 2, 13 October 2026.** Counsel's final items arrived the evening of
 * the 8th, after the wording above was sent, and one replaces statement 1
 * outright. Charles, 13 October: "Statements 2 to 6 are unchanged." The
 * screens carrying the new line go to counsel the same day, so the build is
 * moved to match the design rather than the other way round.
 *
 * Note that the client's character-for-character check of 11 October was made
 * against **version 1**. Statement 1 is the one line that check no longer
 * covers.
 *
 * **Do not edit these strings.** That includes the comma splices in statements
 * 2 and 5, which read like typos and are not — they are the client's text and
 * this screen is the evidence that a person accepted exactly it. Charles,
 * 8 October: "This is the client's own wording and it is not to be edited,
 * including the punctuation."
 *
 * A revision means a new `ACKNOWLEDGMENT_TEXT_VERSION`, never an edit in place:
 * `organizer_acknowledgment.text_version` records which wording was accepted,
 * and silently changing the words under a stored version would make every
 * earlier row evidence of something nobody saw.
 */

/**
 * Bumped, never edited around. Stored on every acceptance.
 *
 * 1 → 2 on 2026-10-13, for the statement 1 replacement below. Acceptances
 * already recorded keep `text_version = 1` and stay tied to the wording their
 * organiser actually saw; nothing rewrites them, which is the whole point of
 * storing the version rather than assuming the current text.
 */
export const ACKNOWLEDGMENT_TEXT_VERSION = 2

export const ACKNOWLEDGMENT_HEADING =
  'By creating this Charter Group, I acknowledge and agree:'

export const ACKNOWLEDGMENT_STATEMENTS: readonly string[] = [
  // Replaced outright by counsel, via Charles 2026-10-13. The version 1 text
  // was: "I am the Group Organizer for this Charter Group because I created
  // it. Perro Air does not assign, appoint, or hold the Organizer role for any
  // Charter Group, that role belongs to whoever creates the group." Kept here
  // because rows stored at version 1 are evidence of that sentence, and a
  // reader of this file has to be able to see what they accepted.
  'I requested formation of this Charter Group and agree to act as its Group Organizer.',
  'As Group Organizer, I circulate the share link, approve or decline Join Requests, and coordinate the group. I am not selling seats, being paid to recruit Participants, and I am not an operator or air carrier.',
  'Perro Air arranges the charter with a direct air carrier once this Charter Group is formed and fully funded. Perro Air does not organize this Charter Group and does not act as its Organizer.',
  'If Perro Air assists me with tasks such as data entry, that assistance is at my direction and does not make Perro Air the Organizer.',
  'If I also plan to travel as a Participant in this Charter Group, I understand I will separately accept the Participant passenger terms, this acknowledgment covers my role as Organizer only.',
  'I am at least 18 years old and have the legal capacity to make this acknowledgment.',
]

export const ACKNOWLEDGMENT_CHECKBOX = 'I have read and accept the statements above.'
export const ACKNOWLEDGMENT_SUBMIT = 'Agree and Create Flight Group'
export const ACKNOWLEDGMENT_CANCEL = 'Cancel, do not create this group'
export const ACKNOWLEDGMENT_RECORD_NOTE =
  'A record of this acceptance is kept with your Charter Group.'
export const ACKNOWLEDGMENT_ERROR = 'Please accept the statements above before continuing.'
