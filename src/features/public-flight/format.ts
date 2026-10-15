/**
 * Display formatting for the public join page.
 *
 * Public copy shows a metro/city and an estimated date range — never an exact
 * time, airport code, or per-person figure. These helpers keep that vocabulary
 * in one place.
 */

import { formatLongDate, fromISODate } from '@/utils/date'
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
 * Sits beside the COST row's "Estimate Pending" and says the same thing: that
 * nothing is settled.
 *
 * Was "Confirmed at quote" from 2026-09-10 until 2026-10-14. That string was
 * ours rather than the design's — written for a labelled AIRCRAFT row that
 * would otherwise render blank — and nobody approved the word, which is why
 * counsel caught it: Workflow Spec 4.8 bars "confirmed" before a binding
 * carrier commitment. The client searched the Flight Club page in Figma and
 * confirmed the old string is not drawn anywhere, so no frame needed changing.
 *
 * Replacement supplied by the client, 2026-10-14. One constant, so it changes
 * the join, under-review and approved screens, the group page and the public
 * card together.
 */
export const AIRCRAFT_PENDING_LABEL = 'Pending operator quote'

/**
 * "2026-06-18" -> "June 18, 2026", the form every approval frame writes dates in.
 *
 * Four screens had their own copy of this and one of them was `en-GB`, so frame
 * 49 read "18 June 2026" where its neighbours read "June 18, 2026". A value
 * that is not a date is returned untouched rather than rendered as
 * "Invalid Date".
 *
 * **A date-only string is read as a local date, not a UTC instant.** `new
 * Date('2026-06-18')` is midnight *UTC* by specification, so formatting it in a
 * zone behind UTC gave the 17th — and these callers are client components, so
 * the zone is the reader's, not the server's. Every US viewer was one day out
 * on "Asked", "Joined" and the departure rows. `fromISODate` reads the parts
 * instead, which is what `formatLongDate` beside it has always done; the two
 * now agree, where before a range row and an "Asked" row on the same screen
 * could disagree by a day.
 *
 * Callers pass both shapes — `join_request.requested_at` arrives sliced to ten
 * characters, `flight_group_member.joined_at` as a full ISO timestamp — so the
 * form is detected rather than assumed. A timestamp names its own instant and
 * is left to `Date`.
 */
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/

export function readableDate(value: string): string {
  const d = DATE_ONLY.test(value.trim()) ? fromISODate(value.trim()) : new Date(value)
  return Number.isNaN(d.getTime())
    ? value
    : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
}

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
