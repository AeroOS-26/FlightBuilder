'use client'

/**
 * Create account — frame 33.
 *
 * The frame is named "33 · AUTH - Email already exists", but it is not a
 * sign-in variant: it is the registration screen itself, drawn in its taken-email
 * error state. Its own copy makes that plain — "Create your free account", a
 * "Create Account" primary, and "Already have an account? Sign In". The clean
 * state is the same screen with `error` unset, which is why both live here.
 *
 * The error treatment reuses the shared TextInput/FieldError pair rather than
 * restyling: the project's `--color-danger-text` (#D00416) and
 * `--color-error-input-bg` (rgba(233,106,111,0.1)) already match the frame's
 * values exactly.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Form, TextInput } from '@/components/ui'
import { FieldError } from '@/components/ui/FormField'
import { Icon } from '@/components/common'
import { PasswordInput } from './PasswordInput'
import { SsoRow } from './SsoRow'
import { AuthNotice } from './AuthNotice'
import { signUp, generalMessage } from '../data/authService'
import { validateSignUp, isClean, type SignInErrors } from '../validation'

/** Which inline error the form is showing, if any. */
export type SignUpError = 'none' | 'email-exists'

interface SignUpFormProps {
  /** Forces the taken-email state for design review via `?error=`. */
  error?: SignUpError
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

export function SignUpForm({ error = 'none' }: SignUpFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<SignInErrors>({})
  const [taken, setTaken] = useState(false)
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    setNotice(null)
    setTaken(false)

    const errors = validateSignUp({ email, password })
    setFieldErrors(errors)
    if (!isClean(errors)) return

    setPending(true)
    const result = await signUp({ email, password })

    if (result.ok) {
      // Frame 36 next: the account exists but is unverified. It names the
      // address, so it travels in the URL.
      window.location.href = `/verify-email?email=${encodeURIComponent(email.trim())}`
      return
    }
    setPending(false)

    if (result.failure.kind === 'email-exists') {
      setTaken(true)
      return
    }
    setNotice(generalMessage(result.failure))
  }

  // A live submit takes precedence over the review parameter.
  const emailTaken = taken || error === 'email-exists'

  // The field turns red for *any* reason it is showing a message — a taken
  // address and a malformed one look the same to the person reading it. Naming
  // and shape match SignInForm so the two screens cannot drift apart.
  const emailInvalid = emailTaken || Boolean(fieldErrors.email)

  return (
    <Form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      <header className="flex flex-col items-center gap-[6px]">
        <h1 className="font-heading text-[24px] font-medium leading-[1.21] text-black">
          Create your free account
        </h1>
        <p className="text-center font-sans text-[14px] font-normal leading-[1.3] text-black/70">
          Takes about a minute. No paid tier, no commitment.
        </p>
      </header>

      <SsoRow />

      <div className="flex flex-col items-center gap-[22px]">
        {notice && <AuthNotice>{notice}</AuthNotice>}

        <div className="flex w-full flex-col gap-4">
          {/* The error variant opens the field group to gap 8 to seat the message. */}
          <div className={emailInvalid ? 'flex flex-col gap-2' : 'flex flex-col gap-[6px]'}>
            <div className="flex flex-col gap-[6px]">
              <FieldLabel htmlFor="signup-email">Email</FieldLabel>
              <TextInput
                id="signup-email"
                type="email"
                name="email"
                autoComplete="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  setTaken(false)
                  if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
                }}
                invalid={emailInvalid}
                endAdornment={
                  <span className={emailInvalid ? 'text-danger-text' : 'text-[#6D6D6D]'}>
                    <Icon name="mail" size={16} />
                  </span>
                }
                aria-describedby={emailInvalid ? 'signup-email-error' : undefined}
              />
            </div>
            {fieldErrors.email ? (
              <FieldError id="signup-email-error" className="items-start">
                {fieldErrors.email}
              </FieldError>
            ) : (
              emailTaken && (
                <FieldError id="signup-email-error" className="items-start">
                  That email already has a Flight Club account. Sign in instead, or use a different
                  email.
                </FieldError>
              )
            )}
          </div>

          <div className="flex flex-col gap-[6px]">
            <FieldLabel htmlFor="signup-password">Password</FieldLabel>
            <PasswordInput
              id="signup-password"
              name="password"
              autoComplete="new-password"
              placeholder="Enter Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
              }}
              invalid={Boolean(fieldErrors.password)}
              aria-describedby={fieldErrors.password ? 'signup-password-error' : undefined}
            />
            {fieldErrors.password && (
              <FieldError id="signup-password-error" className="items-start">
                {fieldErrors.password}
              </FieldError>
            )}
          </div>
        </div>

      </div>

      <div className="flex flex-col items-center gap-[18px]">
        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-white transition-colors hover:bg-[#101114] disabled:opacity-60"
        >
          {pending ? 'Creating…' : 'Create Account'}
        </button>
        <p className="flex items-center gap-1 font-sans text-[14px] leading-[1.14]">
          <span className="font-normal text-[#7D7B7B]">Already have an account?</span>
          <a href="/signin" className="font-semibold text-[#0A1B49]">
            Sign In
          </a>
        </p>
      </div>
    </Form>
  )
}
