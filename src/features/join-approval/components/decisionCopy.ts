/**
 * The wording the two decision confirmations use, in one place.
 *
 * Frames 47 and 48 both decide the same two things about the same request, and
 * the client's weekend run found the list screen deciding them with no
 * confirmation at all (2026-10-12, finding 2): the cross and the tick both
 * fired on the first click, so counsel's decline safeguard — frame 48B — was
 * reachable only from the detail screen and bypassed entirely by the list.
 *
 * Both screens now confirm both decisions, which is two dialogs on two screens
 * saying the same thing. That is exactly the shape that drifts, and these
 * components already carry notes about why it must not: "two wordings on
 * adjacent screens read as two different facts". So the sentences live here and
 * neither screen writes its own.
 *
 * **Decline carries no reason.** Not in the dialog, not in the record, not in
 * the email — counsel's ruling, and the client re-verified it through the page
 * source, the embedded data, the network responses and the email on 11 October.
 * Nothing here invents one, and the dialog says outright that none is given.
 *
 * **Approve is the irreversible one.** Declining leaves the place open and the
 * person can ask again; approving seats them, may fill the group, and fires
 * `member.joined` to Zoho. The confirmation reflects that rather than treating
 * the red button as the only dangerous one.
 */

/** How many places are left once this request is approved. */
function placesAfter(placesRequested: number, spacesRemaining: number): number {
  return Math.max(0, spacesRemaining - placesRequested)
}

function places(n: number): string {
  return `${n} ${n === 1 ? 'place' : 'places'}`
}

export interface DecisionCopy {
  title: string
  body: string
  /** The button that goes through with it. */
  confirmLabel: string
  /** The button that backs out. Always the safe outcome. */
  cancelLabel: string
}

/**
 * The approve confirmation.
 *
 * The consequence is assembled rather than quoted, for the same reason frame
 * 48's callout assembles it: "which makes the group full" is wrong when four
 * places remain, and this sentence is read by the person making the decision.
 */
export function approveCopy(
  name: string,
  placesRequested: number,
  spacesRemaining: number,
): DecisionCopy {
  // Oversized cannot be approved — the places are not there. Both screens
  // already disable the button, so this is unreachable today; it is here
  // because the alternative is a sentence that says "fills the group" about a
  // request that cannot be seated, in front of someone about to take an
  // irreversible action. Copy that precedes a decision should not depend on
  // the caller having guarded it.
  if (placesRequested > spacesRemaining) {
    return {
      title: `Approve ${name}?`,
      body:
        `This request needs ${places(placesRequested)} and ` +
        `${places(spacesRemaining)} ${spacesRemaining === 1 ? 'is' : 'are'} open, ` +
        'so it cannot be approved. It can still be declined.',
      confirmLabel: 'Approve request',
      cancelLabel: 'Keep the request',
    }
  }

  const left = placesAfter(placesRequested, spacesRemaining)
  return {
    title: `Approve ${name}?`,
    body:
      `${name} joins the group straight away and takes ${places(placesRequested)}` +
      (left === 0
        ? ', which fills the group and closes it to new requests. '
        : `, leaving ${places(left)} open. `) +
      'Perro Air then runs its own check, and their screens read Under review until it is done. ' +
      'Approving cannot be undone.',
    confirmLabel: 'Approve request',
    cancelLabel: 'Keep the request',
  }
}

/**
 * The decline confirmation — frame 48B's own wording, unchanged.
 *
 * "without a reason" is the product rule rather than a limitation of the
 * screen, which is why it is stated to the organiser rather than left for them
 * to discover.
 */
export function declineCopy(name: string): DecisionCopy {
  return {
    title: `Decline ${name}?`,
    body:
      'They will be told their request was not approved, without a reason. ' +
      'The open place stays open for other requests.',
    confirmLabel: 'Decline request',
    cancelLabel: 'Keep the request',
  }
}

/** The copy for whichever decision is being confirmed. */
export function decisionCopy(
  decision: 'approve' | 'decline',
  name: string,
  placesRequested: number,
  spacesRemaining: number,
): DecisionCopy {
  return decision === 'approve'
    ? approveCopy(name, placesRequested, spacesRemaining)
    : declineCopy(name)
}
