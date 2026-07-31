/**
 * Interest-lead service — the client-side writer for the MVP join page.
 *
 * Posts the lead to our own relay (POST /api/interest-lead), which forwards to
 * the CRM server-side and normalizes the response. This layer only transports:
 * it sends the request (plus the honeypot value) and returns the normalized
 * { success, lead_id } / failure shape, throwing a normalized ApiError for
 * transport/5xx failures so the mutation can drive the error and retry states.
 */

import { normalizeError } from '@/api/errors'
import type { ApiError, InterestLeadRequest, InterestLeadResponse } from '@/types'

const RELAY_ENDPOINT = '/api/interest-lead'

const RETRYABLE = new Set([408, 425, 429, 500, 502, 503, 504])

/** The submit payload: the lead fields plus the hidden honeypot value. */
export interface SubmitLeadArgs extends InterestLeadRequest {
  /** Honeypot field value — empty for real users. */
  company_website: string
}

export async function submitInterestLead(
  args: SubmitLeadArgs,
): Promise<InterestLeadResponse> {
  let res: Response
  try {
    res = await fetch(RELAY_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(args),
    })
  } catch (err) {
    throw normalizeError(err)
  }

  const data = (await res.json().catch(() => null)) as InterestLeadResponse | null

  if (!res.ok) {
    const error: ApiError = {
      status: res.status,
      message: data?.message ?? 'We couldn’t submit your request. Please try again.',
      retryable: RETRYABLE.has(res.status),
    }
    throw error
  }

  return data ?? { success: false, message: 'Unexpected response.' }
}
