import 'server-only'

/**
 * Single-use, expiring tokens for the three link flows.
 *
 * One table serves all three (magic link, email verification, password reset).
 * Auth.js's `verification_token` shape is (identifier, expires, token) with a
 * composite primary key, so the discriminator rides on the identifier as
 * `purpose:email`. That keeps the adapter's table untouched while letting a
 * member hold, say, a live reset and a live verification at once without one
 * consuming the other.
 *
 * Three properties the milestone requires, and how each is met:
 *
 *  - **Single use.** `consumeToken` deletes by primary key and checks the row
 *    count. Deleting IS the check: two simultaneous redemptions of the same link
 *    cannot both delete one row, so only one wins. Reading then deleting would
 *    leave a race between the two statements.
 *
 *  - **Expiring.** Lifetimes come from authConfig, which is also where the
 *    on-screen copy reads them, so "works for the next 15 minutes" and the real
 *    deadline cannot drift apart.
 *
 *  - **Unguessable.** 32 bytes from the CSRF-safe random source, base64url.
 *    Only a SHA-256 hash is stored, so a database leak does not hand over live
 *    links — the same reason passwords are hashed.
 */

import { createHash, randomBytes, timingSafeEqual } from 'node:crypto'
import { pool } from './db'
import { normaliseEmail } from './members'
import {
  MAGIC_LINK_TTL_MINUTES,
  EMAIL_VERIFICATION_TTL_MINUTES,
  PASSWORD_RESET_TTL_MINUTES,
} from '../config/authConfig'

export type TokenPurpose = 'magic-link' | 'verify-email' | 'reset-password'

const TTL_MINUTES: Record<TokenPurpose, number> = {
  'magic-link': MAGIC_LINK_TTL_MINUTES,
  'verify-email': EMAIL_VERIFICATION_TTL_MINUTES,
  'reset-password': PASSWORD_RESET_TTL_MINUTES,
}

const identifierFor = (purpose: TokenPurpose, email: string) =>
  `${purpose}:${normaliseEmail(email)}`

/** Stored hashed, never in the clear. */
const hash = (raw: string) => createHash('sha256').update(raw).digest('hex')

export interface IssuedToken {
  /** The raw value for the link. Never persisted, never logged. */
  token: string
  expires: Date
}

/**
 * Issue a token, replacing any outstanding one for the same purpose and address.
 *
 * Replacing matters: "Resend" must invalidate the previous link, or a member who
 * requested twice would have two live links and the older one would still work
 * after the newer was used.
 */
export async function issueToken(
  purpose: TokenPurpose,
  email: string,
): Promise<IssuedToken> {
  const identifier = identifierFor(purpose, email)
  const raw = randomBytes(32).toString('base64url')
  const expires = new Date(Date.now() + TTL_MINUTES[purpose] * 60_000)

  await pool.query(`DELETE FROM verification_token WHERE identifier = $1`, [identifier])
  await pool.query(
    `INSERT INTO verification_token (identifier, token, expires) VALUES ($1, $2, $3)`,
    [identifier, hash(raw), expires],
  )
  return { token: raw, expires }
}

export type ConsumeResult =
  | { ok: true; email: string }
  /** Wrong, already used, or never existed — deliberately indistinguishable. */
  | { ok: false; reason: 'invalid' }
  | { ok: false; reason: 'expired' }

/**
 * Redeem a token. Deletes it whether or not it had expired, so a stale link
 * cannot be retried, and returns the address it was issued to.
 */
export async function consumeToken(
  purpose: TokenPurpose,
  email: string,
  raw: string,
): Promise<ConsumeResult> {
  if (!raw) return { ok: false, reason: 'invalid' }
  const identifier = identifierFor(purpose, email)

  // Delete-and-check: the delete is the atomic claim on the token.
  const { rows } = await pool.query(
    `DELETE FROM verification_token
      WHERE identifier = $1 AND token = $2
      RETURNING expires`,
    [identifier, hash(raw)],
  )
  if (rows.length === 0) return { ok: false, reason: 'invalid' }

  const expires = new Date(rows[0].expires as string)
  if (expires.getTime() < Date.now()) return { ok: false, reason: 'expired' }

  return { ok: true, email: normaliseEmail(email) }
}

/** Constant-time compare, for any future path that matches tokens in memory. */
export function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  if (ab.length !== bb.length) return false
  return timingSafeEqual(ab, bb)
}

/** Housekeeping — expired rows are dead weight; safe to run on any schedule. */
export async function purgeExpiredTokens(): Promise<number> {
  const { rowCount } = await pool.query(
    `DELETE FROM verification_token WHERE expires < NOW()`,
  )
  return rowCount ?? 0
}
