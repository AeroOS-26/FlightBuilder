'use client'

/**
 * The account dropdown behind the avatar, and the only place a member can sign
 * out.
 *
 * Both navs already drew an avatar with a chevron beside it — the affordance of
 * a menu — but the trigger was a `<button>` with no handler, so it looked
 * interactive and did nothing. Sign-out is in the Milestone 1 scope and this is
 * where a person looks for it.
 *
 * The trigger's markup is passed in rather than defined here: the Flight
 * Builder's nav and the onboarding nav come from different frames and must keep
 * their own avatar treatment. This component owns the behaviour, not the look.
 */

import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { signOut } from 'next-auth/react'
import { Icon } from '@/components/common'
import { cn } from '@/utils/cn'

interface AccountMenuProps {
  /** The avatar / name / chevron exactly as the surrounding nav draws it. */
  children: ReactNode
  /** Classes for the trigger, so each nav keeps its own frame's styling. */
  triggerClassName?: string
  /** Shown above the actions when the nav does not already display it. */
  email?: string | null
}

export function AccountMenu({ children, triggerClassName, email }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Close on an outside click or Escape — the two things a person expects of a
  // menu, and the two whose absence makes one feel broken.
  useEffect(() => {
    if (!open) return
    function onPointerDown(e: MouseEvent) {
      if (!wrapperRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  async function handleSignOut() {
    if (pending) return
    setPending(true)
    // A full navigation rather than a router push: every server component
    // downstream reads the session, and they must all re-render without it.
    await signOut({ callbackUrl: '/signin' })
  }

  return (
    <div ref={wrapperRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className={triggerClassName}
      >
        {children}
      </button>

      {open && (
        <div
          role="menu"
          className={cn(
            'absolute right-0 top-full z-50 mt-2 min-w-[200px] overflow-hidden rounded-[12px]',
            'border border-[#E7EAF2] bg-white py-1 shadow-[0_8px_24px_rgba(0,0,0,0.12)]',
          )}
        >
          {email && (
            <p className="truncate border-b border-[#F2F2F2] px-4 py-2 font-sans text-[12px] leading-4 text-black/60">
              {email}
            </p>
          )}
          {/* Sign out is the only entry. A profile link belongs here too, but
              that surface is not finished — an item that goes somewhere
              half-built is worse than one that is not offered yet. */}
          <button
            role="menuitem"
            type="button"
            onClick={handleSignOut}
            disabled={pending}
            className="flex w-full items-center gap-2.5 px-4 py-2.5 text-left font-sans text-[14px] leading-4 text-[#28262D] transition-colors hover:bg-[#F5F9FC] disabled:opacity-60"
          >
            <Icon name="sign-out" size={16} className="shrink-0 text-[#6D6D6D]" />
            {pending ? 'Signing out…' : 'Sign out'}
          </button>
        </div>
      )}
    </div>
  )
}
