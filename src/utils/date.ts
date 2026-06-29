/**
 * Date helpers for the Dates step (calendar grid, formatting) and share-link
 * tracking params. All comparisons are done at day granularity in the user's
 * local timezone. ISO strings are `yyyy-mm-dd`.
 */

/** Today's date as an ISO `yyyy-mm-dd` string (local time). */
export function todayISO(): string {
  return toISODate(new Date())
}

/** Format a Date as `yyyy-mm-dd` (local time, no timezone shift). */
export function toISODate(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Parse an ISO `yyyy-mm-dd` string into a local Date (midnight local). */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

/** True if an ISO date string is strictly before today (a past date). */
export function isPastDate(iso: string): boolean {
  return iso < todayISO()
}

/** Return a Date that is `delta` months from the first of the given month. */
export function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

/** A single day cell in the calendar grid. */
export interface CalendarDay {
  iso: string
  day: number
  /** Whether the day belongs to the displayed month (vs. spill-over). */
  inMonth: boolean
  isToday: boolean
  isPast: boolean
}

/**
 * Build a 5×7 calendar grid for the month containing `viewDate`, with weeks
 * starting on Monday to match the design (Mon…Sun headers). Months that would
 * need six rows drop the leading spillover week so the grid stays at five rows.
 */
export function buildMonthGrid(viewDate: Date): CalendarDay[] {
  const year = viewDate.getFullYear()
  const month = viewDate.getMonth()
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  // JS: 0 = Sunday … 6 = Saturday. Shift so Monday = 0.
  const leading = (first.getDay() + 6) % 7
  const weeksNeeded = Math.ceil((leading + daysInMonth) / 7)
  const rowCount = 5
  const cellCount = rowCount * 7

  let startDay = 1 - leading
  if (weeksNeeded > rowCount) {
    startDay += (weeksNeeded - rowCount) * 7
  }

  const start = new Date(year, month, startDay)
  const today = todayISO()

  const days: CalendarDay[] = []
  for (let i = 0; i < cellCount; i += 1) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    const iso = toISODate(d)
    days.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === month,
      isToday: iso === today,
      isPast: iso < today,
    })
  }
  return days
}

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
]

/** "June 19, 2026" from an ISO date string. */
export function formatLongDate(iso: string): string {
  const d = fromISODate(iso)
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** "March, 2026" label for the calendar header. */
export function formatMonthLabel(date: Date): string {
  return `${MONTHS[date.getMonth()]}, ${date.getFullYear()}`
}
