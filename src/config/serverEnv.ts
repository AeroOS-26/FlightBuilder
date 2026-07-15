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
  /** Request timeout (ms) for the upstream Zoho call. */
  zohoTimeoutMs: number
}

export const serverEnv: ServerEnv = {
  zohoWebhookUrl: process.env.ZOHO_WEBHOOK_URL ?? '',
  zohoTimeoutMs: Number(process.env.ZOHO_TIMEOUT_MS) || 15000,
}

/** True when the webhook URL is configured (lets the relay fail clearly). */
export function isZohoConfigured(): boolean {
  return serverEnv.zohoWebhookUrl.length > 0
}
