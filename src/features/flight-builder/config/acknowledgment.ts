/**
 * The Group Organizer acknowledgment — the client's own wording.
 *
 * Sent by Charles on 8 October 2026 as final, and checked character for
 * character against all six frames (`4495:99695`, `4495:99750`, `4495:99805`
 * and the three mobile variants): every line matches, punctuation included.
 *
 * **Do not edit these strings.** That includes the comma splices in statements
 * 1, 2 and 5, which read like typos and are not — they are the client's text
 * and this screen is the evidence that a person accepted exactly it. Charles,
 * 8 October: "This is the client's own wording and it is not to be edited,
 * including the punctuation."
 *
 * A revision means a new `ACKNOWLEDGMENT_TEXT_VERSION`, never an edit in place:
 * `organizer_acknowledgment.text_version` records which wording was accepted,
 * and silently changing the words under a stored version would make every
 * earlier row evidence of something nobody saw.
 */

/** Bumped, never edited around. Stored on every acceptance. */
export const ACKNOWLEDGMENT_TEXT_VERSION = 1

export const ACKNOWLEDGMENT_HEADING =
  'By creating this Charter Group, I acknowledge and agree:'

export const ACKNOWLEDGMENT_STATEMENTS: readonly string[] = [
  'I am the Group Organizer for this Charter Group because I created it. Perro Air does not assign, appoint, or hold the Organizer role for any Charter Group, that role belongs to whoever creates the group.',
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
