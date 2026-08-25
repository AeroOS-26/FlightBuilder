'use client'

/**
 * Reset your password — frame 37.
 *
 * One field and a send. On success it advances to frame 37B, carrying the
 * address so the confirmation can name it, which is what that frame shows.
 *
 * The service resolves ok for any valid address by design — answering
 * "no such account" here would leak which emails are registered, and the frame
 * draws no not-found state for this screen.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Form, TextInput } from '@/components/ui'
import { FieldError } from '@/components/ui/FormField'
import { Icon } from '@/components/common'
import { AuthNotice } from './AuthNotice'
import { requestPasswordReset, generalMessage } from '../data/authService'
import { validateResetRequest, isClean } from '../validation'

export function ResetRequestForm() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    setNotice(null)
    const errors = validateResetRequest(email)
    setFieldError(errors.email)
    if (!isClean(errors)) return

    setPending(true)
    const result = await requestPasswordReset(email)
    setPending(false)

    if (result.ok) {
      router.push(`/reset-password/sent?email=${encodeURIComponent(email.trim())}`)
      return
    }
    setNotice(generalMessage(result.failure))
  }

  return (
    <Form onSubmit={handleSubmit} className="flex w-full flex-col gap-6">
      <h1 className="text-center font-heading text-[24px] font-medium leading-[1.21] text-black">
        Reset your password
      </h1>

      {notice && <AuthNotice>{notice}</AuthNotice>}

      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="reset-email"
          className="font-sans text-[12px] font-medium leading-[1.21] text-black/90"
        >
          Email
        </label>
        <TextInput
          id="reset-email"
          type="email"
          name="email"
          autoComplete="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value)
            if (fieldError) setFieldError(undefined)
          }}
          invalid={Boolean(fieldError)}
          endAdornment={
            <span className="text-[#6D6D6D]">
              <Icon name="mail" size={16} />
            </span>
          }
          aria-describedby={fieldError ? 'reset-email-error' : undefined}
        />
        {fieldError && (
          <FieldError id="reset-email-error" className="items-start">
            {fieldError}
          </FieldError>
        )}
      </div>

      <div className="flex flex-col items-center gap-[18px]">
        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-white transition-colors hover:bg-[#101114] disabled:opacity-60"
        >
          {pending ? 'Sending…' : 'Send reset link'}
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
