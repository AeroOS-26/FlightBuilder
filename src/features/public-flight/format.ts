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
