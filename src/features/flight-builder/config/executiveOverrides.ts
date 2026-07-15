/**
 * Executive-field override table (curated judgment layer).
 *
 * The Route picker resolves airports globally via radius search over the
 * OurAirports dataset. On top of that baseline, this table is the client's
 * hand-tuned override for the markets they serve: for a given metro it names
 * the executive field(s) to prioritise (primary first) and the main commercial
 * field shown only as the "lock to a specific airport" opt-out.
 *
 * Coverage here is intentionally US + Central America for now (the curated
 * markets). Metros outside this list still resolve fine from the radius search
 * and the GA/executive baseline — they just lack a hand-tuned override until
 * one is added. Expandable: add an entry to extend curation to a new metro.
 *
 * Source: client seed mapping (Charles validating; values may receive small
 * corrections, but the structure is stable). Codes are ICAO to match the
 * dataset's primary identifier; see exec/commercial notes per row.
 */

export interface ExecutiveOverride {
  /** Metro label for matching/diagnostics, e.g. "Miami, FL". */
  metro: string
  /** Lower-cased aliases the typed query can match this metro on. */
  match: string[]
  /** Executive field ICAO codes, primary first (the recommended routing). */
  executive: string[]
  /** Main commercial field ICAO code — shown only as the opt-out. */
  commercial: string
  /** ISO country for disambiguation. */
  country: string
  /**
   * Optional metro anchor coordinates. Provide these where OurAirports labels
   * the metro's fields under varying municipalities (e.g. Panama City fields
   * sit under "Albrook"/"Tocumen"/"Panamá City"), so the radius search can
   * still center on the right place. The override's primary executive field is
   * used as the anchor when these are omitted.
   */
  anchor?: { lat: number; lng: number }
}

/**
 * US — served / likely metros, then Central America relocation corridors.
 * (Codes use ICAO, e.g. KOPF, to align with the dataset's primary identifier.)
 */
export const EXECUTIVE_OVERRIDES: readonly ExecutiveOverride[] = [
  // --- United States ---
  { metro: 'Miami, FL', match: ['miami'], executive: ['KOPF', 'KTMB'], commercial: 'KMIA', country: 'United States' },
  { metro: 'New York, NY', match: ['new york', 'nyc', 'manhattan'], executive: ['KTEB', 'KFRG'], commercial: 'KJFK', country: 'United States' },
  { metro: 'Los Angeles, CA', match: ['los angeles', 'la'], executive: ['KVNY', 'KHHR'], commercial: 'KLAX', country: 'United States' },
  { metro: 'San Francisco Bay, CA', match: ['san francisco', 'bay area', 'sf'], executive: ['KSQL', 'KHWD'], commercial: 'KSFO', country: 'United States' },
  { metro: 'Dallas, TX', match: ['dallas'], executive: ['KDAL', 'KADS'], commercial: 'KDFW', country: 'United States' },
  { metro: 'Houston, TX', match: ['houston'], executive: ['KSGR', 'KHOU'], commercial: 'KIAH', country: 'United States' },
  { metro: 'Chicago, IL', match: ['chicago'], executive: ['KPWK', 'KMDW'], commercial: 'KORD', country: 'United States' },
  { metro: 'Denver, CO', match: ['denver'], executive: ['KAPA', 'KBJC'], commercial: 'KDEN', country: 'United States' },
  { metro: 'Phoenix, AZ', match: ['phoenix'], executive: ['KSDL', 'KDVT'], commercial: 'KPHX', country: 'United States' },
  { metro: 'Atlanta, GA', match: ['atlanta'], executive: ['KPDK', 'KFTY'], commercial: 'KATL', country: 'United States' },
  { metro: 'Seattle, WA', match: ['seattle'], executive: ['KBFI', 'KRNT'], commercial: 'KSEA', country: 'United States' },
  { metro: 'Las Vegas, NV', match: ['las vegas', 'vegas'], executive: ['KHND', 'KVGT'], commercial: 'KLAS', country: 'United States' },

  // --- Central America — relocation corridors (Perro Air core) ---
  { metro: 'San José, Costa Rica', match: ['san jose', 'san josé'], executive: ['MRPV'], commercial: 'MROC', country: 'Costa Rica' },
  { metro: 'Liberia, Costa Rica', match: ['liberia', 'guanacaste'], executive: ['MRLB'], commercial: 'MRLB', country: 'Costa Rica' },
  { metro: 'Panama City, Panama', match: ['panama'], executive: ['MPMG'], commercial: 'MPTO', country: 'Panama' },
  { metro: 'Guatemala City, Guatemala', match: ['guatemala'], executive: ['MGGT'], commercial: 'MGGT', country: 'Guatemala' },
  { metro: 'San Salvador, El Salvador', match: ['san salvador', 'salvador'], executive: ['MSSS'], commercial: 'MSLP', country: 'El Salvador' },
  { metro: 'Managua, Nicaragua', match: ['managua'], executive: ['MNMG'], commercial: 'MNMG', country: 'Nicaragua' },
  { metro: 'Tegucigalpa, Honduras', match: ['tegucigalpa'], executive: ['MHTG'], commercial: 'MHTG', country: 'Honduras' },
] as const

/** Find the override whose aliases match the typed query, if any. */
export function findOverride(query: string): ExecutiveOverride | undefined {
  const q = query.trim().toLowerCase()
  if (!q) return undefined
  return EXECUTIVE_OVERRIDES.find((o) => o.match.some((m) => q.includes(m) || m.includes(q)))
}
