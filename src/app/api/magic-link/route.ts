/**
 * Magic-link sign-in — frames 30, 30B and 34.
 *
 * POST /api/magic-link          request a link for an address
 * GET  /api/magic-link?token=…  redeem it and sign in
 *
 * The point of this flow is that no password is involved: possession of the
 * inbox is the proof. So the request takes an address and nothing else, and the
 * redemption takes a token and nothing else.
 *
 * **It does not enumerate.** POST answers identically for a known and an
 * unknown address, exactly as password reset does, because frame 34 draws no
 * not-found state — it says "check your inbox" and that reads the same either
 * way. (Frames 32 V1/V2 do enumerate on password sign-in, but only because the
 * design asked for it there explicitly.)
 *
 * **Redeeming verifies the member.** Clicking a link sent to their own address
 * is the same proof the verification mail asks for, so a member who signs up
 * and then arrives by magic link is verified here rather than being told to go
 * and find the other email. That obligation comes with a second one: contract
 * §6 makes `account.created` ours to emit *at verification*, whichever link
 * caused it. Emitting it only from the verification route would leave a member
 * verified in our database and absent from the CRM, with an `acct_` id on their
 * flights pointing at a Contact that does not exist.
 */

import { NextResponse } from 'next/server'
import { findByEmail, markEmailVerified } from '@/features/auth/server/members'
import { issueToken, consumeToken } from '@/features/auth/server/tokens'
import { sendMagicLinkEmail, isEmailConfigured } from '@/features/auth/server/email'
import { isDatabaseConfigured } from '@/features/auth/server/db'
import { signIn } from '@/features/auth/server/auth'
import { buildAccountCreated, emitAccountCreated } from '@/features/auth/server/accountCreated'
import { validateEmail } from '@/features/auth/validation'
import { appUrl } from '@/config/appUrl'

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ message: 'Accounts are not configured.' }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

  // A malformed address is the caller's mistake and worth saying so — it leaks
  // nothing, because it is decidable without looking anyone up.
  const invalid = validateEmail(email)
  if (invalid) return NextResponse.json({ message: invalid }, { status: 422 })

  if (!isEmailConfigured()) {
    return NextResponse.json(
      { success: false, code: 'email-not-configured', message: 'Email delivery is not configured yet.' },
      { status: 503 },
    )
  }

  const member = await findByEmail(email)
  // Same answer either way — see the file header.
  if (member) {
    const { token } = await issueToken('magic-link', email)
    const url = `${appUrl()}/api/magic-link?token=${encodeURIComponent(
      token,
    )}&email=${encodeURIComponent(email)}`
    const sent = await sendMagicLinkEmail(email, url, member.name ?? undefined)
    if (!sent.ok) {
      return NextResponse.json({ success: false, message: sent.message }, { status: 502 })
    }
  }

  return NextResponse.json({ success: true }, { status: 200 })
}

/**
 * Redeeming the link.
 *
 * A GET that establishes a session is unusual and deserves the note: this is
 * the target of a link in an email, so it cannot be anything else. What makes
 * it safe is that the token is single-use — redeemed by an atomic delete — and
 * dead within fifteen minutes, so the URL is worthless the moment it is used
 * and worthless again shortly after.
 *
 * Every failure lands on /signin with a code rather than rendering an error
 * here, so there is one place that draws sign-in problems.
 */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const token = url.searchParams.get('token') ?? ''
  const email = url.searchParams.get('email') ?? ''
  const fail = (code: string) =>
    NextResponse.redirect(new URL(`/signin?error=${code}`, appUrl()))

  if (!isDatabaseConfigured()) return fail('service-unavailable')
  if (!token || !email) return fail('invalid-link')

  const granted = await consumeToken('magic-link', email, token)
  if (!granted.ok) {
    return fail(granted.reason === 'expired' ? 'link-expired' : 'invalid-link')
  }

  const member = await findByEmail(granted.email)
  if (!member) return fail('invalid-link')

  // Arriving here is proof of the address — see the file header.
  const wasVerified = Boolean(member.emailVerified)
  if (!wasVerified) {
    await markEmailVerified(member.id)

    // Non-fatal, exactly as on the verification route: the member is verified
    // and gets in either way. Their account is ours, not Zoho's.
    if (member.account_id) {
      try {
        await emitAccountCreated(
          buildAccountCreated({
            accountId: member.account_id,
            email: member.email,
            phone: member.phone,
            name: member.name,
          }),
        )
      } catch (err) {
        console.error('[magic-link] account.created not emitted:', err)
      }
    }
  }

  try {
    const grant = await issueToken('session-grant', member.email)
    await signIn('email-verified', {
      email: member.email,
      token: grant.token,
      redirect: false,
    })
  } catch (err) {
    console.error('[magic-link] could not establish a session:', err)
    return fail('service-unavailable')
  }

  // `/` is the entry router — it decides where this member belongs.
  return NextResponse.redirect(new URL('/', appUrl()))
}
