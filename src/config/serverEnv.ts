import 'server-only'

/**
 * Server-only environment configuration.
 *
 * The `server-only` import above is the enforcement, not a comment: importing
 * this file from a Client Component is now a build error rather than a silent
 * leak of every secret here into the browser bundle. It holds the Zoho zapikey,
 * the Freshworks key and the Postmark token — the whole file is one accident
 * away from being public without it.
 *
 * These values are read exclusively in server contexts (Route Handlers) and
 * are NEVER exposed to the browser — they have no NEXT_PUBLIC_ prefix, so Next
 * keeps them server-side. The Zoho webhook URL embeds the zapikey secret, which
 * is exactly why the call must originate from the server relay, not the client.
 *
 * Only the relay Route Handler imports this. It reads non-public env vars, so
 * the values are never sent to the browser regardless; keep it out of Client
 * Components so the secret stays server-side.
 */

interface ServerEnv {
  /**
   * Full Zoho CRM Function webhook URL, including the zapikey, e.g.
   * https://www.zohoapis.com/crm/v7/functions/aeroos/actions/execute?auth_type=apikey&zapikey=...
   */
  zohoWebhookUrl: string
  /**
   * Zoho CRM Function URL (with zapikey) for the public-flight read. POSTed a
   * `{ group_id }` body; returns the public_view. Server-only — the zapikey must
   * never reach the browser. Empty → the read-relay falls back to sample data.
   */
  zohoPublicViewUrl: string
  /**
   * Optional override URL (with zapikey) for the interest-lead write. The
   * `aeroos` CRM function that handles flight-group creation and member.joined
   * also handles the `interest_lead.created` event — it routes on the event
   * field — so the lead write reuses ZOHO_WEBHOOK_URL by default. Set this only
   * to point the lead write at a dedicated function URL instead. Server-only.
   */
  zohoLeadWriteUrl: string
  /** Request timeout (ms) for the upstream Zoho call. */
  zohoTimeoutMs: number
  /**
   * Postmark server token. Provider settled by the client 19 Aug; the token and
   * sender domain follow once DNS is through. Empty → the three link flows
   * report not-configured instead of sending. Server-only.
   */
  postmarkServerToken: string
  /** Verified sender, e.g. "Perro Air <no-reply@perroair.com>". Server-only. */
  emailFrom: string
  /** Postmark message stream; defaults to "outbound". */
  postmarkStream: string
  /**
   * Freshworks contact-write endpoint URL (with its key embedded, same pattern
   * as the Zoho URLs). Server-only. A second, independent POST off the Flight
   * Builder submission, decoupled from Zoho. Empty → the Freshworks write is
   * skipped entirely (no-op), so nothing posts until this is configured.
   */
  freshworksWebhookUrl: string
  /** Freshworks API key — sent as `Authorization: Token token=<key>`. Server-only. */
  freshworksApiKey: string
  /** Request timeout (ms) for the upstream Freshworks call. */
  freshworksTimeoutMs: number
  /**
   * When true, Freshworks writes are marked as test records (last_name="TEST",
   * synthetic external_id) so they can be filtered and cleared from the live
   * instance afterwards — there is no Freshworks sandbox.
   */
  freshworksTestMode: boolean
}

export const serverEnv: ServerEnv = {
  zohoWebhookUrl: process.env.ZOHO_WEBHOOK_URL ?? '',
  zohoPublicViewUrl: process.env.ZOHO_PUBLIC_VIEW_URL ?? '',
  zohoLeadWriteUrl: process.env.ZOHO_LEAD_WRITE_URL ?? '',
  zohoTimeoutMs: Number(process.env.ZOHO_TIMEOUT_MS) || 15000,
  postmarkServerToken: process.env.POSTMARK_SERVER_TOKEN ?? '',
  emailFrom: process.env.EMAIL_FROM ?? '',
  postmarkStream: process.env.POSTMARK_MESSAGE_STREAM ?? 'outbound',
  freshworksWebhookUrl: process.env.FRESHWORKS_WEBHOOK_URL ?? '',
  freshworksApiKey: process.env.FRESHWORKS_API_KEY ?? '',
  freshworksTimeoutMs: Number(process.env.FRESHWORKS_TIMEOUT_MS) || 15000,
  freshworksTestMode: process.env.FRESHWORKS_TEST_MODE === 'true',
}

/** True when the webhook URL is configured (lets the relay fail clearly). */
/**
 * True when a *usable* Zoho webhook is configured.
 *
 * The extra condition is a safety interlock, not configuration. Running a dev
 * server against `.env.local` points every CRM write at the client's live
 * account, and the events that go there — `account.created` at verification,
 * `flight_group.created` on submit — arrive as real Contacts and real records
 * in a system we do not own and cannot tidy up.
 *
 * The handoff has warned about this since August and it still happened, on
 * 1 Sep, because the guard was a sentence in a document and the mistake was
 * omitting one variable from a restarted command. A rule that depends on
 * remembering is not a rule.
 *
 * So: in development, refuse any webhook that is not local. Point
 * `ZOHO_WEBHOOK_URL` at `scratchpad/zoho-double.mjs` (`http://localhost:3902/zoho`)
 * and everything works exactly as it does in production, captured instead of
 * sent. Production and preview are unaffected — `NODE_ENV` is `production`
 * there, and this returns as it always did.
 */
export function isZohoConfigured(): boolean {
  const url = serverEnv.zohoWebhookUrl
  if (url.length === 0) return false

  if (process.env.NODE_ENV === 'development' && !isLocalUrl(url)) {
    console.error(
      '[serverEnv] REFUSING to send CRM events to a non-local webhook from a dev ' +
        'server. Start the Zoho double and set ZOHO_WEBHOOK_URL=http://localhost:3902/zoho. ' +
        'Set ALLOW_REMOTE_ZOHO_IN_DEV=true only if you genuinely intend to write to the ' +
        "client's CRM.",
    )
    return process.env.ALLOW_REMOTE_ZOHO_IN_DEV === 'true'
  }
  return true
}

function isLocalUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1'
  } catch {
    return false
  }
}

/** True when the public-view read URL is configured (else use sample data). */
export function isPublicViewConfigured(): boolean {
  return serverEnv.zohoPublicViewUrl.length > 0
}

/**
 * Resolved endpoint for the interest-lead write: the dedicated override if set,
 * otherwise the shared `aeroos` webhook (which handles the lead event too).
 */
export function leadWriteUrl(): string {
  return serverEnv.zohoLeadWriteUrl || serverEnv.zohoWebhookUrl
}

/** True when a lead-write endpoint resolves (dedicated URL or the webhook). */
export function isLeadWriteConfigured(): boolean {
  return leadWriteUrl().length > 0
}

/** True when the Freshworks endpoint is configured (else the write is skipped). */
export function isFreshworksConfigured(): boolean {
  return serverEnv.freshworksWebhookUrl.length > 0
}
