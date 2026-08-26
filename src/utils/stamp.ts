/**
 * "2026-08-26 11:42 UTC" — the timestamp format the account frames use.
 *
 * Rendered in UTC deliberately, and labelled as such. These stamps mark
 * security events — when an address was verified, when a password changed — and
 * a member reading one may well be checking it against something that happened
 * on another device in another timezone. A local-time rendering would silently
 * differ between the two.
 */
export function formatStampUtc(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  const pad = (n: number) => String(n).padStart(2, '0')
  return (
    `${date.getUTCFullYear()}-${pad(date.getUTCMonth() + 1)}-${pad(date.getUTCDate())} ` +
    `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())} UTC`
  )
}
