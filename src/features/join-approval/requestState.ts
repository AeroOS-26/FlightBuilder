/**
 * Which approval screen a requester sees, and when.
 *
 * The nine frames are not nine routes. Five are screens of their own and four
 * are states of pages that already exist, so "which screen" is a decision made
 * from the viewer's relationship to the group rather than from the URL. Keeping
 * that decision in one pure function is what stops it being re-derived, three
 * different ways, in three components.
 *
 * Placement, requester side:
 *
 *   42 Review your request   /share/[token] → the join step, replacing the
 *                            current JoinReviewScreen. Reached by asking to
 *                            join; nothing has been sent yet.
 *   43 Request sent          the same flow, immediately after submitting. A
 *                            confirmation, not a page anyone returns to.
 *   44 Under review          /group/[groupId] — the limited view of the group
 *                            while the request is pending. This is where a
 *                            returning requester lands.
 *   45 Request approved      /group/[groupId] — the normal participant view
 *                            with a confirmation banner on top.
 *   46 Not approved          /share/[token] — terminal. They are not in the
 *                            group and hold no place.
 *
 * Organiser side (47, 48, 48B, 49) resolves from membership role instead and is
 * not this function's job.
 *
 * Nothing here reads Zoho. Every input comes from our own database, which is
 * why the screens are not blocked on Vivek — only the outbound events are.
 */

/** The organiser's decision on a request. Mirrors `join_request.status`. */
export type JoinRequestStatus = 'pending' | 'approved' | 'declined' | 'lapsed'

/**
 * Perro Air's own check, tracked apart from the organiser's decision because
 * the requester waits on both (frames 43 and 44 both say so).
 */
export type PerroCheckStatus = 'pending' | 'cleared' | 'failed'

/** A request as the screens need it — our record, never Zoho's. */
export interface JoinRequestSummary {
  status: JoinRequestStatus
  checkStatus: PerroCheckStatus
  placesRequested: number
  requestedAt: string
}

export interface RequesterContext {
  /** Signed in. A visitor has no request and sees the public page. */
  signedIn: boolean
  /** Already holds a place. Membership beats any request record. */
  isMember: boolean
  /** Their request on this group, if they have ever made one. */
  request: JoinRequestSummary | null
}

/**
 * `public` means "not in this flow" — the caller keeps whatever it renders
 * today, which is how this stays additive while the switch is off.
 */
export type RequesterScreen =
  | 'public'
  | 'review-request'
  | 'request-sent'
  | 'under-review'
  | 'approved'
  | 'not-approved'

/**
 * Resolve the screen. Pure: same inputs, same answer, no clock and no I/O.
 *
 * `justSubmitted` is the one thing that cannot be derived from the record —
 * frame 43 and frame 44 describe the same state and differ only in whether the
 * person has just pressed the button. It comes from the flow, not the database.
 */
export function resolveRequesterScreen(
  ctx: RequesterContext,
  justSubmitted = false,
): RequesterScreen {
  if (!ctx.signedIn) return 'public'

  // Membership first. A member who also has an approved request is simply a
  // member; asking the request what to show would make the banner outlive the
  // moment it belongs to.
  if (ctx.isMember && ctx.request?.status !== 'approved') return 'public'

  const request = ctx.request
  if (!request) return 'review-request'

  switch (request.status) {
    case 'pending':
      // Both halves have to finish before anything opens up, so a cleared check
      // on a request the organiser has not answered is still Under review.
      return justSubmitted ? 'request-sent' : 'under-review'

    case 'approved':
      // Approved by the organiser but failed by Perro Air means the place was
      // taken and then given back. They are out, and told no more than that —
      // a decline gives no reason and neither does this.
      return request.checkStatus === 'failed' ? 'not-approved' : 'approved'

    case 'declined':
      return 'not-approved'

    case 'lapsed':
      // The group filled while this sat pending. It is NOT a decline, and the
      // difference is visible to the person: nobody turned them down.
      //
      // There is no frame for this. 46 is the nearest and its copy — "Your
      // request was not approved" — is wrong here. Raised with the client;
      // until it is answered this renders 46 with its own wording rather than
      // inventing a screen.
      return 'not-approved'
  }
}

/**
 * Whether a pending request should lapse, given the group's state.
 *
 * Settled: a request still pending when the group fills lapses on its own, with
 * no action from the organiser. Kept beside the resolver because it is the same
 * question asked at a different moment — and because "the group is full" is the
 * only trigger, there is nothing time-based here to schedule.
 */
export function shouldLapse(
  request: Pick<JoinRequestSummary, 'status'>,
  spacesRemaining: number,
): boolean {
  return request.status === 'pending' && spacesRemaining <= 0
}

/**
 * Whether the organiser may approve this request right now.
 *
 * A request larger than the places left cannot be approved, only declined, and
 * the reason shows on the row (frame 47: "Needs 2 places, 1 open"). Capacity is
 * counted in people, so this compares places, never rows.
 */
export function canApprove(
  request: Pick<JoinRequestSummary, 'status' | 'placesRequested'>,
  spacesRemaining: number,
): boolean {
  return request.status === 'pending' && request.placesRequested <= spacesRemaining
}
