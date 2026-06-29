/**
 * Typed, validated access to environment configuration.
 *
 * All env reads go through here so the rest of the app never touches
 * `process.env` directly. Next.js only exposes vars prefixed with
 * `NEXT_PUBLIC_` to the browser bundle.
 */

interface AppEnv {
  /** Base URL for the backend API (Zoho integration layer). */
  apiBaseUrl: string
  /** Base URL used to build share links, e.g. the public app origin. */
  shareBaseUrl: string
  /** Active brand id, drives the theme. Defaults to "perro-air". */
  brand: string
  /** Request timeout in milliseconds. */
  apiTimeoutMs: number
}

function readString(value: string | undefined, fallback: string): string {
  return typeof value === 'string' && value.length > 0 ? value : fallback
}

function readNumber(value: string | undefined, fallback: number): number {
  const parsed = typeof value === 'string' ? Number(value) : NaN
  return Number.isFinite(parsed) ? parsed : fallback
}

/**
 * Origin used to build absolute share links. On the client we use the live
 * window origin; on the server (SSR/build) `window` is undefined, so we fall
 * back to the configured value or a safe placeholder.
 */
function defaultShareOrigin(): string {
  if (typeof window !== 'undefined') return window.location.origin
  return 'https://perroair.com'
}

export const env: AppEnv = {
  apiBaseUrl: readString(process.env.NEXT_PUBLIC_API_BASE_URL, '/api'),
  shareBaseUrl: readString(
    process.env.NEXT_PUBLIC_SHARE_BASE_URL,
    defaultShareOrigin(),
  ),
  brand: readString(process.env.NEXT_PUBLIC_BRAND, 'perro-air'),
  apiTimeoutMs: readNumber(process.env.NEXT_PUBLIC_API_TIMEOUT_MS, 15000),
}
