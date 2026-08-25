'use client'

/**
 * The resend button on frames 36 and 37B.
 *
 * The frames draw it as the card's primary, so it is a button rather than a
 * link: it calls the service, shows a pending label, and confirms in place.
 * Rate limiting is the server's job, but a short local cooldown stops a visitor
 * hammering it while the request is in flight or immediately after.
 */

import { useEffect, useState } from 'react'
import { AuthNotice } from './AuthNotice'
import { generalMessage, resendVerification, resendPasswordReset } from '../data/authService'

const COOLDOWN_SECONDS = 30

/**
 * Which link to resend. A string rather than a callback, because these cards
 * are rendered from server components and a function prop cannot cross that
 * boundary.
 */
type ResendKind = 'verification' | 'reset'

const SEND: Record<ResendKind, (email: string) => ReturnType<typeof resendVerification>> = {
  verification: resendVerification,
  reset: resendPasswordReset,
}

interface ResendActionProps {
  label: string
  kind: ResendKind
  email: string
  /** Confirmation shown after a successful send. */
  successMessage: string
}

export function ResendAction({ label, kind, email, successMessage }: ResendActionProps) {
  const [pending, setPending] = useState(false)
  const [cooldown, setCooldown] = useState(0)
  const [notice, setNotice] = useState<{ tone: 'error' | 'success'; text: string } | null>(null)

  useEffect(() => {
    if (cooldown <= 0) return
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [cooldown])

  async function handleClick() {
    if (pending || cooldown > 0) return
    setNotice(null)
    setPending(true)
    const result = await SEND[kind](email)
    setPending(false)

    if (result.ok) {
      setNotice({ tone: 'success', text: successMessage })
      setCooldown(COOLDOWN_SECONDS)
      return
    }
    setNotice({ tone: 'error', text: generalMessage(result.failure) ?? 'That didn’t send.' })
  }

  return (
    <div className="flex flex-col gap-3">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending || cooldown > 0}
        className="flex h-10 w-full items-center justify-center rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-white transition-colors hover:bg-[#101114] disabled:opacity-60"
      >
        {pending ? 'Sending…' : cooldown > 0 ? `Resend in ${cooldown}s` : label}
      </button>
      {notice && <AuthNotice tone={notice.tone}>{notice.text}</AuthNotice>}
    </div>
  )
}
