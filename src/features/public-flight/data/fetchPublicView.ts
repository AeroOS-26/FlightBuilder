/**
 * Real public-flight read — server-only.
 *
 * Calls the Zoho CRM Function that returns a flight's public-safe view for a
 * given group_id (the endpoint Pavan provides). Zoho already returns ONLY the
 * public_view shape — no operator, tail, airport code, pricing, or member
 * identities — so this read consumes a surface that is public-safe by contract.
 *
 * Zoho wraps the result: the function's return is a JSON string in
 * `details.output`. On a hit that parses to `{ public_view: {...} }`; on a miss
 * to `{ success: false, message: "Flight Group not found" }`. We unwrap both.
 *
 * This is the swap that replaces the sample seam. The relay, the public-safe
 * filter, and the response contract are unchanged.
 */

import { serverEnv } from '@/config/serverEnv'
import type { PublicView } from '@/types'

export type PublicViewFetch =
  | { status: 'ok'; flight: PublicView; recordId: string | null }
  | { status: 'not_found' }
  | { status: 'error' }

interface ZohoFunctionResponse {
  code?: string
  details?: { output?: string }
  message?: string
}

/**
 * The parsed shape of `details.output`. `zoho_flight_group_record_id` sits
 * alongside `public_view` (not inside it) — it is server-only and is used by
 * the lead write to attach the lead to the right Flight Group; it is never
 * forwarded to the browser by the read relay.
 */
interface ParsedOutput {
  public_view?: PublicView
  zoho_flight_group_record_id?: string
  success?: boolean
  message?: string
}

export async function fetchGroupPublicView(groupId: string): Promise<PublicViewFetch> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)

  try {
    const res = await fetch(serverEnv.zohoPublicViewUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId }),
      signal: controller.signal,
    })

    if (!res.ok) return { status: 'error' }

    const data = (await res.json()) as ZohoFunctionResponse
    const raw = data.details?.output
    if (!raw) return { status: 'error' }

    let parsed: ParsedOutput
    try {
      parsed = JSON.parse(raw) as ParsedOutput
    } catch {
      return { status: 'error' }
    }

    // Not-found: the function returns { success: false, message: "...not found" }.
    if (parsed.success === false || !parsed.public_view) {
      return { status: 'not_found' }
    }

    return {
      status: 'ok',
      flight: parsed.public_view,
      recordId: parsed.zoho_flight_group_record_id ?? null,
    }
  } catch {
    // Network / timeout / abort.
    return { status: 'error' }
  } finally {
    clearTimeout(timer)
  }
}
