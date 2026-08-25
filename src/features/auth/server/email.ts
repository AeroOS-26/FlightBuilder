import 'server-only'

/**
 * Transactional email — Postmark, using the client's server-side templates.
 *
 * The copy lives in Postmark, not here. The client owns three templates and
 * addresses them by alias, which is the whole point of the arrangement: they
 * rewrite the wording whenever they like and it goes live without a deploy from
 * us. So this file sends a template name and a bag of variables, and never an
 * HTML body or a subject line — the template owns both.
 *
 *   alias                 flow                        model
 *   email-verification    verification on sign-up     product_name, action_url, name?
 *   magic-link            sign-in link                product_name, action_url, name?
 *   password-reset        password reset              …plus operating_system?, browser_name?
 *
 * **`name` is omitted, never blanked.** Client's instruction, 24 Aug: send it
 * when we have it and leave the key out when we do not, and they handle the
 * empty case in the template so the wording stays on their side. This is the
 * common case rather than the edge one — sign-up collects only an email address
 * and a password, so nobody has a name at verification time, and a member can
 * verify then abandon before Complete Profile, which leaves magic-link and reset
 * without one too.
 *
 * Postmark's REST API is a single POST, so there is no SDK dependency here.
 *
 * ── Not spending the client's quota ──────────────────────────────────────────
 * The account is on the free tier (100/month). Two ways to work without
 * touching it, both requiring no code change:
 *   POSTMARK_SERVER_TOKEN=POSTMARK_API_TEST   Postmark's own test token. It
 *       accepts and discards the message, so the request is real and nothing is
 *       sent or charged.
 *   POSTMARK_API_URL=http://localhost:3901    a local double, when the exact
 *       request body needs inspecting rather than just a success.
 */

import { serverEnv } from '@/config/serverEnv'

/**
 * Postmark's template send. Overridable so the flows can be exercised against a
 * local double, which is how they were built before any real send.
 */
const POSTMARK_ENDPOINT =
  process.env.POSTMARK_API_URL || 'https://api.postmarkapp.com/email/withTemplate'

/** Passed as `product_name` on all three templates, settled with the client. */
const PRODUCT_NAME = 'Flight Club'

/** The three templates that exist in the client's Postmark account. */
export type TemplateAlias = 'email-verification' | 'magic-link' | 'password-reset'

/**
 * What the client's templates accept. Optional keys are omitted entirely when
 * we have no value — see the note on `name` above.
 */
interface TemplateModel {
  product_name: string
  action_url: string
  name?: string
  operating_system?: string
  browser_name?: string
}

export type SendResult =
  | { ok: true; messageId: string | null }
  | { ok: false; reason: 'not-configured' | 'rejected' | 'unavailable'; message: string }

export function isEmailConfigured(): boolean {
  return Boolean(serverEnv.postmarkServerToken && serverEnv.emailFrom)
}

/** Details of the device that asked for a reset — the reset template shows them. */
export interface ClientDescription {
  operatingSystem?: string
  browserName?: string
}

/**
 * A rough read of the User-Agent, for the reset email's "this request came from"
 * line. Deliberately coarse and dependency-free: it is shown to a person as a
 * recognition cue ("was this you?"), not relied on for anything, so a wrong
 * guess costs nothing and a UA-parsing library would be weight for no gain.
 *
 * Order matters — Edge's UA contains "Chrome", and Chrome's contains "Safari".
 */
export function describeClient(userAgent: string | null | undefined): ClientDescription {
  if (!userAgent) return {}
  const ua = userAgent

  const operatingSystem =
    /Windows/i.test(ua) ? 'Windows'
    : /iPhone|iPad|iPod/i.test(ua) ? 'iOS'
    : /Mac OS X|Macintosh/i.test(ua) ? 'macOS'
    : /Android/i.test(ua) ? 'Android'
    : /Linux/i.test(ua) ? 'Linux'
    : undefined

  const browserName =
    /Edg\//i.test(ua) ? 'Edge'
    : /OPR\/|Opera/i.test(ua) ? 'Opera'
    : /Firefox\//i.test(ua) ? 'Firefox'
    : /Chrome\//i.test(ua) ? 'Chrome'
    : /Safari\//i.test(ua) ? 'Safari'
    : undefined

  return { ...(operatingSystem && { operatingSystem }), ...(browserName && { browserName }) }
}

/** Build the model, leaving out every key we have no value for. */
function buildModel(actionUrl: string, name?: string, client?: ClientDescription): TemplateModel {
  const trimmed = name?.trim()
  return {
    product_name: PRODUCT_NAME,
    action_url: actionUrl,
    // Omitted rather than blanked — the template decides how to read its absence.
    ...(trimmed ? { name: trimmed } : {}),
    ...(client?.operatingSystem ? { operating_system: client.operatingSystem } : {}),
    ...(client?.browserName ? { browser_name: client.browserName } : {}),
  }
}

async function send(to: string, alias: TemplateAlias, model: TemplateModel): Promise<SendResult> {
  if (!isEmailConfigured()) {
    return {
      ok: false,
      reason: 'not-configured',
      message: 'Email delivery is not configured on the server.',
    }
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), serverEnv.zohoTimeoutMs)

  try {
    const res = await fetch(POSTMARK_ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Postmark-Server-Token': serverEnv.postmarkServerToken,
      },
      // No Subject, HtmlBody or TextBody: with a template send, Postmark rejects
      // the request if we try to own what the template owns.
      body: JSON.stringify({
        From: serverEnv.emailFrom,
        To: to,
        TemplateAlias: alias,
        TemplateModel: model,
        MessageStream: serverEnv.postmarkStream || 'outbound',
      }),
      signal: controller.signal,
    })

    const data = (await res.json().catch(() => null)) as
      | { MessageID?: string; Message?: string; ErrorCode?: number }
      | null

    if (!res.ok) {
      // Postmark returns a descriptive Message on rejection — an unknown alias,
      // an unconfirmed sender signature, an inactive recipient, or the monthly
      // limit on the free tier. All of those are worth reading verbatim.
      return {
        ok: false,
        reason: 'rejected',
        message: data?.Message ?? `Postmark rejected the message (${res.status}).`,
      }
    }
    return { ok: true, messageId: data?.MessageID ?? null }
  } catch (err) {
    const aborted = err instanceof Error && err.name === 'AbortError'
    return {
      ok: false,
      reason: 'unavailable',
      message: aborted ? 'The email service timed out.' : 'Could not reach the email service.',
    }
  } finally {
    clearTimeout(timer)
  }
}

/* ── The three flows ─────────────────────────────────────────────────────── */

export function sendVerificationEmail(
  to: string,
  url: string,
  name?: string,
): Promise<SendResult> {
  return send(to, 'email-verification', buildModel(url, name))
}

export function sendMagicLinkEmail(to: string, url: string, name?: string): Promise<SendResult> {
  return send(to, 'magic-link', buildModel(url, name))
}

export function sendPasswordResetEmail(
  to: string,
  url: string,
  name?: string,
  client?: ClientDescription,
): Promise<SendResult> {
  return send(to, 'password-reset', buildModel(url, name, client))
}
