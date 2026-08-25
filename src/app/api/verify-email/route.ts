/**
 * Email verification — the endpoint the link in the email hits.
 *
 * POST /api/verify-email          issue and send a link (also the resend path)
 * GET  /api/verify-email?token=…  consume it, mark verified, emit account.created
 *
 * The GET redirects rather than returning JSON, because a person clicking a link
 * in their inbox lands here in a browser and must end up on a screen: frame 35
 * on success, or back to frame 36 with a reason.
 *
 * account.created fires HERE and only here — this is the verification moment the
 * contract names. It is intentionally non-fatal: a CRM failure must not leave a
 * verified member unable to proceed.
 */

import { NextResponse } from 'next/server'
import { findByEmail, markEmailVerified } from '@/features/auth/server/members'
import { issueToken, consumeToken } from '@/features/auth/server/tokens'
import { sendVerificationEmail, isEmailConfigured } from '@/features/auth/server/email'
import {
  buildAccountCreated,
  emitAccountCreated,
} from '@/features/auth/server/accountCreated'
import { isDatabaseConfigured } from '@/features/auth/server/db'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
}

/** Issue and send a verification link. Used at sign-up and by Resend on frame 36. */
export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ message: 'Accounts are not configured.' }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  if (!email) return NextResponse.json({ message: 'Email is required.' }, { status: 422 })

  const member = await findByEmail(email)

  // Always answer the same way. Confirming whether an address is registered
  // here would leak exactly what the sign-in screen's enumeration question is
  // about, and this endpoint is unauthenticated.
  const generic = NextResponse.json({ success: true }, { status: 200 })

  if (!member || member.emailVerified) return generic
  if (!isEmailConfigured()) {
    return NextResponse.json(
      { success: false, code: 'email-not-configured', message: 'Email delivery is not configured yet.' },
      { status: 503 },
    )
  }

  const { token } = await issueToken('verify-email', email)
  const url = `${appUrl()}/api/verify-email?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
  // `member.name` is normally null here — sign-up does not ask for one — so the
  // key is omitted from the template model rather than sent empty.
  const sent = await sendVerificationEmail(email, url, member.name ?? undefined)
  if (!sent.ok) {
    return NextResponse.json({ success: false, message: sent.message }, { status: 502 })
  }
  return generic
}

/** Consume the link. */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token') ?? ''
  const email = searchParams.get('email') ?? ''
  const back = (reason: string) =>
    NextResponse.redirect(
      `${appUrl()}/verify-email?email=${encodeURIComponent(email)}&reason=${reason}`,
    )

  if (!token || !email) return back('invalid')

  const result = await consumeToken('verify-email', email, token)
  if (!result.ok) return back(result.reason)

  const member = await findByEmail(result.email)
  if (!member) return back('invalid')

  // Verifying twice is not an error: the token is single-use, so a second click
  // fails above. This guard covers a member verified by another route.
  const alreadyVerified = Boolean(member.emailVerified)
  if (!alreadyVerified) await markEmailVerified(member.id)

  if (!alreadyVerified && member.account_id) {
    const emitted = await emitAccountCreated(
      buildAccountCreated({
        accountId: member.account_id,
        email: member.email,
        phone: member.phone,
        name: member.name,
      }),
    )
    // Non-fatal by design — the member is verified either way.
    if (!emitted.ok) {
      console.error('[account.created] not delivered:', emitted.reason, emitted.message)
    }
  }

  return NextResponse.redirect(`${appUrl()}/welcome`)
}
