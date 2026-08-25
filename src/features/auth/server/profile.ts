import 'server-only'

/**
 * Member profile — travelers, pets and notification preferences (frame 31).
 *
 * These stay in the application. Confirmed with the client: travelers and pets
 * only become Zoho records when they are on a flight, carried by the existing
 * per-member `pets` array on the payload contract. So there is deliberately no
 * CRM call here, and none is missing.
 *
 * Travelers and pets are stored as JSONB rather than tables: a member edits
 * them as one set, they are always read and written whole, and their shape is
 * owned by the payload contract rather than by us. Normalising them into tables
 * would buy nothing and would have to be re-flattened on every flight create.
 */

import { pool, queryOne } from './db'
import type { Pet, Traveler } from '@/types'

export interface MemberProfile {
  travelers: Traveler[]
  pets: Pet[]
  petsEnabled: boolean
  travelReadinessAccepted: boolean
  notifyEmail: boolean
  notifySms: boolean
  notifyRoutes: boolean
  completedAt: Date | null
}

interface ProfileRow {
  travelers: Traveler[]
  pets: Pet[]
  pets_enabled: boolean
  travel_readiness_accepted: boolean
  notify_email: boolean
  notify_sms: boolean
  notify_routes: boolean
  completed_at: Date | null
}

export async function getProfile(userId: string): Promise<MemberProfile | null> {
  const row = await queryOne<ProfileRow>(
    `SELECT travelers, pets, pets_enabled, travel_readiness_accepted,
            notify_email, notify_sms, notify_routes, completed_at
       FROM member_profile WHERE user_id = $1`,
    [Number(userId)],
  )
  if (!row) return null
  return {
    travelers: row.travelers ?? [],
    pets: row.pets ?? [],
    petsEnabled: row.pets_enabled,
    travelReadinessAccepted: row.travel_readiness_accepted,
    notifyEmail: row.notify_email,
    notifySms: row.notify_sms,
    notifyRoutes: row.notify_routes,
    completedAt: row.completed_at,
  }
}

/**
 * Upsert the whole profile. Scoped by the session's user id — the caller passes
 * the viewer, never an id from the request body, so one member cannot write
 * another's profile.
 */
export async function saveProfile(
  userId: string,
  input: Omit<MemberProfile, 'completedAt'>,
): Promise<void> {
  await pool.query(
    `INSERT INTO member_profile
       (user_id, travelers, pets, pets_enabled, travel_readiness_accepted,
        notify_email, notify_sms, notify_routes, completed_at, updated_at)
     VALUES ($1, $2::jsonb, $3::jsonb, $4, $5, $6, $7, $8, NOW(), NOW())
     ON CONFLICT (user_id) DO UPDATE SET
       travelers = EXCLUDED.travelers,
       pets = EXCLUDED.pets,
       pets_enabled = EXCLUDED.pets_enabled,
       travel_readiness_accepted = EXCLUDED.travel_readiness_accepted,
       notify_email = EXCLUDED.notify_email,
       notify_sms = EXCLUDED.notify_sms,
       notify_routes = EXCLUDED.notify_routes,
       completed_at = COALESCE(member_profile.completed_at, EXCLUDED.completed_at),
       updated_at = NOW()`,
    [
      Number(userId),
      JSON.stringify(input.travelers ?? []),
      JSON.stringify(input.pets ?? []),
      input.petsEnabled,
      input.travelReadinessAccepted,
      input.notifyEmail,
      input.notifySms,
      input.notifyRoutes,
    ],
  )
}

/** The member's name also lives on `users`, so Traveler 1 stays in step. */
export async function updateMemberName(userId: string, name: string): Promise<void> {
  const trimmed = name.trim()
  if (!trimmed) return
  await pool.query(`UPDATE users SET name = $2 WHERE id = $1`, [Number(userId), trimmed])
}
