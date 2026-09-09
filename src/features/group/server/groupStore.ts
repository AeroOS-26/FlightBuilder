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

    const seated = await client.query<{ id: number }>(
      `INSERT INTO flight_group_member
         (flight_group_id, user_id, role, join_method, member_status)
       VALUES ($1, $2, 'group_organizer', 'group_organizer', 'joined')
       ON CONFLICT (flight_group_id, user_id) DO UPDATE
         SET member_status = 'joined', updated_at = NOW()
       RETURNING id`,
      [flightGroup.group_id, Number(organizerUserId)],
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
  /** Roster size after the join, so the caller can tell whether it filled. */
  memberCount: number
  spacesTotal: number
}

/**
 * Seat a joiner. Idempotent on the (group, user) uniqueness constraint, so a
 * double-submit or a retried request returns the existing seat rather than
 * failing or double-booking.
 *
 * Returns null when the group does not exist. Capacity is the caller's call to
 * make: this reports the counts rather than deciding policy.
 */
export async function addMember(
  groupId: string,
  userId: string,
): Promise<AddMemberResult | null> {
  const client = await pool.connect()

  try {
    await client.query('BEGIN')

    // Lock the group row so two simultaneous joins cannot both read the same
    // remaining-space count and overfill the flight.
    const group = await client.query<{ spaces_total: number }>(
      `SELECT spaces_total FROM flight_group WHERE flight_group_id = $1 FOR UPDATE`,
      [groupId],
    )
    if (group.rows.length === 0) {
      await client.query('ROLLBACK')
      return null
    }

    const existing = await client.query<{ id: number; member_status: string }>(
      `SELECT id, member_status FROM flight_group_member
        WHERE flight_group_id = $1 AND user_id = $2`,
      [groupId, Number(userId)],
    )
    const alreadyMember = existing.rows[0]?.member_status === 'joined'

    const seated = await client.query<{ id: number }>(
      `INSERT INTO flight_group_member
         (flight_group_id, user_id, role, join_method, member_status)
       VALUES ($1, $2, 'joiner', 'shared_link', 'joined')
       ON CONFLICT (flight_group_id, user_id) DO UPDATE
         SET member_status = 'joined', updated_at = NOW()
       RETURNING id`,
      [groupId, Number(userId)],
    )

    const count = await client.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM flight_group_member
        WHERE flight_group_id = $1 AND member_status = 'joined'`,
      [groupId],
    )

    await client.query('COMMIT')

    return {
      memberId: String(seated.rows[0]!.id),
      alreadyMember,
      memberCount: Number(count.rows[0]!.count),
      spacesTotal: group.rows[0]!.spaces_total,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

/* -------------------------------------------------------------------- read */

interface GroupRow {
  flight_group_id: string
  share_link: string
  spaces_total: number
  aircraft_category: string
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
    `SELECT fgm.user_id, u.name, u.email, fgm.role, fgm.joined_at, mp.pets
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
      aircraft_category: group.aircraft_category,
      estimated_date_range: {
        earliest_date: toISODate(group.earliest_date ?? group.travel_date),
        latest_date: toISODate(group.latest_date ?? group.travel_date),
      },
      departure_date: toISODate(group.travel_date ?? group.earliest_date),
      spaces_total: group.spaces_total,
      spaces_remaining: Math.max(0, group.spaces_total - members.length),
      pet_friendly: group.pet_friendly,
      fellow_pet_info: { pets_total: petsTotal, by_species: bySpecies },
    },
    members,
  }
}
