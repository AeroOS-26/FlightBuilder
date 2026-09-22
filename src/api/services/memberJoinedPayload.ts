/**
 * Join -> `member.joined` payload, contract section 3.
 *
 * Kept beside `flightPayload.ts` so both group events read against the contract
 * in the same place, and so the shape is a pure function of its inputs.
 */

import type { FlightGroupPet, MemberJoinedEvent } from '@/types'

interface BuildArgs {
  groupId: string
  /** Zoho's record id for the group, stored at creation; null when none was returned. */
  zohoRecordId: string | null
  /** The seat row id from our roster. */
  seatId: string
  accountId: string | null
  name: string | null
  email: string
  phone: string | null
  /**
   * The party's pets as confirmed on the review screen, already in the
   * contract's shape. Mapped once by the caller, because the same objects are
   * stored against the seat for flight_group.filled — mapping here as well
   * would leave two places that could disagree.
   */
  pets: FlightGroupPet[]
  /** ISO timestamp for the event (caller stamps it). */
  sentAt: string
}

export function buildMemberJoined({
  groupId,
  zohoRecordId,
  seatId,
  accountId,
  name,
  email,
  phone,
  pets,
  sentAt,
}: BuildArgs): MemberJoinedEvent {
  return {
    event: 'member.joined',
    sent_at: sentAt,
    group_id: groupId,
    zoho_flight_group_record_id: zohoRecordId,
    member: {
      flight_group_member_id: `fgm_${seatId}`,
      // "" rather than null when absent, as before. Which of the two the contract
      // wants is still open with the client, so this does not change it.
      account_id: accountId ?? '',
      name: name ?? '',
      email,
      phone: phone?.trim() || null,
      role: 'joiner',
      join_method: 'shared_link',
      member_status: 'joined',
      // The joiner is the contact for their own party, so the party's pets sit
      // with them — the same rule flight_group.created applies to the organizer.
      is_primary: true,
      pets,
    },
  }
}
