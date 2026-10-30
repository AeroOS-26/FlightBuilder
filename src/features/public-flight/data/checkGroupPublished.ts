/**
 * The submission check — server-only.
 *
 * Calls Vivek's `check_group_published` CRM Function before a join request is
 * stored. It is a stricter gate than the public read (his message,
 * 2026-10-30): it does not depend on his switch, always requires the group to
 * be published, checks the Zoho record id matches the group id, and refuses if
 * two groups share an id.
 *
 * Same wrapping as the public read: the function's return is a JSON string in
 * `details.output`, parsing to `{ group_id, published, reason }`. `published`
 * is a JSON boolean, and `reason` is null when published, otherwise one of
 * `not_published`, `group_not_found`, `id_mismatch`, `bad_request` or `error`.
 *
 * **Fails closed.** Only a literal `published: true` passes. Anything else — a
 * refusal, an unreadable answer, a timeout — refuses the join.
 */

import { serverEnv } from '@/config/serverEnv'

export type PublishedCheck =
  | { status: 'published' }
  /** Zoho answered, and the answer is no. */
  | { status: 'refused'; reason: string }
  /** No usable answer (network, timeout, bad shape, or Zoho's own `error`). */
  | { status: 'error' }

interface ZohoFunctionResponse {
  details?: { output?: string }
}

interface ParsedOutput {
  group_id?: string
  published?: unknown
  reason?: string | null
}

export async function checkGroupPublished(
  groupId: string,
  zohoRecordId: string | null,
): Promise<PublishedCheck> {
  // A switch that is on with no URL behind it must not let joins through.
  // Counsel: a missing setting must not expose the page.
  if (!serverEnv.zohoPublishedCheckUrl) return { status: 'error' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)

  try {
    const res = await fetch(serverEnv.zohoPublishedCheckUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // The record id is optional on his side; when sent he looks up by it and
      // checks it matches the group id.
      body: JSON.stringify(
        zohoRecordId
          ? { group_id: groupId, zoho_flight_group_record_id: zohoRecordId }
          : { group_id: groupId },
      ),
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

    // Strictly the boolean. The string "true" is not an answer he documented.
    if (parsed.published === true) return { status: 'published' }

    const reason = parsed.reason ?? 'unknown'
    if (reason === 'error') return { status: 'error' }
    return { status: 'refused', reason }
  } catch {
    // Network / timeout / abort.
    return { status: 'error' }
  } finally {
    clearTimeout(timer)
  }
}
