'use client'

/**
 * The auth seam — now wired to the real endpoints.
 *
 * Everything the M1 screens do passes through here, and nothing else in the
 * feature knows how it is fulfilled. That was the point of building it as a seam
 * while the auth layer was still in progress: swapping the simulation for the
 * real calls changed only this file.
 *
 * Where each operation goes:
 *   signIn                 Auth.js credentials provider (/api/auth/callback/…)
 *   signUp                 POST /api/register
 *   requestPasswordReset   pending — see "Link flows" below
 *   setNewPassword         pending
 *   resend*                pending
 *
 * ── Link flows ──────────────────────────────────────────────────────────────
 * The token lifecycle is built and these call it. Delivery goes through Postmark
 * (settled 19 August); until the server token and sender domain are set the
 * endpoints answer 503 with `email-not-configured`, which surfaces as a plain
 * notice rather than pretending a mail was sent. No code changes when the
 * credentials land — only environment.
 */

import { signIn as authSignIn } from 'next-auth/react'

/** Every way an auth call can fail, mapped to the states the frames draw. */
export type AuthFailure =
  /** Frame 32 V2 — no account for that email. */
  | { kind: 'account-not-found' }
  /** Frame 32 V1 — password does not match. */
  | { kind: 'wrong-password' }
  /** Frame 32 V3 — locked after repeated failures. */
  | { kind: 'account-locked' }
  /**
   * The account exists but has no password — it was created by, or has only
   * ever used, a sign-in link. Not a failure of theirs to correct.
   */
  | { kind: 'no-password' }
  /** Frame 33 — that email already has an account. */
  | { kind: 'email-exists' }
  /** A reset/verification link that has expired or was already used. */
  | { kind: 'invalid-token' }
  /** Not wired yet, or the transport failed. */
  | { kind: 'not-configured'; message: string }
  | { kind: 'unavailable'; message: string }

export type AuthResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; failure: AuthFailure }

const NETWORK: AuthResult<never> = {
  ok: false,
  failure: { kind: 'unavailable', message: 'Network error. Check your connection and try again.' },
}

/**
 * Auth.js returns our `CredentialsSignin` subclass's `code`; the classes are in
 * server/auth.ts and these strings are their `code` values.
 */
const FAILURE_BY_CODE: Record<string, AuthFailure> = {
  'not-found': { kind: 'account-not-found' },
  'wrong-password': { kind: 'wrong-password' },
  locked: { kind: 'account-locked' },
  'no-password': { kind: 'no-password' },
}

/** Sign in — frame 30, failing into frame 32's three variants. */
export async function signIn(values: {
  email: string
  password: string
}): Promise<AuthResult> {
  let res
  try {
    res = await authSignIn('credentials', {
      email: values.email.trim(),
      password: values.password,
      redirect: false,
    })
  } catch {
    return NETWORK
  }

  if (res?.ok && !res.error) return { ok: true, data: undefined }

  const failure = res?.code ? FAILURE_BY_CODE[res.code] : undefined
  if (failure) return { ok: false, failure }

  return {
    ok: false,
    failure: {
      kind: 'unavailable',
      message: 'We couldn’t sign you in. Please try again.',
    },
  }
}

/** Create account — frames 30B and 33. Creates the record; does not sign in. */
export async function signUp(values: {
  email: string
  password: string
  name?: string
}): Promise<AuthResult> {
  let res: Response
  try {
    res = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: values.email.trim(),
        password: values.password,
        name: values.name,
      }),
    })
  } catch {
    return NETWORK
  }

  if (res.ok) return { ok: true, data: undefined }
  if (res.status === 409) return { ok: false, failure: { kind: 'email-exists' } }

  const body = (await res.json().catch(() => null)) as { message?: string } | null
  return {
    ok: false,
    failure: {
      kind: res.status === 503 ? 'not-configured' : 'unavailable',
      message: body?.message ?? 'We couldn’t create your account. Please try again.',
    },
  }
}

/* ── Link flows ───────────────────────────────────────────────────────────── */

/** Shared shape for the link endpoints, which all answer {success, message?}. */
async function postJson(url: string, body: unknown, method = 'POST'): Promise<AuthResult> {
  let res: Response
  try {
    res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch {
    return NETWORK
  }

  if (res.ok) return { ok: true, data: undefined }

  const data = (await res.json().catch(() => null)) as
    | { code?: string; message?: string }
    | null

  // 410 is a spent or expired link — frames offer "request a new one".
  if (res.status === 410 || data?.code === 'invalid-token' || data?.code === 'expired') {
    return { ok: false, failure: { kind: 'invalid-token' } }
  }
  if (res.status === 503 || data?.code === 'email-not-configured') {
    return {
      ok: false,
      failure: {
        kind: 'not-configured',
        message: data?.message ?? 'Email delivery isn’t switched on yet.',
      },
    }
  }
  return {
    ok: false,
    failure: {
      kind: 'unavailable',
      message: data?.message ?? 'That didn’t work. Please try again.',
    },
  }
}

/** Request a password-reset link — frame 37. */
export async function requestPasswordReset(email: string): Promise<AuthResult> {
  return postJson('/api/reset-password', { email })
}

/** Set a new password from a reset link — frame 38. */
export async function setNewPassword(values: {
  token?: string
  email?: string
  password: string
  confirm?: string
}): Promise<AuthResult> {
  return postJson('/api/reset-password', values, 'PUT')
}

/** Resend a verification email — frame 36. */
export async function resendVerification(email: string): Promise<AuthResult> {
  return postJson('/api/verify-email', { email })
}

/** Resend a password-reset link — frame 37B. */
export async function resendPasswordReset(email: string): Promise<AuthResult> {
  return postJson('/api/reset-password', { email })
}

/**
 * Failure → the message shown when it is not a per-field error.
 * Field-level failures return null: the caller renders those against the field,
 * per frames 32 and 33.
 */
export function generalMessage(failure: AuthFailure): string | null {
  switch (failure.kind) {
    case 'account-not-found':
    case 'wrong-password':
    case 'account-locked':
    case 'email-exists':
    // Drawn as its own alert on the sign-in screen, with an action, rather than
    // as a sentence — the member needs a route out, not a description.
    case 'no-password':
      return null
    case 'invalid-token':
      return 'That link has expired or has already been used. Request a new one.'
    case 'not-configured':
    case 'unavailable':
      return failure.message
  }
}
