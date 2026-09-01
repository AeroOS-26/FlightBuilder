/**
 * Registration — POST /api/register (frames 30B and 33).
 *
 * Auth.js has no registration flow; creating the member is ours. This endpoint
 * only creates the record — it does not sign anyone in. The client signs in
 * afterwards through the credentials provider, so there is exactly one place
 * where a session is minted.
 *
 * A taken address answers 409, which the sign-up form renders as frame 33's
 * inline message rather than as a failure.
 *
 * On success the member is created unverified and the verification link is
 * issued and sent here, because frame 36 — where the form goes next — tells the
 * member to check their inbox. Until 24 Aug nothing sent it, so that screen was
 * telling the truth only if the member happened to press Resend.
 *
 * The send is deliberately **non-fatal**: the account exists either way, and
 * frame 36 carries a Resend action that is exactly the recovery for a mail that
 * did not arrive. Failing registration because an email provider was briefly
 * unreachable would destroy an account the member successfully created.
 */

import { NextResponse } from 'next/server'
import { createMember } from '@/features/auth/server/members'
import { isDatabaseConfigured } from '@/features/auth/server/db'
import { issueToken } from '@/features/auth/server/tokens'
import { sendVerificationEmail, isEmailConfigured } from '@/features/auth/server/email'
import { validateSignUp, isClean } from '@/features/auth/validation'
import { appUrl } from '@/config/appUrl'


export async function POST(request: Request) {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { message: 'Accounts are not configured on the server.' },
      { status: 503 },
    )
  }

  let body: { email?: unknown; password?: unknown; name?: unknown }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ message: 'Invalid request body.' }, { status: 400 })
  }

  const email = typeof body.email === 'string' ? body.email : ''
  const password = typeof body.password === 'string' ? body.password : ''
  const name = typeof body.name === 'string' ? body.name.trim() : undefined

  // The same rules the form applies, re-checked here: a client can be bypassed.
  const errors = validateSignUp({ email, password })
  if (!isClean(errors)) {
    return NextResponse.json({ message: errors.email ?? errors.password }, { status: 422 })
  }

  /**
   * A database fault here used to escape as a bare 500 with an empty body.
   * That is indistinguishable from a bug in this route, and it cost a day of
   * hunting: the real cause was a connection timeout that named itself
   * nowhere the browser could see.
   *
   * `reason` carries the driver's error code only — `ETIMEDOUT`, `42P01`,
   * `28P01`. Short tokens, no host, credentials or SQL, so they are safe to
   * return, and they turn "please try again" into a diagnosis.
   */
  let member: Awaited<ReturnType<typeof createMember>>
  try {
    member = await createMember({ email, password, name })
  } catch (err) {
    const reason = (err as { code?: string })?.code ?? 'unknown'
    console.error('[register] createMember failed:', reason, err)
    return NextResponse.json(
      { message: 'Accounts are temporarily unavailable. Please try again.', reason },
      { status: 503 },
    )
  }

  if (!member) {
    return NextResponse.json({ code: 'email-exists' }, { status: 409 })
  }

  // Issue and send the verification link. Non-fatal — see the file header.
  if (isEmailConfigured()) {
    try {
      const { token } = await issueToken('verify-email', member.email)
      const url = `${appUrl()}/api/verify-email?token=${encodeURIComponent(
        token,
      )}&email=${encodeURIComponent(member.email)}`
      const sent = await sendVerificationEmail(member.email, url, name)
      if (!sent.ok) {
        console.error('[register] verification email not sent:', sent.reason, sent.message)
      }
    } catch (err) {
      console.error('[register] verification email failed:', err)
    }
  }

  return NextResponse.json(
    { id: String(member.id), account_id: member.account_id, email: member.email },
    { status: 200 },
  )
}
