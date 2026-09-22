import 'server-only'

/**
 * The transport to Zoho's shared `aeroos` function, and the one reading of what
 * it answers.
 *
 * Every group event goes to the same webhook, and Zoho routes it on the `event`
 * field. What comes back needs care, and getting it wrong has already cost a
 * defect: Zoho answers HTTP 200 with `code: "success"` for a function that
 * *ran*, even when the function itself failed. The function's real result is a
 * JSON *string* inside `details.output`, carrying its own `success` flag. An
 * HTTP-only check reads a rejected event as delivered.
 *
 * The create relay reads the reply to decide what the member sees. The join's
 * events used to fire and forget, so nothing recorded whether Zoho took them —
 * which is exactly what could not be answered when Charles asked, 2026-09-22,
 * whether `member.joined` had landed. `sendZohoEvent` reads the reply the same
 * way and logs the outcome either way.
 */

import { serverEnv, isZohoConfigured } from '@/config/serverEnv'

/**
 * Zoho's envelope around a CRM Function call.
 *
 * `details.id` is deliberately NOT modelled: it is the Zoho *function's* id,
 * identical on every call. Reading it as a record id was the cause of the
 * duplicate-id defect raised 2026-08-10 (every flight came back with the same
 * value, because the real id was nested and never read). Leaving it off the
 * type keeps it from being reintroduced as a fallback.
 */
export interface ZohoEnvelope {
  code?: string
  message?: string
  details?: { output?: string; userMessage?: string[] }
}

/** The function's actual result, parsed out of `details.output`. */
export interface ZohoFunctionResult {
  event?: string
  /** The created Flight Group record id — what flight_group.created returns. */
  flight_group_id?: string
  /** The payload contract's name for the same value; accepted as an alias. */
  zoho_flight_group_record_id?: string
  group_id?: string
  success?: boolean
  message?: string
  members_total?: number
  members_succeeded?: number
  members_failed?: number
}

export function parseZohoEnvelope(text: string): ZohoEnvelope | null {
  try {
    return JSON.parse(text) as ZohoEnvelope
  } catch {
    return null
  }
}

/**
 * Pull the function's own result out of Zoho's envelope.
 *
 * `details.output` is a JSON *string*, so it needs a second parse. If the shape
 * ever changes this falls back to reading the envelope as the flat result
 * rather than failing — an unknown shape then yields no record id, which is
 * honest, instead of a wrong one.
 */
export function unwrapZohoOutput(envelope: ZohoEnvelope | null): ZohoFunctionResult | null {
  if (!envelope) return null

  const raw = envelope.details?.output
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw) as ZohoFunctionResult
    } catch {
      // Unparseable output — fall through to the flat reading below.
    }
  }

  return envelope as ZohoFunctionResult
}

export type ZohoEventOutcome =
  /** Zoho's function ran and did not report a failure. */
  | { status: 'accepted'; result: ZohoFunctionResult | null }
  /** HTTP error, `success: false` inside the output, timeout or no connection. */
  | { status: 'rejected'; reason: string }
  /** No webhook configured, or a dev server refusing a non-local one. */
  | { status: 'skipped' }

/**
 * Send one event and report whether Zoho took it.
 *
 * Never throws: every caller sends after its own write has committed, so the
 * member's action has already happened and a CRM failure must not undo the
 * response. The outcome is returned for the caller to record, and logged here
 * so there is a trace whichever way it went.
 *
 * `context` names the event and its subject in the log line, e.g.
 * "flight_group.filled 202609-OPF-MBU-G930CJ".
 */
export async function sendZohoEvent(event: object, context: string): Promise<ZohoEventOutcome> {
  if (!isZohoConfigured()) return { status: 'skipped' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)

  try {
    const upstream = await fetch(serverEnv.zohoWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      signal: controller.signal,
    })
    const envelope = parseZohoEnvelope(await upstream.text())
    const result = unwrapZohoOutput(envelope)

    if (!upstream.ok) {
      return rejected(context, `HTTP ${upstream.status}: ${result?.message ?? envelope?.message ?? 'no message'}`)
    }
    if (result?.success === false) {
      return rejected(context, `function reported failure: ${result.message ?? 'no message'}`)
    }

    console.info(`[zoho] ${context} accepted: ${summarise(result)}`)
    return { status: 'accepted', result }
  } catch (error) {
    const aborted = error instanceof Error && error.name === 'AbortError'
    return rejected(
      context,
      aborted ? 'timed out' : error instanceof Error ? error.message : String(error),
    )
  } finally {
    clearTimeout(timer)
  }
}

function rejected(context: string, reason: string): ZohoEventOutcome {
  console.error(`[zoho] ${context} REJECTED: ${reason}`)
  return { status: 'rejected', reason }
}

/** The reply as one bounded log line — enough to trace, never a whole payload. */
function summarise(result: ZohoFunctionResult | null): string {
  if (!result) return '(no function output)'
  const line = JSON.stringify(result)
  return line.length > 300 ? `${line.slice(0, 300)}…` : line
}
