/**
 * Lead-write seam — server-only.
 *
 * Forwards an interest lead to the CRM. It POSTs the `interest_lead.created`
 * event to the shared `aeroos` Deluge function (the same webhook that handles
 * flight-group creation and member.joined — it routes on the event field),
 * which creates a Lead and attaches it to the Flight Group via the record id,
 * then normalizes the response to { success, lead_id }. When no endpoint
 * resolves it falls back to a stub that accepts the lead and returns a
 * placeholder id, so local dev / previews work without the endpoint.
 */

import { serverEnv, isLeadWriteConfigured, leadWriteUrl } from '@/config/serverEnv'

/** The `interest_lead.created` event, shaped per contract section 5. */
export interface InterestLeadEvent {
  source: 'mvp_join_page'
  group_id: string
  zoho_flight_group_record_id: string
  lead: {
    name: string
    email: string
    phone: string | null
    /** Optional free-text pet note; null when not provided. */
    pet: string | null
  }
}

/** Normalized upstream result the API route maps to its response. */
export interface LeadWriteResult {
  success: boolean
  lead_id?: string
  message?: string
}

/** Zoho wraps a function's return as a JSON string in details.output. */
interface ZohoFunctionResponse {
  code?: string
  details?: { output?: string }
  message?: string
}

interface ParsedLeadOutput {
  success?: boolean
  lead_id?: string
  message?: string
}

export async function forwardInterestLead(
  event: InterestLeadEvent,
): Promise<LeadWriteResult> {
  const payload = {
    event: 'interest_lead.created' as const,
    source: event.source,
    group_id: event.group_id,
    zoho_flight_group_record_id: event.zoho_flight_group_record_id,
    lead: event.lead,
  }

  // No endpoint configured → stub: accept and return a placeholder id.
  if (!isLeadWriteConfigured()) {
    return { success: true, lead_id: 'lead_pending_endpoint' }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)
  try {
    const res = await fetch(leadWriteUrl(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    })
    if (!res.ok) {
      return { success: false, message: 'The lead service rejected the request.' }
    }

    const data = (await res.json()) as ZohoFunctionResponse
    // Zoho functions wrap the real return in details.output (a JSON string);
    // some return the shape at the top level. Handle both.
    let parsed: ParsedLeadOutput = {}
    if (data.details?.output) {
      try {
        parsed = JSON.parse(data.details.output) as ParsedLeadOutput
      } catch {
        parsed = {}
      }
    } else {
      parsed = data as ParsedLeadOutput
    }

    if (parsed.success === false) {
      return { success: false, message: parsed.message ?? 'Lead was not accepted.' }
    }
    return { success: true, lead_id: parsed.lead_id }
  } catch {
    return { success: false, message: 'Could not reach the lead service.' }
  } finally {
    clearTimeout(timer)
  }
}
