'use client'

/**
 * "Save your spot" — the MVP interest-capture form.
 *
 * Collects name, email, and optional phone and submits the interest lead to our
 * own API route (which forwards to the CRM server-side). On success the caller
 * advances to the confirmation state; failures surface a handled error with a
 * retry. There is no account and no auto-join — this is a lighter interest
 * capture per the contract (section 5).
 *
 * Two contract-driven choices, where section 5 overrides the hi-fi:
 *  - No pet field. The MVP form does not collect pet details.
 *  - A honeypot field (visually hidden, off to assistive tech) is submitted with
 *    the form; the server rejects any submission that fills it.
 */

import { useState } from 'react'
import { Button, FieldError, FormField, TextInput, ErrorBanner } from '@/components/ui'
import { Icon } from '@/components/common'
import { useSubmitLead } from '../hooks/useSubmitLead'

const cardClass = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-5 lg:p-6'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

interface LeadCaptureFormProps {
  /** The flight this interest lead attaches to. */
  groupId: string
  /** Called with the lead id when the submission succeeds. */
  onSuccess: (leadId?: string) => void
}

interface FieldErrors {
  name?: string
  email?: string
}

export function LeadCaptureForm({ groupId, onSuccess }: LeadCaptureFormProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [honeypot, setHoneypot] = useState('')
  const [errors, setErrors] = useState<FieldErrors>({})

  const { submitAsync, isPending, isError, error, reset } = useSubmitLead()

  function validate(): FieldErrors {
    const next: FieldErrors = {}
    if (name.trim().length === 0) next.name = 'Please enter your name.'
    if (!EMAIL_RE.test(email.trim())) next.email = 'Please enter a valid email.'
    return next
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    if (Object.keys(found).length > 0) return

    try {
      const res = await submitAsync({
        name: name.trim(),
        email: email.trim(),
        phone: phone.trim() ? phone.trim() : null,
        group_id: groupId,
        company_website: honeypot,
      })
      if (res.success) {
        onSuccess(res.lead_id)
      }
      // A handled { success: false } falls through to the error banner below.
    } catch {
      // Thrown ApiError is captured by the hook and shown via `isError`.
    }
  }

  return (
    <section className={cardClass}>
      <h2 className="font-heading text-[20px] font-medium text-[#000000] lg:text-[24px]">
        Register your interest in this flight
      </h2>
      <p className="mt-1 font-sans text-[14px] text-[#000000]/70">
        Add your details and we’ll keep you posted as the group comes together.
      </p>

      {isError && error && (
        <ErrorBanner className="mt-4">{error.message}</ErrorBanner>
      )}

      <form className="mt-5 flex flex-col gap-4" onSubmit={handleSubmit} noValidate>
        {/* Honeypot — hidden from users and assistive tech; the server rejects
            any submission that fills it. */}
        <div aria-hidden="true" className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
          <label htmlFor="company-website" aria-hidden="true">
            Company website
          </label>
          <input
            id="company-website"
            name="company_website"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            value={honeypot}
            onChange={(e) => setHoneypot(e.target.value)}
          />
        </div>

        <FormField label="Full name" htmlFor="lead-name" error={errors.name}>
          <TextInput
            id="lead-name"
            placeholder="Your name"
            autoComplete="name"
            value={name}
            invalid={Boolean(errors.name)}
            onChange={(e) => {
              setName(e.target.value)
              if (errors.name) setErrors((p) => ({ ...p, name: undefined }))
              if (isError) reset()
            }}
          />
        </FormField>

        <FormField label="Email" htmlFor="lead-email" error={errors.email}>
          <TextInput
            id="lead-email"
            type="email"
            placeholder="you@email.com"
            autoComplete="email"
            value={email}
            invalid={Boolean(errors.email)}
            onChange={(e) => {
              setEmail(e.target.value)
              if (errors.email) setErrors((p) => ({ ...p, email: undefined }))
              if (isError) reset()
            }}
          />
        </FormField>

        <FormField label="Phone (optional)" htmlFor="lead-phone">
          <TextInput
            id="lead-phone"
            type="tel"
            placeholder="(555) 000-0000"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
        </FormField>

        <Button
          type="submit"
          className="mt-1 w-full"
          loading={isPending}
          disabled={isPending}
          trailingAdornment={
            !isPending ? (
              <img
                src="/svg/whiteArrow.svg"
                alt=""
                aria-hidden="true"
                className="size-[18px] shrink-0"
              />
            ) : undefined
          }
        >
          {isPending ? 'Registering your interest…' : 'Register my interest'}
        </Button>

        <p className="flex items-center justify-center gap-1.5 font-sans text-[12px] text-[#000000]/60">
          <Icon name="info" size={14} className="shrink-0" />
          No account needed — we’ll email you as the group fills.
        </p>
      </form>
    </section>
  )
}
