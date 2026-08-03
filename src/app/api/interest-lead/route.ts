/**
 * Server-side relay: POST /api/interest-lead
 *
 * The MVP join-page interest lead. The page posts here — to our own route, not
 * the CRM directly — so the destination (Zoho, Freshworks, or both) stays a
 * server-side concern behind this boundary and the frontend isn't gated on it.
 *
 * This route:
 *  - applies a lightweight per-IP rate limit to throttle rapid repeat submits,
 *  - validates the submission (name, email required; phone optional → null),
 *  - rejects bot submissions via the server-side honeypot check,
 *  - resolves the Zoho record ID server-side from the group (the visitor never
 *    sees it and holds no client-side copy),
 *  - forwards the `interest_lead.created` event to the lead endpoint,
 *  - normalizes whatever the CRM returns into { success, lead_id } / a handled
 *    failure with a message — never a bare 200.
 *
 * The lead endpoint's destination is still pending on the CRM side. Until it
 * exists, `forwardInterestLead` is the single seam that stands in for it — swap
 * that one function when the endpoint lands; the route contract stays put.
 */

import { NextResponse } from 'next/server'
import { isPublicViewConfigured } from '@/config/serverEnv'
import { forwardInterestLead } from '@/features/public-flight/data/leadWrite'
import { fetchGroupPublicView } from '@/features/public-flight/data/fetchPublicView'
import { resolveGroupById } from '@/features/public-flight/data/sampleGroups'
import { checkRateLimit, clientKeyFrom } from '@/features/public-flight/data/rateLimit'
import { groupIdFromSlug } from '@/features/public-flight/format'
import type { InterestLeadResponse } from '@/types'

/** Resolved group + its Zoho record id, from the live read or sample data. */
interface ResolvedGroup {
  group_id: string
  zoho_flight_group_record_id: string
}

/**
 * Resolve a group and its Zoho record id server-side. Live source when the read
 * endpoint is configured (same source the public page uses); sample otherwise.
 * The form sends the real group_id, but we also derive it from a slug for safety.
 */
async function resolveGroup(groupId: string): Promise<ResolvedGroup | null> {
  if (isPublicViewConfigured()) {
    const id = groupIdFromSlug(groupId)
    const res = await fetchGroupPublicView(id)
    if (res.status !== 'ok') return null
    return {
      group_id: res.flight.group_id,
      zoho_flight_group_record_id: res.recordId ?? '',
    }
  }
  const sample = resolveGroupById(groupId)
  return sample
    ? { group_id: sample.group_id, zoho_flight_group_record_id: sample.zoho_flight_group_record_id }
    : null
}

/** The name of the hidden honeypot field the form renders. */
const HONEYPOT_FIELD = 'company_website'

interface LeadRequestBody {
  name?: unknown
  email?: unknown
  phone?: unknown
  pet?: unknown
  group_id?: unknown
  /** Honeypot — a real user leaves this empty. */
  company_website?: unknown
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function fail(message: string, status: number) {
  const body: InterestLeadResponse = { success: false, message }
  return NextResponse.json(body, { status })
}

export async function POST(request: Request) {
  // Per-IP rate limit first — throttle rapid repeat submissions before any work.
  const rate = checkRateLimit(clientKeyFrom(request))
  if (!rate.allowed) {
    const body: InterestLeadResponse = {
      success: false,
      message: 'Too many requests. Please wait a moment and try again.',
    }
    return NextResponse.json(body, {
      status: 429,
      headers: { 'Retry-After': String(rate.retryAfterSec) },
    })
  }

  let body: LeadRequestBody
  try {
    body = (await request.json()) as LeadRequestBody
  } catch {
    return fail('Invalid request.', 400)
  }

  // Honeypot: a filled hidden field means a bot. Reject silently (200) and write
  // nothing — but return a lead_id shaped like a clean success so a bot diffing
  // two responses can't spot the trap.
  if (typeof body[HONEYPOT_FIELD] === 'string' && body[HONEYPOT_FIELD].trim() !== '') {
    return NextResponse.json(
      { success: true, lead_id: 'lead_ok' } satisfies InterestLeadResponse,
      { status: 200 },
    )
  }

  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim() : ''
  const phoneRaw = typeof body.phone === 'string' ? body.phone.trim() : ''
  const petRaw = typeof body.pet === 'string' ? body.pet.trim() : ''
  const groupId = typeof body.group_id === 'string' ? body.group_id.trim() : ''

  if (!name) return fail('Please enter your name.', 422)
  if (!EMAIL_RE.test(email)) return fail('Please enter a valid email.', 422)
  if (!groupId) return fail('Missing flight reference.', 422)

  // Resolve the group + its Zoho record ID server-side — the browser never holds
  // it. Live source when configured (same read as the public page), else sample.
  const resolved = await resolveGroup(groupId)
  if (!resolved) return fail('This flight is no longer available.', 404)

  const result = await forwardInterestLead({
    source: 'mvp_join_page',
    group_id: resolved.group_id,
    zoho_flight_group_record_id: resolved.zoho_flight_group_record_id,
    lead: { name, email, phone: phoneRaw || null, pet: petRaw || null },
  })

  const response: InterestLeadResponse = result.success
    ? { success: true, lead_id: result.lead_id }
    : { success: false, message: result.message ?? 'We couldn’t submit your request.' }

  return NextResponse.json(response, { status: result.success ? 200 : 502 })
}
