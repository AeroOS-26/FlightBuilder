import 'server-only'

/**
 * Join requests — the step that now sits where the join used to be.
 *
 * A request takes nothing. The place is claimed at the organiser's approval,
 * which is also where `member.joined` and `flight_group.filled` move to
 * (Charles, 2026-09-22: "only the moment it fires moves"). So the capacity
 * arithmetic that used to live in `addMember` lives here too, and for the same
 * reason: it has to happen inside the lock, counted in people rather than rows.
 *
 * `approveRequest` deliberately repeats the seating SQL rather than calling
 * `addMember`. Seating, marking the request approved, and lapsing everyone else
 * when the group fills have to be one transaction — a second call would be a
 * second transaction, and a crash between them would leave a member seated
 * against a request still showing as pending.
 */

import { formatDateRange, metroLabel } from '@/features/public-flight/format'
import { appUrl } from '@/config/appUrl'
import { pool } from '@/features/auth/server/db'
import { openTravelerIdentities, sealTravelerIdentities } from './identityCrypto'
import type { EstimatedDateRange, FlightGroupPet, Traveler } from '@/types'
import type { JoinRequestStatus, PerroCheckStatus } from '../requestState'

export interface SubmitRequestInput {
  /** People, not accounts. Pets do not take a place. */
  places: number
  travelers: Traveler[]
  /** Already mapped to the contract's pet shape, as the flight sends them. */
  pets: FlightGroupPet[]
  /**
   * The address this request should be answered on, when the requester
   * changed it on frame 42. Null leaves the account's address in use.
   */
  contactEmail?: string | null
}

export interface JoinRequestRow {
  id: number
  /** The requester's name, for the card. Null if the account has none yet. */
  requesterName: string | null
  flightGroupId: string
  userId: string
  placesRequested: number
  status: JoinRequestStatus
  checkStatus: PerroCheckStatus
  requestedAt: Date
  /** When the organiser decided. Null while pending. */
  decidedAt: Date | null
  travelers: Traveler[]
  pets: FlightGroupPet[]
  /** Per-request address from frame 42. Null means the account's is used. */
  contactEmail: string | null
}

/** Why a request or a decision could not go through. Never a thrown error. */
export type RequestRefusal =
  | { refused: 'group-not-found' }
  | { refused: 'already-member' }
  | { refused: 'already-pending' }
  | { refused: 'group-full' }
  | { refused: 'not-pending' }
  | { refused: 'not-enough-places'; placesRequested: number; spacesRemaining: number }

const SELECT_COLUMNS = `
  id, flight_group_id, user_id, places_requested, status, check_status,
  requested_at, decided_at, travelers, pets, contact_email
`

interface Row {
  id: number
  requester_name?: string | null
  flight_group_id: string
  user_id: number
  places_requested: number
  status: JoinRequestStatus
  check_status: PerroCheckStatus
  requested_at: Date
  decided_at: Date | null
  travelers: Traveler[]
  pets: FlightGroupPet[]
  contact_email: string | null
}

function toRequest(row: Row): JoinRequestRow {
  return {
    id: row.id,
    requesterName: row.requester_name ?? null,
    flightGroupId: row.flight_group_id,
    userId: String(row.user_id),
    placesRequested: row.places_requested,
    status: row.status,
    checkStatus: row.check_status,
    requestedAt: row.requested_at,
    decidedAt: row.decided_at ?? null,
    // Opened here because this is the only mapper any read of this table goes
    // through — `getRequestById` builds its own SELECT and still returns
    // through it. One decrypt point, which is what makes the encryption
    // reviewable; see `identityCrypto`.
    travelers: openTravelerIdentities(row.travelers ?? []),
    pets: row.pets ?? [],
    contactEmail: row.contact_email ?? null,
  }
}

/**
 * Ask to join. Claims no place, so no capacity is consumed and nothing about
 * the group changes.
 *
 * A full group refuses outright: frame 49 states that new requests are not
 * accepted while the group is full, so the refusal belongs here rather than
 * being left for the organiser to decline by hand.
 */
export async function submitJoinRequest(
  groupId: string,
  userId: string,
  input: SubmitRequestInput,
): Promise<JoinRequestRow | RequestRefusal> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

    const group = await client.query<{ spaces_total: number }>(
      `SELECT spaces_total FROM flight_group WHERE flight_group_id = $1 FOR UPDATE`,
      [groupId],
    )
    if (!group.rows[0]) {
      await client.query('ROLLBACK')
      return { refused: 'group-not-found' }
    }

    const seated = await client.query<{ count: string }>(
      `SELECT COALESCE(SUM(seats_committed), 0)::text AS count
         FROM flight_group_member
        WHERE flight_group_id = $1 AND member_status = 'joined'`,
      [groupId],
    )
    const occupied = Number(seated.rows[0]?.count ?? 0)
    if (occupied >= group.rows[0].spaces_total) {
      await client.query('ROLLBACK')
      return { refused: 'group-full' }
    }

    // Already holding a place — there is nothing to ask for.
    const member = await client.query(
      `SELECT 1 FROM flight_group_member
        WHERE flight_group_id = $1 AND user_id = $2 AND member_status = 'joined'`,
      [groupId, Number(userId)],
    )
    if (member.rowCount) {
      await client.query('ROLLBACK')
      return { refused: 'already-member' }
    }

    // The partial unique index enforces this too; checking first turns a
    // constraint violation into an answer the screen can use.
    const pending = await client.query(
      `SELECT 1 FROM join_request
        WHERE flight_group_id = $1 AND user_id = $2 AND status = 'pending'`,
      [groupId, Number(userId)],
    )
    if (pending.rowCount) {
      await client.query('ROLLBACK')
      return { refused: 'already-pending' }
    }

    const inserted = await client.query<Row>(
      `INSERT INTO join_request
         (flight_group_id, user_id, places_requested, travelers, pets, contact_email)
       VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6)
       RETURNING ${SELECT_COLUMNS}`,
      [
        groupId,
        Number(userId),
        Math.max(1, Math.trunc(input.places)),
        // Sealed on the way in: the passport name, email, nationality and
        // date of birth are encrypted at rest, so SELECT on this table — or
        // the read-only role approved alongside it — returns envelopes rather
        // than identities (Chuck, 2026-10-27, §47). The caller's own array is
        // untouched, because the same travellers go on to the outbound event
        // in the clear.
        JSON.stringify(sealTravelerIdentities(input.travelers)),
        JSON.stringify(input.pets),
        input.contactEmail?.trim() || null,
      ],
    )

    await client.query('COMMIT')
    return toRequest(inserted.rows[0]!)
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/** This member's request on this group, latest first. Drives their screen. */
export async function getMemberRequest(
  groupId: string,
  userId: string,
): Promise<JoinRequestRow | null> {
  const { rows } = await pool.query<Row>(
    `SELECT ${SELECT_COLUMNS} FROM join_request
      WHERE flight_group_id = $1 AND user_id = $2
      ORDER BY requested_at DESC
      LIMIT 1`,
    [groupId, Number(userId)],
  )
  return rows[0] ? toRequest(rows[0]) : null
}

/** What is waiting on the organiser, oldest first — the order frame 47 shows. */
export async function listPendingRequests(groupId: string): Promise<JoinRequestRow[]> {
  const { rows } = await pool.query<Row>(
    `SELECT ${SELECT_COLUMNS.split(',').map((c) => 'r.' + c.trim()).join(', ')},
            u.name AS requester_name
       FROM join_request r
       LEFT JOIN users u ON u.id = r.user_id
      WHERE r.flight_group_id = $1 AND r.status = 'pending'
      ORDER BY r.requested_at ASC`,
    [groupId],
  )
  return rows.map(toRequest)
}

/**
 * The requests the fill closed out, for frame 49's "Request that Lapsed".
 *
 * The organiser is told about these because they happened without them: the
 * design reports a lapse as something that occurred, not something they did,
 * and says plainly that nothing is needed from them.
 */
export async function listLapsedRequests(groupId: string): Promise<JoinRequestRow[]> {
  const { rows } = await pool.query<Row>(
    `SELECT ${SELECT_COLUMNS.split(',').map((c) => 'r.' + c.trim()).join(', ')},
            u.name AS requester_name
       FROM join_request r
       LEFT JOIN users u ON u.id = r.user_id
      WHERE r.flight_group_id = $1 AND r.status = 'lapsed'
      ORDER BY r.decided_at ASC, r.id ASC`,
    [groupId],
  )
  return rows.map(toRequest)
}

/**
 * The approval that took the last place — frame 49 names that person.
 *
 * The latest decided approval on a group that is full. It is not read from
 * `filled_at` because the two are written in the same transaction and a
 * timestamp comparison would be a race with itself; the last approval on a
 * full group is the one that filled it, by definition of how capacity is
 * consumed.
 */
export async function lastApprovedRequest(groupId: string): Promise<JoinRequestRow | null> {
  const { rows } = await pool.query<Row>(
    `SELECT ${SELECT_COLUMNS.split(',').map((c) => 'r.' + c.trim()).join(', ')},
            u.name AS requester_name
       FROM join_request r
       LEFT JOIN users u ON u.id = r.user_id
      WHERE r.flight_group_id = $1 AND r.status = 'approved'
      ORDER BY r.decided_at DESC NULLS LAST, r.id DESC
      LIMIT 1`,
    [groupId],
  )
  return rows[0] ? toRequest(rows[0]) : null
}

export interface LapsedRequest {
  id: number
  userId: string
  placesRequested: number
  /** Per-request address from frame 42. Null means the account's is used. */
  contactEmail: string | null
}

export interface ApproveResult {
  /** The seat the approval created — the `fgm_` id the events carry. */
  seatId: number
  /** True only for the approval that took the last places. Fires `filled`. */
  filledByThisApproval: boolean
  /**
   * The requests closed because this approval filled the group. Returned in
   * full rather than counted: each one owes its requester a
   * `join_request.closed`, and the caller cannot build those from a number.
   */
  lapsed: LapsedRequest[]
  request: JoinRequestRow
}

/**
 * Approve a request: the moment a place is actually taken.
 *
 * One transaction, because three things have to be true together — the member
 * is seated, the request reads approved, and if this took the last place every
 * other pending request on the group is lapsed. The fill is claimed with the
 * same `filled_at IS NULL` guard the join used, so `flight_group.filled` still
 * cannot fire twice however the group came to be full.
 */
export async function approveRequest(
  groupId: string,
  requestId: number,
  decidedBy: string,
): Promise<ApproveResult | RequestRefusal> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')

    const group = await client.query<{ spaces_total: number }>(
      `SELECT spaces_total FROM flight_group WHERE flight_group_id = $1 FOR UPDATE`,
      [groupId],
    )
    if (!group.rows[0]) {
      await client.query('ROLLBACK')
      return { refused: 'group-not-found' }
    }

    const found = await client.query<Row>(
      `SELECT ${SELECT_COLUMNS} FROM join_request
        WHERE id = $1 AND flight_group_id = $2 FOR UPDATE`,
      [requestId, groupId],
    )
    const request = found.rows[0]
    if (!request) {
      await client.query('ROLLBACK')
      return { refused: 'group-not-found' }
    }
    if (request.status !== 'pending') {
      await client.query('ROLLBACK')
      return { refused: 'not-pending' }
    }

    const before = await client.query<{ count: string }>(
      `SELECT COALESCE(SUM(seats_committed), 0)::text AS count
         FROM flight_group_member
        WHERE flight_group_id = $1 AND member_status = 'joined'`,
      [groupId],
    )
    const spacesTotal = group.rows[0].spaces_total
    const spacesRemaining = Math.max(0, spacesTotal - Number(before.rows[0]?.count ?? 0))

    // Oversized requests can only be declined, never approved — frame 47 shows
    // the reason on the row rather than letting the click fail.
    if (request.places_requested > spacesRemaining) {
      await client.query('ROLLBACK')
      return {
        refused: 'not-enough-places',
        placesRequested: request.places_requested,
        spacesRemaining,
      }
    }

    const seated = await client.query<{ id: number }>(
      `INSERT INTO flight_group_member
         (flight_group_id, user_id, role, join_method, member_status, seats_committed, pets)
       VALUES ($1, $2, 'joiner', 'shared_link', 'joined', $3, $4::jsonb)
       ON CONFLICT (flight_group_id, user_id) DO UPDATE
         SET member_status = 'joined',
             seats_committed = EXCLUDED.seats_committed,
             pets = EXCLUDED.pets,
             updated_at = NOW()
       RETURNING id`,
      [
        groupId,
        request.user_id,
        request.places_requested,
        JSON.stringify(request.pets ?? []),
      ],
    )

    const approved = await client.query<Row>(
      `UPDATE join_request
          SET status = 'approved', decided_at = NOW(), decided_by = $2, updated_at = NOW()
        WHERE id = $1
        RETURNING ${SELECT_COLUMNS}`,
      [requestId, Number(decidedBy)],
    )

    const after = await client.query<{ count: string }>(
      `SELECT COALESCE(SUM(seats_committed), 0)::text AS count
         FROM flight_group_member
        WHERE flight_group_id = $1 AND member_status = 'joined'`,
      [groupId],
    )

    let filledByThisApproval = false
    let lapsed: LapsedRequest[] = []
    if (Number(after.rows[0]?.count ?? 0) >= spacesTotal) {
      const filled = await client.query(
        `UPDATE flight_group
            SET status = 'filled', filled_at = NOW(), updated_at = NOW()
          WHERE flight_group_id = $1 AND filled_at IS NULL`,
        [groupId],
      )
      filledByThisApproval = filled.rowCount === 1

      // Everyone still waiting is out, with no action from the organiser and no
      // decision recorded against them — frame 49 reports it as something that
      // happened rather than something they did.
      const closed = await client.query<{
        id: number
        user_id: number
        places_requested: number
        contact_email: string | null
      }>(
        `UPDATE join_request
            SET status = 'lapsed', updated_at = NOW()
          WHERE flight_group_id = $1 AND status = 'pending'
          RETURNING id, user_id, places_requested, contact_email`,
        [groupId],
      )
      lapsed = closed.rows.map((row) => ({
        id: row.id,
        userId: String(row.user_id),
        placesRequested: row.places_requested,
        contactEmail: row.contact_email ?? null,
      }))
    }

    await client.query('COMMIT')
    return {
      seatId: seated.rows[0]!.id,
      filledByThisApproval,
      lapsed,
      request: toRequest(approved.rows[0]!),
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/**
 * Decline a request. No reason is recorded, because none is given: the
 * requester is told it was not approved and nothing more (frame 48B). The place
 * stays open for other requests.
 */
export async function declineRequest(
  groupId: string,
  requestId: number,
  decidedBy: string,
): Promise<JoinRequestRow | RequestRefusal> {
  const { rows } = await pool.query<Row>(
    `UPDATE join_request
        SET status = 'declined', decided_at = NOW(), decided_by = $3, updated_at = NOW()
      WHERE id = $1 AND flight_group_id = $2 AND status = 'pending'
      RETURNING ${SELECT_COLUMNS}`,
    [requestId, groupId, Number(decidedBy)],
  )
  return rows[0] ? toRequest(rows[0]) : { refused: 'not-pending' }
}

/**
 * The requester's contact record, for the `member.joined` the approval sends.
 *
 * The join emitted that event for the person clicking; an approval emits it for
 * someone else, so the details have to be looked up rather than taken from the
 * session.
 */
export async function requesterContact(userId: string): Promise<{
  accountId: string | null
  email: string | null
  name: string | null
  phone: string | null
}> {
  const { rows } = await pool.query<{
    account_id: string | null
    email: string | null
    name: string | null
    phone: string | null
  }>(`SELECT account_id, email, name, phone FROM users WHERE id = $1`, [Number(userId)])
  const row = rows[0]
  return {
    accountId: row?.account_id ?? null,
    email: row?.email ?? null,
    name: row?.name ?? null,
    phone: row?.phone ?? null,
  }
}

/**
 * The group's Zoho record id, for events that fire on a group that has not
 * filled. `getFilledGroupSource` only answers for a filled group, and a decline
 * can happen at any point.
 */
export async function groupZohoRecordId(groupId: string): Promise<string | null> {
  const { rows } = await pool.query<{ zoho_record_id: string | null }>(
    `SELECT zoho_record_id FROM flight_group WHERE flight_group_id = $1`,
    [groupId],
  )
  return rows[0]?.zoho_record_id ?? null
}

/**
 * A member's `flight_group_member.id` — the `fgm_` id behind `closed_by`.
 *
 * `getMembership` answers whether someone is in a group and in what role, but
 * not which row they are. A decline has to name the organiser by id rather than
 * by a word, so the row is looked up here.
 */
export async function memberSeatId(groupId: string, userId: string): Promise<number | null> {
  const { rows } = await pool.query<{ id: number }>(
    `SELECT id FROM flight_group_member
      WHERE flight_group_id = $1 AND user_id = $2 AND member_status = 'joined'`,
    [groupId, Number(userId)],
  )
  return rows[0]?.id ?? null
}

/** One request, for the organiser's detail screen (frame 48). */
export async function getRequestById(
  groupId: string,
  requestId: number,
): Promise<(JoinRequestRow & { memberSince: Date | null }) | null> {
  const { rows } = await pool.query<Row & { requester_name: string | null; member_since: Date | null }>(
    `SELECT r.id, r.flight_group_id, r.user_id, r.places_requested, r.status,
            r.check_status, r.requested_at, r.decided_at, r.travelers, r.pets,
            u.name AS requester_name, u."emailVerified" AS member_since
       FROM join_request r
       LEFT JOIN users u ON u.id = r.user_id
      WHERE r.id = $1 AND r.flight_group_id = $2`,
    [requestId, groupId],
  )
  const row = rows[0]
  return row ? { ...toRequest(row), memberSince: row.member_since ?? null } : null
}

/**
 * The travel window as the formatters want it.
 *
 * `date_mode` is not read: a 'specific' group has `travel_date` and no range, a
 * 'range' group has `earliest_date` and usually `latest_date`, and migration
 * 0005's CHECK guarantees one of the two paths holds a value. Collapsing both
 * ends onto the same day is what makes a specific date render as one date —
 * `formatDateRange` prints a single day when the ends match.
 */
function dateWindow(row: {
  travel_date: string | null
  earliest_date: string | null
  latest_date: string | null
}): EstimatedDateRange {
  const single = row.travel_date
  if (single) return { earliest_date: single, latest_date: single }
  return { earliest_date: row.earliest_date, latest_date: row.latest_date ?? row.earliest_date }
}

/**
 * What a pending requester may see of a group (frame 44).
 *
 * Counts and the flight's own facts, never the roster. Someone whose request is
 * still waiting is not in the group, so the people in it are not theirs to see
 * — the screen says as much: "You will see who is in the group once your
 * request is approved."
 */
export interface RequesterGroupView {
  originCity: string
  /** Only set when the member locked a specific airport; null for a city. */
  originCode: string | null
  destinationCity: string
  destinationCode: string | null
  /**
   * The travel window. A group created on a range held both ends all along —
   * this read only ever selected `earliest_date`, so a 16–19 October group
   * showed as the 16th on frames 44 and 46 while the join form showed the
   * range correctly (client, 2026-10-12, finding 15).
   */
  departure: EstimatedDateRange
  aircraftCategory: string | null
  organizerName: string | null
  spacesTotal: number
  spacesOccupied: number
}

export async function getRequesterGroupView(
  groupId: string,
): Promise<RequesterGroupView | null> {
  const { rows } = await pool.query<{
    origin_city: string
    origin_airport_code: string | null
    destination_city: string
    destination_airport_code: string | null
    travel_date: string | null
    earliest_date: string | null
    latest_date: string | null
    aircraft_category: string | null
    spaces_total: number
    organizer_name: string | null
    occupied: string
  }>(
    `SELECT fg.origin_city, fg.origin_airport_code,
            fg.destination_city, fg.destination_airport_code,
            fg.travel_date::text AS travel_date, fg.earliest_date::text AS earliest_date,
            fg.latest_date::text AS latest_date,
            fg.aircraft_category, fg.spaces_total,
            u.name AS organizer_name,
            COALESCE((SELECT SUM(m.seats_committed) FROM flight_group_member m
                       WHERE m.flight_group_id = fg.flight_group_id
                         AND m.member_status = 'joined'), 0)::text AS occupied
       FROM flight_group fg
       LEFT JOIN users u ON u.id = fg.organizer_user_id
      WHERE fg.flight_group_id = $1`,
    [groupId],
  )
  const row = rows[0]
  if (!row) return null
  // The stored code only. A city-level group shows its city and no code —
  // client's call, 2026-09-07 (`docs/CLIENT-DECISIONS.md` §4): "a code reads as
  // a commitment, and a city-derived code is a routing placeholder that can
  // change when the carrier is booked."
  return {
    originCity: row.origin_city,
    originCode: row.origin_airport_code,
    destinationCity: row.destination_city,
    destinationCode: row.destination_airport_code,
    departure: dateWindow(row),
    aircraftCategory: row.aircraft_category,
    organizerName: row.organizer_name,
    spacesTotal: row.spaces_total,
    spacesOccupied: Number(row.occupied),
  }
}

export interface GroupEmailContext {
  /** "San Francisco to New York" — the templates take one string. */
  route: string
  departureDate: string
  organizerName: string | null
  organizerEmail: string | null
  /**
   * Where the two emails that carry a link send people: the group page.
   *
   * This was `flight_group.share_link`, the public join page — which carries no
   * approve or decline controls, so the organiser's "Review the request"
   * notification could not be acted on from its own link (client, 2026-10-12,
   * finding 10). The requester's approved mail wants the same route, because
   * that is where their participant view lives.
   *
   * Absolute, because it goes in an email. `/group/[groupId]` sends a signed-out
   * reader through sign-in and back.
   */
  groupLink: string
}

/**
 * Everything the four approval emails need about a group, in one read.
 *
 * Separate from `getRequesterGroupView` because that one is public-safe for a
 * requester and deliberately carries no addresses; this is server-side only
 * and carries the organiser's.
 */
export async function getGroupEmailContext(
  groupId: string,
): Promise<GroupEmailContext | null> {
  const { rows } = await pool.query<{
    origin_city: string
    destination_city: string
    travel_date: string | null
    earliest_date: string | null
    latest_date: string | null
    organizer_name: string | null
    organizer_email: string | null
  }>(
    `SELECT fg.origin_city, fg.destination_city,
            fg.travel_date::text AS travel_date, fg.earliest_date::text AS earliest_date,
            fg.latest_date::text AS latest_date,
            u.name AS organizer_name, u.email AS organizer_email
       FROM flight_group fg
       LEFT JOIN users u ON u.id = fg.organizer_user_id
      WHERE fg.flight_group_id = $1`,
    [groupId],
  )
  const row = rows[0]
  if (!row) return null
  /*
   * Both values are read inside a sentence — the template says "…to join your
   * flight group for {{route}} on {{departure_date}}…" — so they are shaped for
   * prose, not for a table.
   *
   * `metroLabel` trims "Las Vegas, Nevada, United States" to "Las Vegas", the
   * same label every screen shows. The raw stored date would render as
   * "on 2026-10-24" mid-sentence.
   */
  return {
    route: `${metroLabel(row.origin_city)} to ${metroLabel(row.destination_city)}`,
    // `formatDateRange` rather than this function's own `toLocaleDateString`:
    // one wording for the window across the screens and the four templates,
    // and it parses the date as local rather than UTC — `new Date('2026-10-16')`
    // is UTC midnight, which renders as the 15th anywhere behind it.
    departureDate: formatDateRange(dateWindow(row)),
    organizerName: row.organizer_name,
    organizerEmail: row.organizer_email,
    groupLink: `${appUrl()}/group/${encodeURIComponent(groupId)}`,
  }
}

/** What Perro Air's own check came back as. Contract section 3c, route (b). */
export type CheckOutcome = 'cleared' | 'failed'

export interface CheckRecorded {
  /** False when the request already carried this result — a retried callback. */
  changed: boolean
  /** The requester, for the removal event. */
  userId: string
  /** Set only when a failed check took a seated participant back out. */
  removal: {
    seatId: number
    placesReleased: number
    spacesTotal: number
    /** After the removal. */
    spacesRemaining: number
    /** The group's state once the place reopened. */
    groupStatus: string
    removedAt: string
  } | null
}

/** The removal half, named so the route can pass it around. */
export type CheckRemoval = NonNullable<CheckRecorded['removal']>

export type CheckRefusal = { refused: 'not-found' }

/**
 * Record the result of Perro Air's check, and act on a failure.
 *
 * The check is deliberately not the organiser's decision and deliberately not a
 * product screen — Chuck works a queue inside Zoho and the result comes back
 * here (client, 2026-09-23). Route (b) is the live route; the same function
 * serves route (a), because marking by hand is this call made by hand.
 *
 * **A failed check removes the participant and reopens the place** (migration
 * 0009). That only applies to someone who actually holds one: a result can
 * arrive while the organiser has not answered yet — the requester sees Under
 * review until both halves are done — and there is nothing to take back then.
 * So the status is always recorded; the removal happens only when the request
 * was approved and the seat is still joined.
 *
 * Idempotent. Zoho will retry, and a second callback must not remove a second
 * time or emit `member.removed` twice, so a result that matches what is already
 * stored reports `changed: false` and does nothing.
 *
 * Capacity is never stored — it is `SUM(seats_committed)` over joined rows — so
 * flipping the member out reopens the place by itself. `filled_at` is left
 * alone on purpose: it records that the group *did* fill, and clearing it would
 * let `flight_group.filled` fire a second time. Only `status` moves back.
 */
export async function recordPerroCheck(
  groupId: string,
  requestId: number,
  outcome: CheckOutcome,
  /**
   * When the reviewer actually decided, from the caller.
   *
   * Stored in `check_decided_at`, which until now was written with our own
   * `NOW()` — the moment the callback reached us, not the moment Chuck or
   * Sarah marked the queue. Those differ by however long the CRM took to send
   * it, and the retention rules care about the decision. Agreed with the
   * client: take this one, and leave `reviewed_by` and `reason_category` out —
   * nothing reads them and no screen shows them.
   *
   * Null falls back to `NOW()`, so a caller that sends nothing behaves as
   * before.
   */
  reviewedAt: Date | null = null,
): Promise<CheckRecorded | CheckRefusal> {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')

    const group = await client.query<{ spaces_total: number; status: string }>(
      `SELECT spaces_total, status FROM flight_group
        WHERE flight_group_id = $1 FOR UPDATE`,
      [groupId],
    )
    if (!group.rows[0]) {
      await client.query('ROLLBACK')
      return { refused: 'not-found' }
    }

    const found = await client.query<Row>(
      `SELECT ${SELECT_COLUMNS} FROM join_request
        WHERE id = $1 AND flight_group_id = $2 FOR UPDATE`,
      [requestId, groupId],
    )
    const request = found.rows[0]
    if (!request) {
      await client.query('ROLLBACK')
      return { refused: 'not-found' }
    }

    const userId = String(request.user_id)
    if (request.check_status === outcome) {
      await client.query('ROLLBACK')
      return { changed: false, userId, removal: null }
    }

    await client.query(
      `UPDATE join_request
          SET check_status = $3, check_decided_at = COALESCE($4, NOW()), updated_at = NOW()
        WHERE id = $1 AND flight_group_id = $2`,
      [requestId, groupId, outcome, reviewedAt],
    )

    // Nothing to take back unless the organiser approved and the seat is still
    // held. `RETURNING` so the event can name the real membership row.
    let removal: CheckRecorded['removal'] = null
    if (outcome === 'failed' && request.status === 'approved') {
      const seat = await client.query<{ id: number; seats_committed: number }>(
        `UPDATE flight_group_member
            SET member_status = 'cancelled', left_at = NOW(), updated_at = NOW()
          WHERE flight_group_id = $1 AND user_id = $2 AND member_status = 'joined'
        RETURNING id, seats_committed`,
        [groupId, request.user_id],
      )
      const row = seat.rows[0]
      if (row) {
        const after = await client.query<{ count: string }>(
          `SELECT COALESCE(SUM(seats_committed), 0)::text AS count
             FROM flight_group_member
            WHERE flight_group_id = $1 AND member_status = 'joined'`,
          [groupId],
        )
        const spacesTotal = group.rows[0].spaces_total
        const spacesRemaining = Math.max(0, spacesTotal - Number(after.rows[0]?.count ?? 0))

        // The column said 'filled'; a place is open again, so it does not any
        // more. The screens derive their state from occupancy and correct
        // themselves, but the stored value should not contradict them.
        const groupStatus = spacesRemaining > 0 && group.rows[0].status === 'filled'
          ? 'filling'
          : group.rows[0].status
        if (groupStatus !== group.rows[0].status) {
          await client.query(
            `UPDATE flight_group SET status = $2, updated_at = NOW()
              WHERE flight_group_id = $1`,
            [groupId, groupStatus],
          )
        }

        removal = {
          seatId: row.id,
          placesReleased: row.seats_committed,
          spacesTotal,
          spacesRemaining,
          groupStatus,
          removedAt: new Date().toISOString(),
        }
      }
    }

    await client.query('COMMIT')
    return { changed: true, userId, removal }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}
