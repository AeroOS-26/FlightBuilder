/**
 * Password reset — frames 37, 37B, 38 and 38B.
 *
 * POST /api/reset-password              request a link (also the resend path)
 * PUT  /api/reset-password              consume the token and set the password
 *
 * Both answer identically for a known and an unknown address. Frame 37 draws no
 * not-found state, and telling a stranger which emails are registered is exactly
 * the leak the sign-in enumeration question is about — but there the design
 * asked for it explicitly, and here it did not.
 *
 * A completed reset clears any lockout, which is what frame 32 V3's "Reset your
 * password" action implies: it is offered as the way out of a locked account.
 */

import { NextResponse } from 'next/server'
import { findByEmail, setPassword } from '@/features/auth/server/members'
import { issueToken, consumeToken } from '@/features/auth/server/tokens'
import {
  sendPasswordResetEmail,
  isEmailConfigured,
  describeClient,
} from '@/features/auth/server/email'
import { isDatabaseConfigured } from '@/features/auth/server/db'
import { validateNewPassword, isClean, validateEmail } from '@/features/auth/validation'

function appUrl(): string {
  return process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') || 'http://localhost:3000'
}

export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ message: 'Accounts are not configured.' }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as { email?: unknown } | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''

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
    const { token } = await issueToken('reset-password', email)
    const url = `${appUrl()}/reset-password/new?token=${encodeURIComponent(token)}&email=${encodeURIComponent(email)}`
    // The reset template shows the device the request came from, so the person
    // reading it can tell their own request from someone else's.
    const client = describeClient(request.headers.get('user-agent'))
    const sent = await sendPasswordResetEmail(email, url, member.name ?? undefined, client)
    if (!sent.ok) {
      return NextResponse.json({ success: false, message: sent.message }, { status: 502 })
    }
  }
  return NextResponse.json({ success: true }, { status: 200 })
}

export async function PUT(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({ message: 'Accounts are not configured.' }, { status: 503 })
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
  const email = typeof body?.email === 'string' ? body.email.trim() : ''
  const token = typeof body?.token === 'string' ? body.token : ''
  const password = typeof body?.password === 'string' ? body.password : ''
  const confirm = typeof body?.confirm === 'string' ? body.confirm : password

  // The same rules the form applies, re-checked here — a client can be bypassed.
  const errors = validateNewPassword({ password, confirm })
  if (!isClean(errors)) {
    return NextResponse.json(
      { message: errors.password ?? errors.confirm },
      { status: 422 },
    )
  }

  const result = await consumeToken('reset-password', email, token)
  if (!result.ok) {
    return NextResponse.json(
      {
        code: result.reason === 'expired' ? 'expired' : 'invalid-token',
        message: 'That link has expired or has already been used. Request a new one.',
      },
      { status: 410 },
    )
  }

  const member = await findByEmail(result.email)
  if (!member) {
    return NextResponse.json({ code: 'invalid-token', message: 'That link is no longer valid.' }, { status: 410 })
  }

  // setPassword also zeroes failed_attempts and clears locked_until.
  await setPassword(member.id, password)
  return NextResponse.json({ success: true }, { status: 200 })
}
