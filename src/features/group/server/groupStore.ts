import 'server-only'

/**
 * Flight group persistence — the seam between the group screens and where group
 * data actually lives.
 *
 * Today that is our own Neon database. Zoho remains the source of truth and
 * keeps receiving its events, but member-facing reads no longer sit in Zoho's
 * request path: it offers no retry and no alerting, which is fine for an event
 * that writes a lead and not fine for a page a member is looking at.
 *
 * One function per call, so changing where a group is read from is a change to
 * one function body rather than a rewrite.
 */

import { pool, queryOne } from '@/features/auth/server/db'
import { getProfile } from '@/features/auth/server/profile'
import type {
  FlightGroupCreatedEvent,
  FlightGroupPet,
  GroupDetailMember,
  GroupDetailView,
  Pet,
} from '@/types'

type FlightGroupPayload = FlightGroupCreatedEvent['flight_group']

/* ------------------------------------------------------------------ create */

export interface CreateFlightGroupInput {
  /** The same object sent to Zoho, so the mapping stays a rename. */
  flightGroup: FlightGroupPayload
  organizerUserId: string
  petFriendly: boolean
  /** Zoho's record id when the relay returned one; kept for reconciliation. */
  zohoRecordId: string | null
}

/**
 * Mirror a newly created group, and seat its organiser.
 *
 * Both writes are one transaction: a group with no organiser row would be
 * unreachable, because authorisation and role both resolve through the
 * membership lookup. The organiser's real `flight_group_member.id` comes back
 * so the caller can stop using a client-generated founder id.
 */
export async function createFlightGroup({
  flightGroup,
  organizerUserId,
  petFriendly,
  zohoRecordId,
}: CreateFlightGroupInput): Promise<{ organizerMemberId: string }> {
  const { route, dates } = flightGroup
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    await client.query(
      `INSERT INTO flight_group (
         flight_group_id, status, share_link, spaces_total, aircraft_category,
         origin_input, origin_type, origin_city, origin_airport_code,
         destination_input, destination_type, destination_city, destination_airport_code,
         date_mode, travel_date, earliest_date, latest_date,
         pet_friendly, operator_notes, organizer_user_id, zoho_record_id
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21)
       ON CONFLICT (flight_group_id) DO NOTHING`,
      [
        flightGroup.group_id,
        flightGroup.status,
        flightGroup.share_link,
        flightGroup.spaces_total,
        flightGroup.aircraft_category,
        route.origin_input,
        route.origin_type,
        route.origin_city,
        route.origin_airport_code,
        route.destination_input,
        route.destination_type,
        route.destination_city,
        route.destination_airport_code,
        dates.date_mode,
        dates.travel_date,
        dates.earliest_date,
        dates.latest_date,
        petFriendly,
        flightGroup.operator_notes,
        Number(organizerUserId),
        zohoRecordId,
      ],
    )

    // The organiser's seat carries their whole party, not just themselves.
    //
    // Everyone on the party after the organiser is a name typed into the Flight
    // Builder with no account, and user_id is NOT NULL, so they cannot have
    // rows of their own. Counting rows would therefore report a party of three
    // as one occupied space and leave five open on a six-space flight. See
    // migration 0007.
    const partySeats = Math.max(1, flightGroup.members.length)

    // The party's pets for this flight, as flight_group.created just sent them.
    // They ride on whichever traveller is the primary contact, which need not be
    // the organiser, so they are gathered from every member — the organiser's
    // row is the only one the party has. flight_group.filled reads them back;
    // see migration 0008.
    const partyPets = flightGroup.members.flatMap((member) => member.pets)

    const seated = await client.query<{ id: number }>(
      `INSERT INTO flight_group_member
         (flight_group_id, user_id, role, join_method, member_status, seats_committed, pets)
       VALUES ($1, $2, 'group_organizer', 'group_organizer', 'joined', $3, $4::jsonb)
       ON CONFLICT (flight_group_id, user_id) DO UPDATE
         SET member_status = 'joined',
             seats_committed = EXCLUDED.seats_committed,
             pets = EXCLUDED.pets,
             updated_at = NOW()
       RETURNING id`,
      [flightGroup.group_id, Number(organizerUserId), partySeats, JSON.stringify(partyPets)],
    )

    await client.query('COMMIT')
    return { organizerMemberId: String(seated.rows[0]!.id) }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/* -------------------------------------------------------------------- join */

export interface AddMemberResult {
  memberId: string
  /** True when the member was already seated — the call is idempotent. */
  alreadyMember: boolean
  /**
   * Spaces occupied after the join, counted in **people, not accounts** —
   * the sum of every joined member's party. Directly comparable with
   * `spacesTotal`; a row count is not. See migration 0007.
   */
  memberCount: number
  spacesTotal: number
  /**
   * This member's place in the roster by join order, counted in accounts — the
   * same numbering the group page uses for "Member n".
   */
  memberOrdinal: number
  /**
   * Zoho's record id for the group, stored at creation; null when Zoho returned
   * none. Read under the same row lock, so `member.joined` needs no second query.
   */
  zohoRecordId: string | null
  /**
   * True only for the join that took the group's last places — the one that
   * owes Zoho `flight_group.filled`. A retry of that join, or any later call,
   * reads false, so the event cannot be sent twice from here.
   */
  filledByThisJoin: boolean
}

export interface AddMemberInput {
  /**
   * How many spaces this member takes: themselves plus any companions added on
   * the review screen. At least 1, which is the truth for a lone traveller.
   */
  seats: number
  /**
   * The party's pets for this flight, exactly as `member.joined` sends them.
   * Stored so `flight_group.filled` can send them again; see migration 0008.
   */
  pets: FlightGroupPet[]
}

/** The group exists but cannot fit this party. Nothing was written. */
export interface AddMemberRefused {
  refused: 'over_capacity'
  /** Spaces still free, so the caller can say how many rather than just "no". */
  spacesRemaining: number
  spacesTotal: number
}

export function isRefused(
  result: AddMemberResult | AddMemberRefused,
): result is AddMemberRefused {
  return 'refused' in result
}

/**
 * Seat a joiner. Idempotent on the (group, user) uniqueness constraint, so a
 * double-submit or a retried request returns the existing seat rather than
 * failing or double-booking.
 *
 * Returns null when the group does not exist.
 *
 * **Capacity is enforced here, not by the caller**, because only this function
 * holds the row lock. Checking after the insert would seat the member and then
 * report a failure, leaving a row behind for a join the member was told did not
 * happen. The check runs before the write and rolls back instead.
 *
 * **The fill is recorded here too**, for the same reason: whether this join is
 * the one that filled the group is only knowable under the lock that orders
 * the joins.
 */
export async function addMember(
  groupId: string,
  userId: string,
  { seats: seatsCommitted, pets }: AddMemberInput,
): Promise<AddMemberResult | AddMemberRefused | null> {
  const client = await pool.connect()

  try {
    // Use SERIALIZABLE isolation to prevent concurrent joins from both reading
    // stale capacity, then both inserting and exceeding capacity. The lock below
    // is strict but necessary: the alternative is an overbooked charter.
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE')
    await client.query('BEGIN')

    // Lock the group row so concurrent joins wait for this one to commit.
    // Critical: must hold this lock through the insert to prevent race conditions
    // where two joins both read the same (stale) occupancy before either writes.
    const group = await client.query<{ spaces_total: number; zoho_record_id: string | null }>(
      `SELECT spaces_total, zoho_record_id FROM flight_group WHERE flight_group_id = $1 FOR UPDATE`,
      [groupId],
    )
    if (group.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    const existing = await client.query<{ id: number; member_status: string }>(
      `SELECT id, member_status FROM flight_group_member
        WHERE flight_group_id = $1 AND user_id = $2
       FOR UPDATE`,
      [groupId, Number(userId)],
    )
    const alreadyMember = existing.rows[0]?.member_status === 'joined'

    const seats = Math.max(1, Math.trunc(seatsCommitted))
    const spacesTotal = group.rows[0]!.spaces_total

    // Capacity check, before the write and inside the lock.
    //
    // Skipped for a member already seated: their spaces are already counted, so
    // re-checking would refuse a harmless retry of a join that succeeded.
    //
    // Lock all member rows to ensure the SUM is stable until we insert. This
    // prevents the race where two joins both read occupancy at 5, then both insert.
    if (!alreadyMember) {
      // Lock all existing member rows so no other transaction can insert while
      // we're calculating and inserting. This, combined with the group row lock,
      // ensures serializable capacity checks.
      await client.query(
        `SELECT 1 FROM flight_group_member
          WHERE flight_group_id = $1 AND member_status = 'joined'
         FOR UPDATE`,
        [groupId],
      )

      const occupied = await client.query<{ count: string }>(
        `SELECT COALESCE(SUM(seats_committed), 0)::text AS count
           FROM flight_group_member
          WHERE flight_group_id = $1 AND member_status = 'joined'`,
        [groupId],
      )
      const taken = Number(occupied.rows[0]!.count)

      if (taken + seats > spacesTotal) {
        await client.query('ROLLBACK')
        return {
          refused: 'over_capacity',
          spacesRemaining: Math.max(0, spacesTotal - taken),
          spacesTotal,
        }
      }
    }

    // A member already seated is a retry of a join that succeeded, and gets that
    // seat back exactly as it was. Rewriting it from the retry's body would let
    // a second request change the party after the fact: more seats past the
    // capacity check skipped above (overbooking by API call), or different pets
    // after flight_group.filled has already sent the first ones.
    //
    // The upsert therefore only runs for a new member, or one returning from
    // `left`/`cancelled` — and in both of those cases the capacity check ran.
    let seatId: number
    if (alreadyMember) {
      seatId = existing.rows[0]!.id
    } else {
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
        [groupId, Number(userId), seats, JSON.stringify(pets)],
      )
      seatId = seated.rows[0]!.id
    }

    // Occupancy is the sum of parties, not a row count — a row is an account
    // and a space is a person. See migration 0007.
    const count = await client.query<{ count: string }>(
      `SELECT COALESCE(SUM(seats_committed), 0)::text AS count
         FROM flight_group_member
        WHERE flight_group_id = $1 AND member_status = 'joined'`,
      [groupId],
    )
    const memberCount = Number(count.rows[0]!.count)

    // Record the fill, once. The row is already locked above, and the update
    // only lands while filled_at is null, so exactly one join per group can
    // claim it — a retry of the filling join finds it set and claims nothing.
    // status becomes authoritative from here, as migration 0005 intended once
    // this event existed.
    let filledByThisJoin = false
    if (memberCount >= spacesTotal) {
      const filled = await client.query(
        `UPDATE flight_group
            SET status = 'filled', filled_at = NOW(), updated_at = NOW()
          WHERE flight_group_id = $1 AND filled_at IS NULL`,
        [groupId],
      )
      filledByThisJoin = filled.rowCount === 1
    }

    // Position by join order, ties broken by id. Counted rather than taken from
    // the row id: ids are shared by every group, so they say nothing about this
    // one.
    const ordinal = await client.query<{ ordinal: number }>(
      `SELECT COUNT(*)::int AS ordinal
         FROM flight_group_member
        WHERE flight_group_id = $1 AND member_status = 'joined'
          AND (joined_at, id) <= (SELECT joined_at, id FROM flight_group_member WHERE id = $2)`,
      [groupId, seatId],
    )

    await client.query('COMMIT')

    return {
      memberId: String(seatId),
      alreadyMember,
      memberCount,
      spacesTotal,
      memberOrdinal: ordinal.rows[0]!.ordinal,
      zohoRecordId: group.rows[0]!.zoho_record_id,
      filledByThisJoin,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/* ------------------------------------------------------------ filled event */

/** A member of a filled group, as `flight_group.filled` needs them. */
export interface FilledGroupMember {
  memberId: number
  accountId: string | null
  name: string | null
  email: string
  role: 'group_organizer' | 'joiner'
  joinMethod: 'group_organizer' | 'shared_link' | 'manual'
  /** The party's pets, as sent on the event that seated this member. */
  pets: FlightGroupPet[]
}

/** Everything `flight_group.filled` carries, read back from our own records. */
export interface FilledGroupSource {
  groupId: string
  zohoRecordId: string | null
  spacesTotal: number
  /** People seated: the sum of every party, not a count of accounts. */
  spacesOccupied: number
  aircraftCategory: string | null
  originCity: string
  destinationCity: string
  dateMode: 'specific' | 'range'
  travelDate: string | null
  earliestDate: string | null
  latestDate: string | null
  filledAt: Date
  /** Organiser first, then joiners in join order. */
  members: FilledGroupMember[]
}

interface FilledGroupRow {
  flight_group_id: string
  zoho_record_id: string | null
  spaces_total: number
  aircraft_category: string | null
  origin_city: string
  destination_city: string
  date_mode: 'specific' | 'range'
  travel_date: string | null
  earliest_date: string | null
  latest_date: string | null
  filled_at: Date
}

interface FilledMemberRow {
  id: number
  role: 'group_organizer' | 'joiner'
  join_method: 'group_organizer' | 'shared_link' | 'manual'
  seats_committed: number
  pets: FlightGroupPet[]
  account_id: string | null
  name: string | null
  email: string
}

/**
 * The group as `flight_group.filled` describes it, or null when it has not
 * filled.
 *
 * Dates are read as text. pg hands a DATE back as a Date at local midnight,
 * which lands on the previous day anywhere ahead of UTC — the trap
 * `toISODate` below exists for. An event that goes to the CRM has no business
 * passing through a timezone at all.
 */
export async function getFilledGroupSource(groupId: string): Promise<FilledGroupSource | null> {
  const group = await queryOne<FilledGroupRow>(
    `SELECT flight_group_id, zoho_record_id, spaces_total, aircraft_category,
            origin_city, destination_city, date_mode,
            travel_date::text AS travel_date,
            earliest_date::text AS earliest_date,
            latest_date::text AS latest_date,
            filled_at
       FROM flight_group
      WHERE flight_group_id = $1 AND filled_at IS NOT NULL`,
    [groupId],
  )
  if (!group) return null

  const { rows } = await pool.query<FilledMemberRow>(
    `SELECT fgm.id, fgm.role, fgm.join_method, fgm.seats_committed, fgm.pets,
            u.account_id, u.name, u.email
       FROM flight_group_member fgm
       JOIN users u ON u.id = fgm.user_id
      WHERE fgm.flight_group_id = $1 AND fgm.member_status = 'joined'
      ORDER BY (fgm.role = 'group_organizer') DESC, fgm.joined_at ASC, fgm.id ASC`,
    [groupId],
  )

  return {
    groupId: group.flight_group_id,
    zohoRecordId: group.zoho_record_id,
    spacesTotal: group.spaces_total,
    spacesOccupied: rows.reduce((sum, row) => sum + row.seats_committed, 0),
    aircraftCategory: group.aircraft_category,
    originCity: group.origin_city,
    destinationCity: group.destination_city,
    dateMode: group.date_mode,
    travelDate: group.travel_date,
    earliestDate: group.earliest_date,
    latestDate: group.latest_date,
    filledAt: group.filled_at,
    members: rows.map((row) => ({
      memberId: row.id,
      accountId: row.account_id,
      name: row.name,
      email: row.email,
      role: row.role,
      joinMethod: row.join_method,
      pets: row.pets ?? [],
    })),
  }
}

/**
 * Record that Zoho accepted `flight_group.filled`.
 *
 * A filled group without this is a Deal that was never created — see the query
 * in migration 0008.
 */
export async function markFilledEventSent(groupId: string): Promise<void> {
  await pool.query(
    `UPDATE flight_group SET filled_event_sent_at = NOW(), updated_at = NOW()
      WHERE flight_group_id = $1`,
    [groupId],
  )
}

/* -------------------------------------------------------------------- read */

interface GroupRow {
  flight_group_id: string
  share_link: string
  spaces_total: number
  /** Nullable since migration 0006 — no aircraft until an operator quotes. */
  aircraft_category: string | null
  origin_city: string
  origin_airport_code: string | null
  destination_city: string
  destination_airport_code: string | null
  travel_date: string | null
  earliest_date: string | null
  latest_date: string | null
  pet_friendly: boolean
  organizer_user_id: number | null
  organizer_name: string | null
  created_at: Date
}

interface MemberRow {
  user_id: number
  name: string | null
  email: string
  role: 'group_organizer' | 'joiner'
  joined_at: Date
  /** Spaces this membership occupies: the member plus their companions. */
  seats_committed: number
  pets: Pet[] | null
}

/** "3 days ago", "12 days ago", "Today". */
function timeAgo(when: Date): string {
  const days = Math.floor((Date.now() - when.getTime()) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  return `${days} days ago`
}

/**
 * The Recent Activity feed, derived from timestamps we already store.
 *
 * The frames also show "Share link clicked N times" and "Notifications sent to
 * N members in your area". Neither has a source — there is no click tracking and
 * no notification log anywhere in the system — so they are deliberately absent
 * rather than faked. Raised with the client; see docs/STATUS.md.
 *
 * Members are numbered by join order, not named, matching the frames.
 */
function buildActivity(
  groupCreatedAt: Date,
  members: MemberRow[],
): GroupDetailView['activity'] {
  const joins = members
    .filter((m) => m.role !== 'group_organizer')
    .map((m, i) => ({
      label: `Member ${i + 1} joined`,
      occurred_label: timeAgo(m.joined_at),
      at: m.joined_at.getTime(),
    }))
    // Newest first, as the frames show it.
    .sort((a, b) => b.at - a.at)

  return [
    ...joins.map(({ label, occurred_label }) => ({ label, occurred_label })),
    { label: 'Group created', occurred_label: timeAgo(groupCreatedAt) },
  ]
}

/** "Biscuit (Golden Retriever)" for one pet, "Biscuit, Mochi" for several. */
function petSummary(pets: Pet[]): string | null {
  if (pets.length === 0) return null
  if (pets.length === 1) {
    const pet = pets[0]!
    return pet.breed ? `${pet.name} (${pet.breed})` : pet.name || pet.type.toLowerCase()
  }
  return pets.map((p) => p.name).filter(Boolean).join(', ')
}

/** "Dog · Golden Retriever · 68 lbs · Calm", skipping anything not filled in. */
function petDetail(pet: Pet): string {
  return [pet.type, pet.breed, pet.weight && `${pet.weight} lbs`, pet.temperament]
    .filter(Boolean)
    .join(' · ')
}

function toISODate(value: string | Date | null): string {
  if (!value) return ''
  if (!(value instanceof Date)) return String(value).slice(0, 10)

  // pg hands back a DATE as a Date at LOCAL midnight. toISOString() would then
  // shift it into the previous day for any timezone ahead of UTC — a departure
  // stored as the 1st rendered as the 30th. Read the local parts instead.
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  const day = String(value.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * The full group as a member sees it.
 *
 * Returns null when the group does not exist. It deliberately does NOT check
 * membership — that is an authorisation decision the caller makes, so this stays
 * a data function.
 */
export async function getGroupDetail(
  groupId: string,
  viewerUserId: string,
): Promise<GroupDetailView | null> {
  const group = await queryOne<GroupRow>(
    `SELECT fg.flight_group_id, fg.share_link, fg.spaces_total, fg.aircraft_category,
            fg.origin_city, fg.origin_airport_code,
            fg.destination_city, fg.destination_airport_code,
            fg.travel_date, fg.earliest_date, fg.latest_date,
            fg.pet_friendly, fg.organizer_user_id, fg.created_at,
            u.name AS organizer_name
       FROM flight_group fg
       LEFT JOIN users u ON u.id = fg.organizer_user_id
      WHERE fg.flight_group_id = $1`,
    [groupId],
  )
  if (!group) return null

  const { rows: memberRows } = await pool.query<MemberRow>(
    `SELECT fgm.user_id, u.name, u.email, fgm.role, fgm.joined_at,
            fgm.seats_committed, mp.pets
       FROM flight_group_member fgm
       JOIN users u ON u.id = fgm.user_id
       LEFT JOIN member_profile mp ON mp.user_id = fgm.user_id
      WHERE fgm.flight_group_id = $1 AND fgm.member_status = 'joined'
      ORDER BY fgm.joined_at ASC`,
    [groupId],
  )

  const viewerId = Number(viewerUserId)

  const members: GroupDetailMember[] = memberRows.map((row) => {
    const displayName = row.name?.trim() || row.email
    return {
      user_id: String(row.user_id),
      display_name: displayName,
      first_initial: displayName.charAt(0).toUpperCase(),
      role: row.role === 'group_organizer' ? 'organizer' : 'joiner',
      joined_at: row.joined_at.toISOString(),
      member_status: 'confirmed',
      is_self: row.user_id === viewerId,
      pet_summary: petSummary(row.pets ?? []),
    }
  })

  // Species counts across the whole roster, for "pets travelling with this group".
  const bySpecies: Record<string, number> = {}
  for (const row of memberRows) {
    for (const pet of row.pets ?? []) {
      const species = pet.type || 'Pet'
      bySpecies[species] = (bySpecies[species] ?? 0) + 1
    }
  }
  const petsTotal = Object.values(bySpecies).reduce((sum, n) => sum + n, 0)

  const viewerProfile = await getProfile(viewerUserId)
  const viewerIndex = members.findIndex((m) => m.is_self)

  // Spaces are people, members are accounts. A party of three occupies three
  // spaces through one membership row, so counting rows here would report the
  // flight as emptier than it is. Same unit mismatch as the join check; see
  // migration 0007.
  const spacesOccupied = memberRows.reduce((sum, row) => sum + (row.seats_committed ?? 1), 0)

  return {
    group_id: group.flight_group_id,
    organizer_id: String(group.organizer_user_id ?? ''),
    organizer_name: group.organizer_name?.trim() || 'Group Organizer',
    share_url: group.share_link,
    viewer_member_ordinal: viewerIndex >= 0 ? viewerIndex + 1 : 1,
    viewer_travelers: (viewerProfile?.travelers ?? []).map((t) => ({
      name: t.name,
      is_primary: t.isFounder,
    })),
    viewer_pets: (viewerProfile?.pets ?? []).map((pet) => ({
      name: pet.name,
      detail: petDetail(pet),
    })),
    activity: buildActivity(group.created_at, memberRows),
    flight: {
      flight_id: group.flight_group_id,
      route_origin_city: group.origin_city,
      route_origin_code: group.origin_airport_code,
      route_destination_city: group.destination_city,
      route_destination_code: group.destination_airport_code,
      // One "absent" value downstream, not two: rows written before 0006 can
      // hold '' where newer rows hold NULL, and a bare '' would render as a
      // blank AIRCRAFT row instead of the pending placeholder.
      aircraft_category: group.aircraft_category?.trim() || null,
      estimated_date_range: {
        earliest_date: toISODate(group.earliest_date ?? group.travel_date),
        latest_date: toISODate(group.latest_date ?? group.travel_date),
      },
      departure_date: toISODate(group.travel_date ?? group.earliest_date),
      spaces_total: group.spaces_total,
      spaces_remaining: Math.max(0, group.spaces_total - spacesOccupied),
      pet_friendly: group.pet_friendly,
      fellow_pet_info: { pets_total: petsTotal, by_species: bySpecies },
    },
    members,
  }
}
