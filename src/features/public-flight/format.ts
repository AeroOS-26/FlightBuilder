/**
 * Display formatting for the public join page.
 *
 * Public copy shows a metro/city and an estimated date range — never an exact
 * time, airport code, or per-person figure. These helpers keep that vocabulary
 * in one place.
 */

import { formatLongDate } from '@/utils/date'
import type { EstimatedDateRange } from '@/types'

/** "San Francisco, California, United States" → "San Francisco". */
export function metroLabel(city: string): string {
  return city.split(',')[0]?.trim() ?? city
}

/** A single day shows once; a window shows "18 Jun – 22 Jun 2026"–style range. */
export function formatDateRange(range: EstimatedDateRange): string {
  const { earliest_date, latest_date } = range
  if (!earliest_date && !latest_date) return 'Dates flexible'
  if (earliest_date && (!latest_date || latest_date === earliest_date)) {
    return formatLongDate(earliest_date)
  }
  if (earliest_date && latest_date) {
    return `${formatLongDate(earliest_date)} – ${formatLongDate(latest_date)}`
  }
  return formatLongDate((earliest_date ?? latest_date) as string)
}

/** "1 dog", "2 dogs · 1 cat" from the fellow-pet species counts. */
export function fellowPetSummary(bySpecies: Record<string, number>): string {
  const parts = Object.entries(bySpecies)
    .filter(([, n]) => n > 0)
    .map(([species, n]) => `${n} ${species}${n === 1 ? '' : 's'}`)
  return parts.join(' · ')
}

/**
 * Aircraft category with representative examples, e.g.
 * "Light Jet (e.g. Citation CJ3, Phenom 300)". The examples reassure without
 * committing to a specific tail — the actual aircraft is confirmed later.
 */
const AIRCRAFT_EXAMPLES: Record<string, string> = {
  'Light Jet': 'Citation CJ3, Phenom 300',
  'Midsize Jet': 'Citation XLS, Learjet 60',
  'Super Midsize Jet': 'Challenger 350, Citation Longitude',
  'Heavy Jet': 'Gulfstream G450, Falcon 900',
  Turboprop: 'King Air 350, Pilatus PC-12',
}

export function aircraftExample(category: string): string {
  const eg = AIRCRAFT_EXAMPLES[category]
  return eg ? `${category} (e.g. ${eg})` : category
}

/**
 * What a labelled AIRCRAFT row shows before an operator has quoted.
 *
 * Matches the register of the neighbouring COST row ("Estimate Pending"), and
 * says the same thing the public card's subline already says underneath.
 */
export const AIRCRAFT_PENDING_LABEL = 'Confirmed at quote'

/**
 * The value for a **labelled** AIRCRAFT row or cell.
 *
 * Two treatments exist for an unknown aircraft, and which one applies is a
 * property of the surface, not of the value:
 *
 * - **Labelled row/card** — keep the row, show the pending placeholder. An
 *   empty row reads as a bug, and removing the row outright re-opens the
 *   aircraft row the client explicitly asked for.
 * - **Inline meta run** (`date · aircraft · pets`) — drop the segment and its
 *   separator. A placeholder in a terse dot-separated run is noise. Those
 *   sites filter the value out instead of calling this.
 *
 * Note `aircraftExample` deliberately still takes a non-null `string`: widening
 * it to return '' for null would let every call site keep compiling and lose
 * the type coverage that makes the nullable rollout safe.
 */
export function aircraftRowValue(category: string | null): string {
  return category ? aircraftExample(category) : AIRCRAFT_PENDING_LABEL
}

/**
 * Derive the group_id from a share slug. Same parts, reordered: the share URL
 * carries `FROM-TO-YYYYMM-TOKEN` (e.g. SQL-TEB-202608-K3F9M2) while the record's
 * group_id is `YYYYMM-FROM-TO-TOKEN` (e.g. 202608-SQL-TEB-K3F9M2). The read
 * endpoint keys on group_id, so we move the year-month segment to the front.
 *
 * Returns the token unchanged if it doesn't match the expected 4-part shape, so
 * a group_id passed directly (or an already-correct value) still works.
 */
export function groupIdFromSlug(slug: string): string {
  const parts = slug.split('-')
  if (parts.length !== 4) return slug
  const [from, to, ym, token] = parts
  // Already in group_id order (ym leads) — leave as-is.
  if (/^\d{6}$/.test(from!)) return slug
  if (!/^\d{6}$/.test(ym!)) return slug
  return `${ym}-${from}-${to}-${token}`
}
