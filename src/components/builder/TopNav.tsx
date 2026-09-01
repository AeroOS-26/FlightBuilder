'use client'

/**
 * Global top navigation bar.
 *
 * Brand mark + primary nav on the left; the "Dashboard" pill and the Founder's
 * real member identity on the right. Per the member-identity product rule, the
 * Founder is shown by their real name here; other members on public surfaces
 * are shown by label only (enforced on those surfaces).
 *
 * Everything except the brand mark is behind `MEMBER_AREA_ENABLED` — nav links,
 * Dashboard, the account button and the mobile drawer all lead to screens that
 * do not exist yet. The brand mark stays and points at the marketing site: with
 * the rest hidden it is the only way out of the builder, and it used to link to
 * `/`, which redirects straight back into the builder.
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Logo, Icon } from '@/components/common'
import { env } from '@/config/env'
import { MEMBER_AREA_ENABLED } from '@/config/features'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import { AccountMenu } from '@/features/auth/components/AccountMenu'

const NAV_LINKS = [
  { label: 'How it works' },
  { label: 'Empty Legs' },
]

/**
 * Avatar initials.
 *
 * Sign-up (frame 30B) collects only an email and a password, so `name` is null
 * for every member until they complete their profile — and profile completion
 * is deliberately not a gate. The email fallback is therefore the common case,
 * not an edge one.
 */
function memberInitials(member: { name?: string | null; email?: string | null } | null): string {
  const name = member?.name?.trim()
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean)
    const first = parts[0]?.[0] ?? ''
    const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : ''
    return (first + last).toUpperCase()
  }
  const email = member?.email?.trim()
  return email ? email[0]!.toUpperCase() : ''
}

export function TopNav() {
  const founder = useFlightBuilderStore((s) => s.founder)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const menuButtonRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      const target = event.target as Node
      if (menuRef.current?.contains(target) || menuButtonRef.current?.contains(target)) {
        return
      }
      setMenuOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  

  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface/85 backdrop-blur-md">
      <div className="mx-auto w-full max-w-[1440px] px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-3">
          <div className="flex items-center gap-7">
            <a
              href={env.marketingSiteUrl}
              aria-label="Perro Air home"
              className="focus-ring rounded-md"
            >
              <Logo />
            </a>
            {/* Not `hidden`, which `lg:flex` would override at desktop widths. */}
            {MEMBER_AREA_ENABLED && (
            <nav className="hidden items-center gap-[8px] lg:flex">
              {NAV_LINKS.map((link) => (
                <button
                  key={link.label}
                  type="button"
                  className="flex h-8 items-center gap-2 whitespace-nowrap rounded-[12px] border border-[#A8A8A8]/20 bg-[#F5F5F5]/45 px-4 font-sans text-[14px] font-medium leading-4 tracking-normal text-[#000000] transition-opacity hover:opacity-70"
                >
                  <img src="/svg/headerdashboardicon.svg" alt="" className="h-4 w-[17px]" />
                  {link.label}
                </button>
              ))}
            </nav>
            )}
          </div>

          {/*
            Two different gates, deliberately.

            `MEMBER_AREA_ENABLED` hides controls that lead nowhere — Dashboard
            and the mobile drawer. The account menu is not one of those: it is
            the **only** sign-out control in the application, so gating it on
            that flag left a signed-in member with no way out. That regression
            arrived at the merge, where this whole cluster went behind one flag.

            It renders on `founder` instead, which is seeded from the server
            session by `useFounderIdentity`. That is correct on both branches:
            no session, no menu (main, where there is no auth to sign out of);
            session present, menu shown (develop).
          */}
          {(MEMBER_AREA_ENABLED || founder) && (
          <div className="flex items-center gap-2 sm:gap-4">
            {MEMBER_AREA_ENABLED && (
            <button
              ref={menuButtonRef}
              type="button"
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              aria-controls={menuId}
              onClick={() => setMenuOpen((open) => !open)}
              className="shrink-0 rounded-[12px] focus-ring lg:hidden"
            >
              <img
                src="/svg/dashboardmobile.svg"
                alt=""
                aria-hidden="true"
                className="size-9"
              />
            </button>
            )}
            {MEMBER_AREA_ENABLED && (
            <span className="hidden rounded-[12px] bg-[linear-gradient(90deg,#1946C5_0%,#E96A6F_100%)] p-px shadow-[0px_8px_24px_0px_rgba(233,106,111,0.15)] lg:inline-flex">
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-[11px] bg-white px-4 font-sans text-[14px] font-medium leading-4 tracking-normal text-[#000000] transition-colors hover:bg-[#FAFAFA] focus-ring"
              >
                <img src="/svg/headerdashboardicon.svg" alt="" className="h-4 w-[17px]" />
                Dashboard
              </button>
            </span>
            )}
            {founder && (
            <>
            <span className="hidden h-[21px] w-px bg-[#CFE3F1] sm:block"></span>
            {/* The chevron always implied a menu; until 26 Aug there was none,
                which is where the missing sign-out was hiding. */}
            <AccountMenu
              email={founder?.email}
              triggerClassName="flex items-center gap-2 rounded-[16px] py-1 pl-1 pr-1 sm:pr-2"
            >
              <span className="relative shrink-0">
                {/*
                  Initials, not `headerprofile.svg`.

                  That asset is a stock photograph of a person embedded in an
                  SVG — 49 KB, shipped on every page, and shown as though it
                  were the signed-in member's own picture. A member seeing a
                  stranger's face labelled as themselves reads as a bug, and it
                  is the sort of thing a client notices immediately.

                  Initials are honest, weigh nothing, and degrade sensibly:
                  full name → first + last initial, otherwise the first letter
                  of the address, otherwise an empty disc.
                */}
                {/*
                  `||`, not `??`. A member who has not completed their profile
                  carries `name: ''`, and `??` only falls through on null — so
                  the nullish form left the avatar with an empty accessible
                  name and the label blank.
                */}
                <span
                  role="img"
                  aria-label={founder?.name?.trim() || founder?.email || 'Member'}
                  className="flex h-9 w-9 items-center justify-center rounded-[16px] bg-[#EEF1FB] font-sans text-[13px] font-semibold uppercase leading-none tracking-wide text-[#1946C5]"
                >
                  {memberInitials(founder)}
                </span>
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-success shadow-[0_0_0_1px_#FFFFFF]"
                />
              </span>
              <span className="hidden text-[14px] font-medium text-[#28262D] sm:inline">
                {founder?.name?.trim() || founder?.email || 'Member'}
              </span>
              <Icon name="chevron-down" size={20} className="hidden text-[#E96A6F] sm:block" />
            </AccountMenu>
            </>
            )}
          </div>
          )}
        </div>

        {MEMBER_AREA_ENABLED && menuOpen && (
          <nav
            id={menuId}
            ref={menuRef}
            aria-label="Mobile navigation"
            className="flex flex-col gap-2 border-t border-[#E0E0E0] py-3 lg:hidden"
          >
            {NAV_LINKS.map((link) => (
              <button
                key={link.label}
                type="button"
                className="flex h-10 w-full items-center gap-2 rounded-[12px] border border-[#A8A8A8]/20 bg-[#F5F5F5]/45 px-4 font-sans text-[14px] font-medium leading-4 tracking-normal text-[#000000] transition-opacity hover:opacity-70"
                onClick={() => setMenuOpen(false)}
              >
                <img src="/svg/headerdashboardicon.svg" alt="" className="h-4 w-[17px]" />
                {link.label}
              </button>
            ))}
          </nav>
        )}
      </div>
    </header>
  )
}