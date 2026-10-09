/**
 * Absent is `null`, never an empty string.
 *
 * Settled by the client on 2026-09-29, against the 2026-09-16 contract:
 * *"Where a value is absent, send null rather than an empty string, on every
 * event."* Zoho treats the two differently, and Vivek held his mapping on it
 * rather than working around it, so this is not cosmetic — an empty string
 * reads as a real answer of "nothing", while null reads as "not known".
 *
 * This is the same convention the contract already applies to
 * `aircraft_category`, `origin_airport_code`, the unused date pair and `phone`
 * (2026-08-19: always sent, null when unknown). It now covers the rest.
 *
 * The key is still always sent. `undefined` would be dropped by
 * `JSON.stringify`, turning an explicit null into an omission nobody chose —
 * the same trap the `aircraft_category` comment warns about.
 *
 * Whitespace counts as absent: a field holding only spaces was never filled in,
 * and sending `"   "` would assert a value that does not exist.
 */
export function nullIfBlank(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null
  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : null
}
