import 'server-only'

/**
 * The acknowledgment wording, assembled for storage.
 *
 * Migration 0011 stores `text_version` and not the text. The text lives in
 * code, and version 1's survives only as a *comment* — which is the one thing
 * counsel asked us not to rely on: "an exact copy of each earlier version
 * preserved from the application or source history, linked to the corresponding
 * acceptance records… not relied on solely from application code that may later
 * change." (Via Murtaza, 2026-10-22. §37.)
 *
 * So the version number is resolved to the words here, and migration 0013
 * stores them on the row. Chuck, 10-21: the application records the
 * acknowledgment with the exact wording accepted.
 *
 * **Derived from the version, never taken from the request.** The browser sends
 * `textVersion` and nothing else; a tampered client can therefore pick among
 * the wordings this build has shipped, but it cannot invent the words stored
 * against its own acceptance. That is the whole reason this function exists
 * rather than a `wording` field on the posted envelope.
 *
 * The sending half — the event that carries this to Zoho — is not here. Which
 * event carries it is still open with Vivek and Murtaza is chasing it; storing
 * does not depend on the answer, so it ships first.
 */

import {
  ACKNOWLEDGMENT_CHECKBOX,
  ACKNOWLEDGMENT_HEADING,
  ACKNOWLEDGMENT_STATEMENTS,
  ACKNOWLEDGMENT_TEXT_VERSION,
} from '@/features/flight-builder/config/acknowledgment'

/** One wording, as the screen presents it: the three parts a person reads. */
interface AcknowledgmentWording {
  heading: string
  statements: readonly string[]
  checkbox: string
}

/**
 * Wordings this build no longer shows, kept verbatim.
 *
 * Copied from the source history — `git show 5a2d71d^` — and deliberately a
 * **copy** rather than a reference to the live constants. Version 1 differs
 * from version 2 in statement 1 alone, so composing it from the current array
 * would work today and silently lie the day a version 3 replaces a different
 * statement. An archive that moves when the current text moves is not an
 * archive.
 *
 * **When the wording is next revised:** bump `ACKNOWLEDGMENT_TEXT_VERSION`, and
 * copy the outgoing strings in here under their own number. The row already
 * written keeps its own copy in `wording`; this is what keeps the rows written
 * before 0013 readable.
 */
const ARCHIVE: Record<number, AcknowledgmentWording> = {
  // Version 1 — in force from the acknowledgment screen's first build until
  // 2026-10-13. Both acceptances on record are at this version, and both are
  // our own test organiser (§37); counsel ruled on 10-23 that test records need
  // not be reaccepted.
  1: {
    heading: 'By creating this Charter Group, I acknowledge and agree:',
    statements: [
      'I am the Group Organizer for this Charter Group because I created it. Perro Air does not assign, appoint, or hold the Organizer role for any Charter Group, that role belongs to whoever creates the group.',
      'As Group Organizer, I circulate the share link, approve or decline Join Requests, and coordinate the group. I am not selling seats, being paid to recruit Participants, and I am not an operator or air carrier.',
      'Perro Air arranges the charter with a direct air carrier once this Charter Group is formed and fully funded. Perro Air does not organize this Charter Group and does not act as its Organizer.',
      'If Perro Air assists me with tasks such as data entry, that assistance is at my direction and does not make Perro Air the Organizer.',
      'If I also plan to travel as a Participant in this Charter Group, I understand I will separately accept the Participant passenger terms, this acknowledgment covers my role as Organizer only.',
      'I am at least 18 years old and have the legal capacity to make this acknowledgment.',
    ],
    checkbox: 'I have read and accept the statements above.',
  },
}

/**
 * The exact text accepted at `textVersion`, or null when this build cannot say.
 *
 * Null rather than a guess, and null rather than a refusal. A version we cannot
 * resolve means a bundle older than the archive or a hand-made request, and
 * neither is worth failing a group create over — the acceptance itself is real
 * and the row still carries the version. Storing the current wording instead
 * would be the one unacceptable outcome: evidence of words nobody was shown.
 */
export function acknowledgmentWording(textVersion: number): string | null {
  // `Number` because this arrives off a JSON body. Postgres coerces "2" to 2
  // for an INTEGER column, so a string version would otherwise store a row
  // whose text_version resolves here to nothing.
  const version = Number(textVersion)

  const wording =
    version === ACKNOWLEDGMENT_TEXT_VERSION
      ? {
          // The live constants, so the stored text cannot drift from the screen
          // that showed it. The archive holds only what is no longer rendered.
          heading: ACKNOWLEDGMENT_HEADING,
          statements: ACKNOWLEDGMENT_STATEMENTS,
          checkbox: ACKNOWLEDGMENT_CHECKBOX,
        }
      : ARCHIVE[version]

  return wording ? assemble(wording) : null
}

/**
 * The screen read top to bottom: heading, the six numbered statements, the
 * checkbox line. Newline separated, no blank lines.
 *
 * The numbers are part of it because the screen numbers the statements and
 * every exchange about this wording refers to them by number. This assembly is
 * the one measured for the client — version 2 is 1,011 characters — so a stored
 * row can be checked against what was reported.
 *
 * Buttons and the record note are not included: they are how the screen works,
 * not what was agreed to.
 */
function assemble({ heading, statements, checkbox }: AcknowledgmentWording): string {
  return [heading, ...statements.map((text, index) => `${index + 1}. ${text}`), checkbox].join(
    '\n',
  )
}
