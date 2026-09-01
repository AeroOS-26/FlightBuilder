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
import { signIn } from '@/features/auth/server/auth'
import {
  sendPasswordResetEmail,
  isEmailConfigured,
  describeClient,
} from '@/features/auth/server/email'
import { isDatabaseConfigured } from '@/features/auth/server/db'
import { validateNewPassword, isClean, validateEmail } from '@/features/auth/validation'
import { appUrl } from '@/config/appUrl'


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

  // setPassword also zeroes failed_attempts, clears locked_until, and bumps
  // session_version — which ends every session this member has, including any
  // the attacker holds. That is the point of the change.
  await setPassword(member.id, password)

  /**
   * Now sign this device back in.
   *
   * The bump above signed out *everything*, this browser included. Frame 38B
   * says "You are signed in on this device", so without this the screen would
   * be describing the opposite of what happened — and the member would be
   * bounced to sign-in by the first guarded route they touched.
   *
   * A `session-grant` is the right instrument: completing a reset link sent to
   * their own address is the proof of ownership, exactly as it is on the
   * verification path, and the grant is single-use and short-lived. We do not
   * have their password here and must not ask for it again.
   *
   * Non-fatal. The password change has already succeeded and is the thing that
   * mattered; if the session cannot be established the member signs in with
   * their new password, which works. Failing the request here would tell them
   * the reset did not work when it did.
   */
  let signedIn = false
  try {
    const grant = await issueToken('session-grant', member.email)
    await signIn('email-verified', {
      email: member.email,
      token: grant.token,
      redirect: false,
    })
    signedIn = true
  } catch (err) {
    console.error('[reset-password] could not establish a session:', err)
  }

  return NextResponse.json({ success: true, signedIn }, { status: 200 })
}
