'use client'

/**
 * Request a sign-in link — the screen behind "Trouble signing in?".
 *
 * One field and a send, the same shape as `ResetRequestForm`. It exists because
 * `/magic-link` was linked from sign-in but never built, so the link bounced to
 * the sign-in screen it came from.
 *
 * Like the button on sign-in, this posts natively when JavaScript has not
 * arrived: the form carries a real `action` and `method`, and the route answers
 * a form post with a 303 to frame 34. The submit handler below is the enhanced
 * path, not the only one — a person who clicks before hydration still gets
 * their link rather than nothing at all.
 *
 * No password is involved and none is asked for. Possession of the inbox is the
 * proof, which is the whole point of the flow.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Form, TextInput } from '@/components/ui'
import { FieldError } from '@/components/ui/FormField'
import { Icon } from '@/components/common'
import { AuthNotice } from './AuthNotice'
import { validateEmail } from '../validation'

export function MagicLinkRequestForm({ initialEmail = '' }: { initialEmail?: string }) {
  const [email, setEmail] = useState(initialEmail)
  const [fieldError, setFieldError] = useState<string | undefined>()
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    // Only prevent the native post once we are certain we can do the job in
    // JavaScript. If anything below throws before this point the browser has
    // already been stopped, and the person gets nothing.
    e.preventDefault()
    if (pending) return

    setNotice(null)
    const invalid = validateEmail(email)
    setFieldError(invalid)
    if (invalid) return

    setPending(true)
    try {
      const res = await fetch('/api/magic-link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setNotice(body?.message ?? 'We couldn’t send that link. Please try again.')
        return
      }
      window.location.href = `/magic-link/sent?email=${encodeURIComponent(email.trim())}`
    } catch {
      setNotice('Network error. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Form
      onSubmit={handleSubmit}
      action="/api/magic-link"
      method="post"
      className="flex w-full flex-col gap-6"
    >
      <h1 className="text-center font-heading text-[24px] font-medium leading-[1.21] text-black">
        Get a sign-in link
      </h1>

      {notice && <AuthNotice>{notice}</AuthNotice>}

      <div className="flex flex-col gap-[6px]">
        <label
          htmlFor="magic-email"
          className="font-sans text-[12px] font-medium leading-[1.21] text-black/90"
        >
          Email
        </label>
        <TextInput
          id="magic-email"
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
          aria-describedby={fieldError ? 'magic-email-error' : undefined}
        />
        {fieldError && <FieldError id="magic-email-error">{fieldError}</FieldError>}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="flex h-10 w-full items-center justify-center rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-white transition-colors hover:bg-[#101114] disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send sign-in link'}
      </button>

      <p className="flex items-center justify-center gap-1 font-sans text-[14px] leading-[1.14]">
        <span className="font-normal text-[#7D7B7B]">Remembered it?</span>
        <a href="/signin" className="font-semibold text-[#0A1B49]">
          Sign in
        </a>
      </p>
    </Form>
  )
}
