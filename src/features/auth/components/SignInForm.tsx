'use client'

/**
 * Sign in — frame 30, and frame 32's login-error variants.
 *
 * The error states are not separate screens: 32 is frame 30 with one field in
 * its invalid state and an inline message beneath it. Modelling them as a
 * variant union keeps them that way, so the happy path and the error paths can
 * never drift apart visually.
 *
 * Two sources of error feed the same treatment:
 *  - client validation (empty / malformed) runs first and never hits the network
 *  - a server failure maps onto the same fields via `LoginError`
 * The `error` prop still forces a variant so `?error=` keeps working for design
 * review; a live submit overrides it.
 *
 * CONFIRM: the variants distinguish "no such account" from "wrong password",
 * which tells a visitor which emails are registered. A deliberate design choice
 * with a user-enumeration tradeoff; a single generic message is a one-line
 * change if the client prefers it.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Form, TextInput } from '@/components/ui'
import { FieldError } from '@/components/ui/FormField'
import { Icon } from '@/components/common'
import { PasswordInput } from './PasswordInput'
import { SsoRow } from './SsoRow'
import { AuthAlert } from './AuthAlert'
import { AuthNotice } from './AuthNotice'
import { signIn, generalMessage } from '../data/authService'
import { safeInternalPath } from '../server/routing'
import { validateSignIn, validateEmail, isClean, type SignInErrors } from '../validation'

/** Which inline error the form is showing, if any. */
export type LoginError =
  | 'none'
  | 'account-not-found'
  | 'wrong-password'
  | 'account-locked'
  | 'no-password'

interface SignInFormProps {
  /** Forces a variant for design review via `?error=`. */
  error?: LoginError
  /**
   * A page-level message from the server, for reasons that have no field —
   * a used or expired sign-in link, for instance. Seeds the notice; a live
   * submit replaces it.
   */
  notice?: string
  /** Where to land after a successful sign-in, from `?callbackUrl=`. */
  callbackUrl?: string
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-sans text-[12px] font-medium leading-[1.21] text-black/90"
    >
      {children}
    </label>
  )
}

export function SignInForm({ error = 'none', notice: initialNotice, callbackUrl }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<SignInErrors>({})
  const [serverError, setServerError] = useState<LoginError>('none')
  const [notice, setNotice] = useState<string | null>(initialNotice ?? null)
  const [pending, setPending] = useState(false)

  /**
   * Where "Email Link" points. The request screen at /magic-link does the
   * sending; this only carries the address across so it arrives prefilled.
   *
   * The previous design sent from here with a fetch, which is why the control
   * was a button — and why it was dead until React hydrated. See `emailLinkHref`
   * in SsoRow for what that cost.
   */
  const magicLinkHref = email.trim()
    ? `/magic-link?email=${encodeURIComponent(email.trim())}`
    : '/magic-link'

  // A live submit takes precedence over the review parameter.
  const active: LoginError = serverError !== 'none' ? serverError : error

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    setNotice(null)
    setServerError('none')

    const errors = validateSignIn({ email, password })
    setFieldErrors(errors)
    if (!isClean(errors)) return

    setPending(true)
    const result = await signIn({ email, password })

    if (result.ok) {
      // A full navigation rather than a router push: the session cookie was
      // just set, and every server component downstream must read it fresh.
      //
      // Landing on "/" rather than a fixed screen: the entry router owns where
      // a member belongs, and it needs the session this call just created. A
      // hard-coded destination here would be a second, silently diverging copy
      // of that rule — and it was, sending everyone to Complete Profile even
      // though the frames make that step optional.
      window.location.href = safeInternalPath(callbackUrl, '/')
      return
    }
    setPending(false)

    const { failure } = result
    if (
      failure.kind === 'account-not-found' ||
      failure.kind === 'wrong-password' ||
      failure.kind === 'account-locked'
    ) {
      setServerError(failure.kind)
      return
    }
    setNotice(generalMessage(failure))
  }

  /** Clear a field's error as soon as the user edits it. */
  function edit(setter: (v: string) => void, key: keyof SignInErrors) {
    return (value: string) => {
      setter(value)
      if (fieldErrors[key] || serverError !== 'none') {
        setFieldErrors((prev) => ({ ...prev, [key]: undefined }))
        setServerError('none')
      }
    }
  }

  const emailInvalid = active === 'account-not-found' || Boolean(fieldErrors.email)
  const passwordInvalid = active === 'wrong-password' || Boolean(fieldErrors.password)
  const locked = active === 'account-locked'

  return (
    <Form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      <header className="flex flex-col items-center gap-[6px]">
        <h1 className="font-heading text-[24px] font-medium leading-[1.21] text-black">
          Sign in to continue.
        </h1>
        <p className="text-center font-sans text-[14px] font-normal leading-[1.3] text-black/70">
          Get started with Perro Air.
        </p>
      </header>

      {/*
        A link, not a button. Carries whatever has been typed so the request
        screen arrives prefilled; before hydration the href is the bare path,
        which still works — one field to fill rather than a dead control.
      */}
      <SsoRow emailLinkHref={magicLinkHref} busy={pending} />

      <div className="flex flex-col items-center gap-[22px]">
        {locked && (
          <AuthAlert action={{ label: 'Reset your password', href: '/reset-password' }}>
            Too many failed attempts. We&apos;ve temporarily locked this account for security.
          </AuthAlert>
        )}

        {/*
          The account exists but has no password — it has only ever used a
          sign-in link. Telling them the password is wrong would be untrue and
          would send them to change something that does not exist.

          "Set a password" rather than "Reset": they never had one. It is the
          same screen and the same token either way, because `setPassword`
          writes a hash whether or not one was there.
        */}
        {active === 'no-password' && (
          <AuthAlert action={{ label: 'Set a password', href: '/reset-password' }}>
            This account signs in with an email link. Use Email Link above, or set a
            password to sign in with one.
          </AuthAlert>
        )}

        {notice && <AuthNotice>{notice}</AuthNotice>}

        <div className="flex w-full flex-col gap-4">
          <div className="flex flex-col gap-[6px]">
            <FieldLabel htmlFor="signin-email">Email</FieldLabel>
            <TextInput
              id="signin-email"
              type="email"
              name="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => edit(setEmail, 'email')(e.target.value)}
              invalid={emailInvalid}
              endAdornment={
                <span className="text-[#6D6D6D]">
                  <Icon name="mail" size={16} />
                </span>
              }
              aria-describedby={emailInvalid ? 'signin-email-error' : undefined}
            />
            {fieldErrors.email ? (
              <FieldError id="signin-email-error" className="items-start">
                {fieldErrors.email}
              </FieldError>
            ) : (
              active === 'account-not-found' && (
                <FieldError id="signin-email-error" className="items-start">
                  <span>
                    We couldn&apos;t find an account with that email.{' '}
                    <a href="/signup" className="underline underline-offset-2">
                      Want to create one?
                    </a>
                  </span>
                </FieldError>
              )
            )}
          </div>

          <div className="flex flex-col gap-[6px]">
            <FieldLabel htmlFor="signin-password">Password</FieldLabel>
            <PasswordInput
              id="signin-password"
              name="password"
              placeholder={locked ? 'Locked' : 'Enter Password'}
              value={password}
              onChange={(e) => edit(setPassword, 'password')(e.target.value)}
              invalid={passwordInvalid}
              disabled={locked}
              aria-describedby={passwordInvalid ? 'signin-password-error' : undefined}
            />
            {fieldErrors.password ? (
              <FieldError id="signin-password-error" className="items-start">
                {fieldErrors.password}
              </FieldError>
            ) : (
              active === 'wrong-password' && (
                <FieldError id="signin-password-error" className="items-start">
                  That password doesn&apos;t match our records. Try again or recover the password.
                </FieldError>
              )
            )}
          </div>
        </div>

        <a
          href="/reset-password"
          className="font-sans text-[14px] font-semibold leading-[1.14] text-[#0A1B49]"
        >
          Forgot password?
        </a>
      </div>

      <div className="flex flex-col items-center gap-[18px]">
        <button
          type="submit"
          disabled={pending || locked}
          className="flex h-10 w-full items-center justify-center rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-white transition-colors hover:bg-[#101114] disabled:opacity-60"
        >
          {pending ? 'Signing in…' : 'Sign In'}
        </button>
        <p className="flex items-center gap-1 font-sans text-[14px] leading-[1.14]">
          <span className="font-normal text-[#7D7B7B]">New here?</span>
          <a href="/signup" className="font-semibold text-[#0A1B49]">
            Create Account
          </a>
        </p>
      </div>
    </Form>
  )
}
