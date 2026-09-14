/**
 * Sample flight groups for the read-relay — server-only.
 *
 * This is the SEAM. It stands in for the real AeroOS source (there is no ready
 * endpoint yet, so the relay owns resolution). Each record here is the full
 * internal group, INCLUDING sensitive fields, exactly as the real source will
 * one day return it — so the relay's public-safe filter (`toPublicView`) is
 * exercised against realistic data. When the real source lands, only
 * `resolveGroupByToken` changes; the filter and the route stay put.
 *
 * Sensitive fields (operator, tail, airport codes, exact times, pricing,
 * member identities) are present here ON PURPOSE, to prove the relay strips
 * them before anything reaches the browser.
 */

import type { PublicFlightState } from '@/types'

/** A pet on the flight — used only to derive public fellow-pet counts. */
interface SampleMemberPet {
  type: string
}

/** A full internal member — most of this is withheld from the public view. */
interface SampleMember {
  flight_group_member_id: string
  name: string
  email: string
  role: string
  pets: SampleMemberPet[]
}

/** The full internal group as the real source would return it server-side. */
export interface SampleGroup {
  group_id: string
  share_token: string
  zoho_flight_group_record_id: string
  status: PublicFlightState
  route: {
    origin_city: string
    destination_city: string
    // Withheld publicly — present to prove the filter drops them.
    origin_airport_code: string
    destination_airport_code: string
  }
  estimated_date_range: { earliest_date: string | null; latest_date: string | null }
  /**
   * Null until an operator quotes (client, 2026-09-09). The `forming` fixtures
   * carry null so the previews exercise both branches: the pending placeholder
   * on a labelled row, and the dropped segment in an inline meta run.
   */
  aircraft_category: string | null
  spaces_total: number
  spaces_remaining: number
  members: SampleMember[]
  // Withheld publicly — present to prove the filter drops them.
  operator_name: string
  tail_number: string
  fbo: string
  departure_time: string
  whole_flight_price_usd: number
}

const SAMPLE_GROUPS: SampleGroup[] = [
  {
    group_id: '202606-SFO-JFK-01',
    share_token: 'SFO-JFK-202606-K3F9M2',
    zoho_flight_group_record_id: '6216334000003678001',
    status: 'filling',
    route: {
      origin_city: 'San Francisco, California, United States',
      destination_city: 'New York, New York, United States',
      origin_airport_code: 'KSFO',
      destination_airport_code: 'KJFK',
    },
    estimated_date_range: { earliest_date: '2026-06-18', latest_date: '2026-06-18' },
    aircraft_category: 'Light Jet',
    spaces_total: 4,
    spaces_remaining: 1,
    members: [
      { flight_group_member_id: 'fgm_1001', name: 'James Calder', email: 'james@example.com', role: 'group_organizer', pets: [{ type: 'dog' }] },
      { flight_group_member_id: 'fgm_1002', name: 'Daniel Reyes', email: 'daniel@example.com', role: 'joiner', pets: [{ type: 'cat' }] },
      { flight_group_member_id: 'fgm_1003', name: 'Margot Davies', email: 'margot@example.com', role: 'joiner', pets: [{ type: 'dog' }] },
    ],
    operator_name: 'SkyBridge Aviation',
    tail_number: 'N182PA',
    fbo: 'Signature Flight Support, San Carlos',
    departure_time: '2026-06-18T09:30:00-07:00',
    whole_flight_price_usd: 30400,
  },
  {
    group_id: '202607-SQL-OPF-02',
    share_token: 'SQL-OPF-202607-Q2Y8RZ',
    zoho_flight_group_record_id: '6216334000003678002',
    status: 'forming',
    route: {
      origin_city: 'San Carlos, California, United States',
      destination_city: 'Miami, Florida, United States',
      origin_airport_code: 'KSQL',
      destination_airport_code: 'KOPF',
    },
    estimated_date_range: { earliest_date: '2026-07-12', latest_date: '2026-07-17' },
    // Forming: no operator quote yet, so no aircraft.
    aircraft_category: null,
    spaces_total: 6,
    spaces_remaining: 5,
    members: [
      { flight_group_member_id: 'fgm_2001', name: 'Elena Marsh', email: 'elena@example.com', role: 'group_organizer', pets: [] },
    ],
    operator_name: 'Coastal Jets',
    tail_number: 'N44CJ',
    fbo: 'Signature, San Carlos',
    departure_time: '2026-07-12T08:00:00-07:00',
    whole_flight_price_usd: 41000,
  },
  {
    group_id: '202608-TEB-PBI-03',
    share_token: 'TEB-PBI-202608-FULL01',
    zoho_flight_group_record_id: '6216334000003678003',
    status: 'full',
    route: {
      origin_city: 'Teterboro, New Jersey, United States',
      destination_city: 'West Palm Beach, Florida, United States',
      origin_airport_code: 'KTEB',
      destination_airport_code: 'KPBI',
    },
    estimated_date_range: { earliest_date: '2026-08-05', latest_date: '2026-08-05' },
    aircraft_category: 'Midsize Jet',
    spaces_total: 6,
    spaces_remaining: 0,
    members: [
      { flight_group_member_id: 'fgm_3001', name: 'A', email: 'a@example.com', role: 'group_organizer', pets: [{ type: 'dog' }] },
      { flight_group_member_id: 'fgm_3002', name: 'B', email: 'b@example.com', role: 'joiner', pets: [{ type: 'dog' }] },
      { flight_group_member_id: 'fgm_3003', name: 'C', email: 'c@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'fgm_3004', name: 'D', email: 'd@example.com', role: 'joiner', pets: [{ type: 'cat' }] },
      { flight_group_member_id: 'fgm_3005', name: 'E', email: 'e@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'fgm_3006', name: 'F', email: 'f@example.com', role: 'joiner', pets: [] },
    ],
    operator_name: 'Atlantic Air Charter',
    tail_number: 'N720AA',
    fbo: 'Meridian, Teterboro',
    departure_time: '2026-08-05T10:00:00-04:00',
    whole_flight_price_usd: 58000,
  },
  // M2 Mock Data — Test all 19 screens
  // Frame 10: Forming (LoggedInFlightDetailPage)
  {
    group_id: '202609-SFO-LAX-ABC123',
    share_token: 'M2-FORMING-001',
    zoho_flight_group_record_id: 'mock-forming-001',
    status: 'forming',
    route: {
      origin_city: 'San Francisco',
      destination_city: 'Los Angeles',
      origin_airport_code: 'SFO',
      destination_airport_code: 'LAX',
    },
    estimated_date_range: { earliest_date: '2026-09-15', latest_date: '2026-09-22' },
    // Forming: no operator quote yet, so no aircraft. This is the fixture the
    // group-detail forming previews read, so /preview/60 shows the placeholder.
    aircraft_category: null,
    spaces_total: 6,
    spaces_remaining: 5,
    members: [{ flight_group_member_id: 'mock-001', name: 'Sarah Chen', email: 'sarah@example.com', role: 'group_organizer', pets: [] }],
    operator_name: 'AeroOS Test',
    tail_number: 'N12345',
    fbo: 'Test FBO',
    departure_time: '2026-09-15T10:00:00-07:00',
    whole_flight_price_usd: 30000,
  },
  // Frame 11: Filling
  {
    group_id: '202609-SFO-LAX-ABC123',
    share_token: 'M2-FILLING-001',
    zoho_flight_group_record_id: 'mock-filling-001',
    status: 'filling',
    route: {
      origin_city: 'San Francisco',
      destination_city: 'Los Angeles',
      origin_airport_code: 'SFO',
      destination_airport_code: 'LAX',
    },
    estimated_date_range: { earliest_date: '2026-09-15', latest_date: '2026-09-22' },
    aircraft_category: 'Citation CJ3+',
    spaces_total: 6,
    spaces_remaining: 3,
    members: [
      { flight_group_member_id: 'mock-001', name: 'Sarah Chen', email: 'sarah@example.com', role: 'group_organizer', pets: [] },
      { flight_group_member_id: 'mock-002', name: 'Michael Park', email: 'michael@example.com', role: 'joiner', pets: [{ type: 'dog' }] },
      { flight_group_member_id: 'mock-003', name: 'Jessica Wong', email: 'jessica@example.com', role: 'joiner', pets: [] },
    ],
    operator_name: 'AeroOS Test',
    tail_number: 'N12345',
    fbo: 'Test FBO',
    departure_time: '2026-09-15T10:00:00-07:00',
    whole_flight_price_usd: 30000,
  },
  // Frame 12: Full
  {
    group_id: '202609-SFO-LAX-ABC123',
    share_token: 'M2-FULL-001',
    zoho_flight_group_record_id: 'mock-full-001',
    status: 'full',
    route: {
      origin_city: 'San Francisco',
      destination_city: 'Los Angeles',
      origin_airport_code: 'SFO',
      destination_airport_code: 'LAX',
    },
    estimated_date_range: { earliest_date: '2026-09-15', latest_date: '2026-09-22' },
    aircraft_category: 'Citation CJ3+',
    spaces_total: 6,
    spaces_remaining: 0,
    members: [
      { flight_group_member_id: 'mock-001', name: 'Sarah Chen', email: 'sarah@example.com', role: 'group_organizer', pets: [] },
      { flight_group_member_id: 'mock-002', name: 'Michael Park', email: 'michael@example.com', role: 'joiner', pets: [{ type: 'dog' }] },
      { flight_group_member_id: 'mock-003', name: 'Jessica Wong', email: 'jessica@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-004', name: 'Alex Rivera', email: 'alex@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-005', name: 'Emma Thompson', email: 'emma@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-006', name: 'David Kim', email: 'david@example.com', role: 'joiner', pets: [] },
    ],
    operator_name: 'AeroOS Test',
    tail_number: 'N12345',
    fbo: 'Test FBO',
    departure_time: '2026-09-15T10:00:00-07:00',
    whole_flight_price_usd: 30000,
  },
  // Frame 12B: Quoting
  {
    group_id: '202609-SFO-LAX-ABC123',
    share_token: 'M2-QUOTING-001',
    zoho_flight_group_record_id: 'mock-quoting-001',
    status: 'quoting',
    route: {
      origin_city: 'San Francisco',
      destination_city: 'Los Angeles',
      origin_airport_code: 'SFO',
      destination_airport_code: 'LAX',
    },
    estimated_date_range: { earliest_date: '2026-09-15', latest_date: '2026-09-22' },
    aircraft_category: 'Citation CJ3+',
    spaces_total: 6,
    spaces_remaining: 0,
    members: [
      { flight_group_member_id: 'mock-001', name: 'Sarah Chen', email: 'sarah@example.com', role: 'group_organizer', pets: [] },
      { flight_group_member_id: 'mock-002', name: 'Michael Park', email: 'michael@example.com', role: 'joiner', pets: [{ type: 'dog' }] },
      { flight_group_member_id: 'mock-003', name: 'Jessica Wong', email: 'jessica@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-004', name: 'Alex Rivera', email: 'alex@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-005', name: 'Emma Thompson', email: 'emma@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-006', name: 'David Kim', email: 'david@example.com', role: 'joiner', pets: [] },
    ],
    operator_name: 'AeroOS Test',
    tail_number: 'N12345',
    fbo: 'Test FBO',
    departure_time: '2026-09-15T10:00:00-07:00',
    whole_flight_price_usd: 30000,
  },
  // Frame 13: Confirmed
  {
    group_id: '202609-SFO-LAX-ABC123',
    share_token: 'M2-CONFIRMED-001',
    zoho_flight_group_record_id: 'mock-confirmed-001',
    status: 'confirmed',
    route: {
      origin_city: 'San Francisco',
      destination_city: 'Los Angeles',
      origin_airport_code: 'SFO',
      destination_airport_code: 'LAX',
    },
    estimated_date_range: { earliest_date: '2026-09-15', latest_date: '2026-09-22' },
    aircraft_category: 'Citation CJ3+',
    spaces_total: 6,
    spaces_remaining: 0,
    members: [
      { flight_group_member_id: 'mock-001', name: 'Sarah Chen', email: 'sarah@example.com', role: 'group_organizer', pets: [] },
      { flight_group_member_id: 'mock-002', name: 'Michael Park', email: 'michael@example.com', role: 'joiner', pets: [{ type: 'dog' }] },
      { flight_group_member_id: 'mock-003', name: 'Jessica Wong', email: 'jessica@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-004', name: 'Alex Rivera', email: 'alex@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-005', name: 'Emma Thompson', email: 'emma@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-006', name: 'David Kim', email: 'david@example.com', role: 'joiner', pets: [] },
    ],
    operator_name: 'AeroOS Test',
    tail_number: 'N12345',
    fbo: 'Test FBO',
    departure_time: '2026-09-15T10:00:00-07:00',
    whole_flight_price_usd: 30000,
  },
  // Frames 14-16: Closed
  {
    group_id: '202609-SFO-LAX-ABC123',
    share_token: 'M2-CLOSED-001',
    zoho_flight_group_record_id: 'mock-closed-001',
    status: 'closed',
    route: {
      origin_city: 'San Francisco',
      destination_city: 'Los Angeles',
      origin_airport_code: 'SFO',
      destination_airport_code: 'LAX',
    },
    estimated_date_range: { earliest_date: '2026-09-15', latest_date: '2026-09-22' },
    aircraft_category: 'Citation CJ3+',
    spaces_total: 6,
    spaces_remaining: 0,
    members: [
      { flight_group_member_id: 'mock-001', name: 'Sarah Chen', email: 'sarah@example.com', role: 'group_organizer', pets: [] },
      { flight_group_member_id: 'mock-002', name: 'Michael Park', email: 'michael@example.com', role: 'joiner', pets: [{ type: 'dog' }] },
      { flight_group_member_id: 'mock-003', name: 'Jessica Wong', email: 'jessica@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-004', name: 'Alex Rivera', email: 'alex@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-005', name: 'Emma Thompson', email: 'emma@example.com', role: 'joiner', pets: [] },
      { flight_group_member_id: 'mock-006', name: 'David Kim', email: 'david@example.com', role: 'joiner', pets: [] },
    ],
    operator_name: 'AeroOS Test',
    tail_number: 'N12345',
    fbo: 'Test FBO',
    departure_time: '2026-09-15T14:30:00-07:00',
    whole_flight_price_usd: 30000,
  },
]

/**
 * Resolve a group from its share token — SERVER-ONLY. Swap this one function
 * for the real AeroOS lookup when it lands; the relay and filter don't change.
 * Returns null for a stale, closed, or unknown token → the page shows Not found.
 */
export function resolveGroupByToken(token: string): SampleGroup | null {
  return SAMPLE_GROUPS.find((g) => g.share_token === token) ?? null
}

/**
 * Resolve a group by its group id — SERVER-ONLY. Used by the lead write, which
 * carries the group_id rather than the share token. Same swap-later seam.
 */
export function resolveGroupById(groupId: string): SampleGroup | null {
  return SAMPLE_GROUPS.find((g) => g.group_id === groupId) ?? null
}
