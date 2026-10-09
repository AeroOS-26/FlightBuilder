/**
 * The four approval emails.
 *
 * Aliases and merge fields supplied by the client on 2026-10-07. The aliases
 * are what Postmark matches on, so an unknown one fails the send rather than
 * falling back — they are written once, here.
 *
 * Every function is best-effort and never throws. Each is called after the
 * write that caused it has already committed, so a mail failure must not undo
 * a decision the organiser made or a request a member sent. The outcome is
 * logged either way.
 *
 * `places_requested` goes pre-formatted as "1 place" / "2 places" so the
 * template needs no pluralisation, per the client's instruction.
 */

import { sendApprovalEmail } from '@/features/auth/server/email'

export interface ApprovalEmailFlight {
  /** "San Francisco to New York" — one string, the templates do not split it. */
  route: string
  departureDate: string
}

function places(n: number): string {
  return `${n} ${n === 1 ? 'place' : 'places'}`
}

/** A send that failed is logged and swallowed; the decision already stands. */
async function attempt(
  what: string,
  run: () => Promise<{ ok: boolean; message?: string }>,
): Promise<void> {
  try {
    const result = await run()
    if (!result.ok) console.error(`[email] ${what} not sent: ${result.message ?? 'unknown'}`)
  } catch (error) {
    console.error(`[email] ${what} threw:`, error instanceof Error ? error.message : error)
  }
}

/** Someone has asked to join — to the Group Organizer. */
export async function emailOrganiserNewRequest(args: {
  to: string
  organizerName: string | null
  requesterName: string | null
  flight: ApprovalEmailFlight
  placesRequested: number
  groupLink: string
}): Promise<void> {
  await attempt(`join-request-received -> ${args.to}`, () =>
    sendApprovalEmail(args.to, 'join-request-received', {
      requester_name: args.requesterName ?? 'A Flight Club member',
      organizer_name: args.organizerName ?? 'there',
      route: args.flight.route,
      departure_date: args.flight.departureDate,
      places_requested: places(args.placesRequested),
      group_link: args.groupLink,
    }),
  )
}

/** Approved — to the requester. The only one carrying a link to the group. */
export async function emailRequesterApproved(args: {
  to: string
  requesterName: string | null
  flight: ApprovalEmailFlight
  groupLink: string
}): Promise<void> {
  await attempt(`join-request-approved -> ${args.to}`, () =>
    sendApprovalEmail(args.to, 'join-request-approved', {
      requester_name: args.requesterName ?? 'there',
      route: args.flight.route,
      departure_date: args.flight.departureDate,
      group_link: args.groupLink,
    }),
  )
}

/**
 * Declined — to the requester.
 *
 * No reason travels with it and there is no field it could come from: a
 * decline gives none, and nothing is invented to fill the gap. Frame 48B,
 * and confirmed by the client.
 */
export async function emailRequesterDeclined(args: {
  to: string
  requesterName: string | null
  flight: ApprovalEmailFlight
}): Promise<void> {
  await attempt(`join-request-declined -> ${args.to}`, () =>
    sendApprovalEmail(args.to, 'join-request-declined', {
      requester_name: args.requesterName ?? 'there',
      route: args.flight.route,
      departure_date: args.flight.departureDate,
    }),
  )
}

/**
 * The group filled while their request was still open — to the requester.
 *
 * Nobody decided this, so it is not a decline and the template does not read
 * as one. No group link: they are not in the group.
 */
export async function emailRequesterGroupFilled(args: {
  to: string
  requesterName: string | null
  flight: ApprovalEmailFlight
}): Promise<void> {
  await attempt(`join-request-group-filled -> ${args.to}`, () =>
    sendApprovalEmail(args.to, 'join-request-group-filled', {
      requester_name: args.requesterName ?? 'there',
      route: args.flight.route,
      departure_date: args.flight.departureDate,
    }),
  )
}
