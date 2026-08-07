/**
 * Server-only environment configuration.
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
  freshworksWebhookUrl: process.env.FRESHWORKS_WEBHOOK_URL ?? '',
  freshworksApiKey: process.env.FRESHWORKS_API_KEY ?? '',
  freshworksTimeoutMs: Number(process.env.FRESHWORKS_TIMEOUT_MS) || 15000,
  freshworksTestMode: process.env.FRESHWORKS_TEST_MODE === 'true',
}

/** True when the webhook URL is configured (lets the relay fail clearly). */
export function isZohoConfigured(): boolean {
  return serverEnv.zohoWebhookUrl.length > 0
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
