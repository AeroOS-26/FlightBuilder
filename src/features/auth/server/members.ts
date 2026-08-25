import 'server-only'

/**
 * Member records — the queries behind registration, sign-in and lockout.
 *
 * All of them normalise email to lower case before touching the database.
 * Email is both our identity key and Zoho's dedup key, so "Margot@x.com" and
 * "margot@x.com" must never become two members or two Contacts.
 */

import bcrypt from 'bcryptjs'
import { pool, queryOne } from './db'
import { LOCKOUT_THRESHOLD, LOCKOUT_MINUTES } from '../config/authConfig'

export interface MemberRow {
  id: number
  name: string | null
  email: string
  emailVerified: Date | null
  password_hash: string | null
  phone: string | null
  account_id: string | null
  zoho_contact_id: string | null
  failed_attempts: number
  locked_until: Date | null
}

const BCRYPT_ROUNDS = 12

export const normaliseEmail = (email: string) => email.trim().toLowerCase()

export function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_ROUNDS)
}

/**
 * The account id is issued in the payload contract's form: `acct_` followed by
 * a number (acct_5001, acct_5002, …).
 *
 * This is the same value that goes out as `account_id` on every member object
 * AND the same value frame 35 displays — one concept, not two. Frame 35 shows a
 * bare digit string, which the client has confirmed is the screen being wrong;
 * the contract wins.
 *
 * It comes from a Postgres sequence rather than being generated in JS, so it is
 * unique by construction and cannot collide under concurrent signups.
 */

export function findByEmail(email: string): Promise<MemberRow | null> {
  return queryOne<MemberRow>(
    `SELECT id, name, email, "emailVerified", password_hash, phone, account_id,
            zoho_contact_id, failed_attempts, locked_until
       FROM users WHERE LOWER(email) = $1`,
    [normaliseEmail(email)],
  )
}

/**
 * Create a member. Returns null when the address is already taken, which the
 * caller renders as frame 33 rather than as an error.
 */
export async function createMember(input: {
  email: string
  password: string
  name?: string
}): Promise<MemberRow | null> {
  const email = normaliseEmail(input.email)
  const hash = await hashPassword(input.password)
  const { rows } = await pool.query(
    `INSERT INTO users (email, name, password_hash, account_id)
     VALUES ($1, $2, $3, 'acct_' || nextval('account_id_seq'))
     ON CONFLICT (LOWER(email)) DO NOTHING
     RETURNING id, name, email, "emailVerified", password_hash, phone, account_id,
               zoho_contact_id, failed_attempts, locked_until`,
    [email, input.name ?? null, hash],
  )
  return (rows[0] as MemberRow | undefined) ?? null
}

export function isLocked(member: MemberRow): boolean {
  return Boolean(member.locked_until && member.locked_until.getTime() > Date.now())
}

/**
 * Record a failed sign-in, locking the account once the threshold is reached.
 * Frame 32 variant 3 draws the locked state; the numbers behind it are ours
 * until the client rules on them.
 */
export async function registerFailedAttempt(memberId: number): Promise<void> {
  await pool.query(
    `UPDATE users
        SET failed_attempts = failed_attempts + 1,
            locked_until = CASE
              WHEN failed_attempts + 1 >= $2 THEN NOW() + ($3 || ' minutes')::interval
              ELSE locked_until
            END
      WHERE id = $1`,
    [memberId, LOCKOUT_THRESHOLD, String(LOCKOUT_MINUTES)],
  )
}

/** Clear the counter after a successful sign-in or a completed reset. */
export async function clearFailedAttempts(memberId: number): Promise<void> {
  await pool.query(
    `UPDATE users SET failed_attempts = 0, locked_until = NULL WHERE id = $1`,
    [memberId],
  )
}

export async function verifyPassword(
  member: MemberRow,
  plain: string,
): Promise<boolean> {
  // A member who has only ever used a magic link has no hash to compare.
  if (!member.password_hash) return false
  return bcrypt.compare(plain, member.password_hash)
}

export async function setPassword(memberId: number, plain: string): Promise<void> {
  const hash = await hashPassword(plain)
  await pool.query(
    `UPDATE users SET password_hash = $2, failed_attempts = 0, locked_until = NULL
      WHERE id = $1`,
    [memberId, hash],
  )
}

export async function markEmailVerified(memberId: number): Promise<void> {
  await pool.query(
    `UPDATE users SET "emailVerified" = NOW() WHERE id = $1 AND "emailVerified" IS NULL`,
    [memberId],
  )
}
