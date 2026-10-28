import 'server-only'

import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

import type { Traveler } from '@/types'

/**
 * Encryption of the Stage 1 identity fields, at the storage boundary.
 *
 * Approved by Chuck on 2026-10-27 with the least-privilege database role, ten
 * hours for the pair, inside the production release (§47).
 *
 * ── What this is for ────────────────────────────────────────────────────────
 *
 * `join_request.travelers` holds, per traveller, the name exactly as it appears
 * on a passport, an email address, a nationality and a date of birth. That is
 * the most sensitive record this product keeps, and it is kept so that a person
 * at Perro Air can review a request by hand.
 *
 * The threat this answers is a **database read**: a dump, a backup, a mistaken
 * share of a connection string, or the read-only reporting role that is the
 * other half of the same approval. Encrypting here means SELECT on the table
 * returns sealed strings, and reading the identities needs the key as well as
 * the row. It is not a defence against a compromised application: the running
 * app holds the key, by necessity, because it is the thing that writes.
 *
 * ── Why it is transparent, and why that is the whole design ─────────────────
 *
 * Sealed on INSERT in `submitJoinRequest`, opened in `toRequest`, which is the
 * single mapper every read of this table goes through. Nothing else in the
 * application changes: the organiser's screens read `travelers.length` and the
 * outbound event reads the party, and both keep working on plaintext exactly as
 * they did. One encrypt point and one decrypt point is the property that makes
 * this reviewable — a second decrypt path is how half of a table ends up in the
 * clear.
 *
 * ── Failure is loud, deliberately ───────────────────────────────────────────
 *
 * A sealed value that will not open throws, and the throw is left to propagate.
 * The alternative — logging and handing back an empty field — puts a blank
 * passport name in front of the person doing the manual review, or sends one to
 * the CRM, and neither reads as a fault. A screen that fails is noticed in
 * preview; an empty passport field is noticed by nobody until it matters.
 *
 * Rows written before this shipped hold plaintext and are passed through
 * untouched: the prefix below is what tells the two apart, and there is no
 * migration because the fields are inside a `JSONB` column.
 */

/**
 * The fields sealed, and only these.
 *
 * `isAdult`, `guardianBookingForMinor` and `passportValidSixMonths` stay in the
 * clear. They are three booleans the person ticked about their own
 * completeness, they identify nobody on their own, and leaving them readable is
 * what lets the Stage 1 review be queried at all — "how many requests are
 * missing an age answer" is a question worth being able to ask of the table.
 *
 * `id` and `isFounder` are structural. Sealing them would break the array's own
 * shape for no gain.
 */
const SEALED_FIELDS = ['name', 'email', 'nationality', 'dateOfBirth'] as const

type SealedField = (typeof SEALED_FIELDS)[number]

/**
 * `enc.v1.<iv>.<tag>.<ciphertext>`, each part base64url.
 *
 * The prefix carries a version because the day this changes cipher or key
 * derivation, the rows already written must still open — the same reason the
 * acknowledgment archives its wording by version rather than editing in place.
 * base64url has no dots, so a dot is an unambiguous separator and a plaintext
 * value can never be mistaken for an envelope: no name, email, nationality or
 * date this product accepts begins "enc.v1.".
 */
const PREFIX = 'enc.v1.'

const ALGORITHM = 'aes-256-gcm'
const IV_BYTES = 12
const KEY_BYTES = 32

let cachedKey: Buffer | null | undefined
let warnedAboutMissingKey = false

/**
 * The key, or null when none is configured.
 *
 * Base64 or hex, and it must decode to exactly 32 bytes — a short key that
 * silently zero-pads is the classic way to ship encryption that is not
 * encryption, so a wrong length throws rather than being accepted.
 *
 * Generate one with: `openssl rand -base64 32`
 */
function key(): Buffer | null {
  if (cachedKey !== undefined) return cachedKey

  const raw = process.env.IDENTITY_ENCRYPTION_KEY?.trim()
  if (!raw) {
    cachedKey = null
    return cachedKey
  }

  const decoded = /^[0-9a-fA-F]{64}$/.test(raw)
    ? Buffer.from(raw, 'hex')
    : Buffer.from(raw, 'base64')

  if (decoded.length !== KEY_BYTES) {
    throw new Error(
      `IDENTITY_ENCRYPTION_KEY must decode to ${KEY_BYTES} bytes, got ${decoded.length}. ` +
        'Generate one with: openssl rand -base64 32',
    )
  }

  cachedKey = decoded
  return cachedKey
}

/** Exported for tests and for the one-off recovery script; not for routes. */
export function identityEncryptionConfigured(): boolean {
  return key() !== null
}

/**
 * Seal one field.
 *
 * The field name is the additional authenticated data, so a ciphertext cannot
 * be lifted out of `nationality` and dropped into `dateOfBirth` — the tag will
 * not verify. It costs nothing and it closes the one rearrangement attack that
 * a row-level write would otherwise allow.
 */
function seal(field: SealedField, value: string, k: Buffer): string {
  const iv = randomBytes(IV_BYTES)
  const cipher = createCipheriv(ALGORITHM, k, iv, { authTagLength: 16 })
  cipher.setAAD(Buffer.from(field, 'utf8'))
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  return [
    PREFIX.slice(0, -1),
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.')
}

function open(field: SealedField, envelope: string, k: Buffer): string {
  const parts = envelope.split('.')
  if (parts.length !== 5) {
    throw new Error(`Malformed sealed ${field}: expected 5 envelope parts, got ${parts.length}`)
  }
  const [, , ivPart, tagPart, bodyPart] = parts as [string, string, string, string, string]

  const decipher = createDecipheriv(ALGORITHM, k, Buffer.from(ivPart, 'base64url'), {
    authTagLength: 16,
  })
  decipher.setAAD(Buffer.from(field, 'utf8'))
  decipher.setAuthTag(Buffer.from(tagPart, 'base64url'))
  return Buffer.concat([
    decipher.update(Buffer.from(bodyPart, 'base64url')),
    decipher.final(),
  ]).toString('utf8')
}

function isSealed(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX)
}

/**
 * Called when a key is needed and none is set.
 *
 * Production refuses. Everywhere else warns once and carries on in the clear,
 * which is the same shape as `isZohoConfigured()`'s dev guard: a developer
 * without the client's secrets can still run the flow end to end, and the
 * warning is there so nobody mistakes a local run for an encrypted one.
 */
function requireKeyOrPassThrough(what: string): Buffer | null {
  const k = key()
  if (k) return k

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      `IDENTITY_ENCRYPTION_KEY is not set, so ${what} cannot be sealed. ` +
        'Refusing rather than writing passport identities in the clear.',
    )
  }

  if (!warnedAboutMissingKey) {
    warnedAboutMissingKey = true
    console.warn(
      `[identity] IDENTITY_ENCRYPTION_KEY is not set — ${what} is being stored in the clear. ` +
        'Development only; production refuses.',
    )
  }
  return null
}

/**
 * Seal the identity fields on the way into the database.
 *
 * Returns a new array; the caller's objects are not mutated, because the same
 * travellers go on to the outbound event in plaintext and a shared mutation
 * would send sealed values to the CRM.
 */
export function sealTravelerIdentities(travelers: readonly Traveler[]): Traveler[] {
  if (travelers.length === 0) return []
  const k = requireKeyOrPassThrough('traveller identities')
  if (!k) return travelers.map((traveler) => ({ ...traveler }))

  return travelers.map((traveler) => {
    const out: Traveler = { ...traveler }
    for (const field of SEALED_FIELDS) {
      const value = out[field]
      // Already sealed values are left alone: re-sealing would nest envelopes
      // and the row would need two passes to open.
      if (typeof value === 'string' && value.length > 0 && !isSealed(value)) {
        out[field] = seal(field, value, k)
      }
    }
    return out
  })
}

/**
 * Open the identity fields on the way out.
 *
 * A plaintext value is a row written before this shipped and is returned as it
 * is. A sealed value with no key configured throws: carrying on would hand the
 * caller an envelope string as though it were a name.
 */
export function openTravelerIdentities(travelers: readonly Traveler[]): Traveler[] {
  if (travelers.length === 0) return []
  if (!travelers.some((t) => SEALED_FIELDS.some((f) => isSealed(t[f])))) {
    return travelers.map((traveler) => ({ ...traveler }))
  }

  const k = key()
  if (!k) {
    throw new Error(
      'join_request.travelers holds sealed identity fields but IDENTITY_ENCRYPTION_KEY is not set.',
    )
  }

  return travelers.map((traveler) => {
    const out: Traveler = { ...traveler }
    for (const field of SEALED_FIELDS) {
      const value = out[field]
      if (isSealed(value)) out[field] = open(field, value, k)
    }
    return out
  })
}
