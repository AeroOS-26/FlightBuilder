import 'server-only'

/**
 * `account.created` — section 6 of the 2026-08-19 payload contract.
 *
 * Ownership, confirmed by the client on 19 August: AeroOS emits this from the
 * auth layer at email verification, and Pavan's handler receives it the same way
 * as `flight_group.created`. Zoho cannot know a member verified, because
 * identity lives here.
 *
 * Why verification and not sign-up: the contract is explicit that an unverified
 * sign-up creates no Contact, which keeps abandoned registrations out of the CRM
 * and lines up with the Email Verified screen, where the account is described as
 * active.
 *
 * Zoho does create-or-update on email, so this is safe to send even when the
 * person already exists as a name-only traveller on someone else's flight.
 *
 * Failure is deliberately non-fatal. If the CRM write fails, the member is still
 * verified and must still be let in — their account is ours, not Zoho's. The
 * failure is reported to the caller to log, never surfaced as a broken
 * verification.
 */

import { serverEnv, isZohoConfigured } from '@/config/serverEnv'

export interface AccountCreatedEvent {
  event: 'account.created'
  account_id: string
  email: string
  phone: string | null
  name: string | null
  source: 'flight_club_registration'
  verified_at: string
  /**
   * `email_password` today. The contract reserves `google` and `apple` for when
   * social sign-in is wired, so this is a value the caller passes rather than a
   * constant — the SSO decision is still open.
   */
  created_via: 'email_password' | 'google' | 'apple'
}

export type EmitResult =
  | { ok: true }
  | { ok: false; reason: 'not-configured' | 'rejected' | 'unavailable'; message: string }

export function buildAccountCreated(input: {
  accountId: string
  email: string
  phone?: string | null
  name?: string | null
  verifiedAt?: Date
  createdVia?: AccountCreatedEvent['created_via']
}): AccountCreatedEvent {
  return {
    event: 'account.created',
    account_id: input.accountId,
    email: input.email,
    // Always present, may be null — Flight Club does not require a phone at
    // signup; it arrives later from the member profile.
    phone: input.phone?.trim() || null,
    name: input.name?.trim() || null,
    source: 'flight_club_registration',
    verified_at: (input.verifiedAt ?? new Date()).toISOString(),
    created_via: input.createdVia ?? 'email_password',
  }
}

/**
 * POST to the same `aeroos` CRM function the other events use — it routes on the
 * `event` field, which is why no new endpoint is needed.
 */
export async function emitAccountCreated(event: AccountCreatedEvent): Promise<EmitResult> {
  if (!isZohoConfigured()) {
    return {
      ok: false,
      reason: 'not-configured',
      message: 'Zoho webhook is not configured; account.created not sent.',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)
  try {
    const res = await fetch(serverEnv.zohoWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    })
    if (!res.ok) {
      return {
        ok: false,
        reason: 'rejected',
        message: `Zoho rejected account.created (${res.status}).`,
      }
    }
    return { ok: true }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      reason: 'unavailable',
      message: aborted ? 'Zoho timed out on account.created.' : 'Could not reach Zoho.',
    }
  } finally {
    clearTimeout(timer)
  }
}
