'use client'

/**
 * Layout shell for the public Shared Flight Detail page.
 *
 * A public marketing-style header and footer (this page is anonymous — no
 * member identity, no builder chrome), then a two-column body: the main flight
 * content on the left, the info panels on the right, collapsing to a single
 * stacked column on mobile. Edge states (Not found) render their own centered
 * content and skip the two columns.
 */

import { useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Logo, Icon } from '@/components/common'
import { Button } from '@/components/ui'
import { BrokerDisclosureFooter } from '@/components/common'
import { AccountMenu } from '@/features/auth/components/AccountMenu'
import { env } from '@/config/env'
import type { ShareViewer } from '../PublicFlightPage'

/**
 * Public marketing nav — matches the hi-fi (no member/dashboard chrome).
 *
 * These are pages on the marketing site, not screens in this app. Every one of
 * them pointed at `/`, which redirects into the Flight Builder — so a prospect
 * who clicked "About" on a shared flight landed in a booking flow.
 *
 * `path` is appended to the marketing site origin. They all point at its home
 * page until Charles sends the real slugs; filling them in is then one edit
 * each, and no link dead-ends into the builder in the meantime.
 */
const NAV_LINKS: { label: string; path: string }[] = [
  { label: 'Home', path: '' },
  { label: 'Empty Legs', path: '' },
  { label: 'Private Charter', path: '' },
  { label: 'How it works', path: '' },
  { label: 'About', path: '' },
  { label: 'Contact', path: '' },
]

const marketingHref = (path: string) => `${env.marketingSiteUrl}${path}`

interface PublicHeaderProps {
  viewer?: ShareViewer
}

function PublicHeader({ viewer }: PublicHeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const router = useRouter()
  const isLoggedIn = !!viewer

  const handleSignIn = () => {
    router.push('/signin')
  }

  return (
    <header className="border-b border-[#F2F2F2] bg-white">
      <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-[50px]">
        <a
          href={env.marketingSiteUrl}
          aria-label="Perro Air home"
          className="focus-ring rounded-md"
        >
          <Logo />
        </a>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.label}
              href={marketingHref(link.path)}
              className="font-sans text-[14px] font-medium text-[#000000]/80 transition-colors hover:text-[#000000] focus-ring rounded-md"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop actions — conditional based on auth state */}
        {isLoggedIn ? (
          <AccountMenu triggerClassName="hidden lg:flex h-10 items-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors hover:bg-[#CFE3F1]/40 focus-ring">
            <span className="flex size-6 items-center justify-center rounded-full bg-[#1946C5] font-sans text-xs font-medium text-white">
              {/* Placeholder avatar */}U
            </span>
            <Icon name="chevron-down" size={16} className="text-[#000000]" />
          </AccountMenu>
        ) : (
          <div className="hidden items-center gap-3 lg:flex">
            <Button variant="secondary" className="gap-1.5" onClick={handleSignIn}>
              <img
                src="/svg/profileIcon.svg"
                alt=""
                aria-hidden="true"
                className="size-[18px] shrink-0"
              />
              Sign In
            </Button>
            <Button>Join Flight Club</Button>
          </div>
        )}

        {/* Mobile menu button. The hi-fi draws a two-line glyph inside a squircle
            with the same blue→red gradient edge the Sign In button carries, so
            the border is a 1px gradient layer under a white face rather than a
            solid stroke. */}
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="rounded-[15px] bg-[linear-gradient(122deg,#1946C5_0%,#E96A6F_84%)] p-px focus-ring lg:hidden"
        >
          <span className="flex size-10 items-center justify-center rounded-[14px] bg-white text-[#112D7C]">
            {menuOpen ? (
              <Icon name="close" size={20} />
            ) : (
              <svg viewBox="0 0 24 24" width={22} height={22} fill="none" aria-hidden="true">
                <path
                  d="M6 9.5h12M6 14.5h12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            )}
          </span>
        </button>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <nav
          aria-label="Primary"
          className="border-t border-[#EAEAEA] bg-white px-4 py-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((link) => (
              <li key={link.label}>
                <a
                  href={marketingHref(link.path)}
                  className="block py-2.5 font-sans text-[15px] font-medium text-[#000000]/85 focus-ring rounded-md"
                >
                  {link.label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            {isLoggedIn ? (
              <AccountMenu>
                <span className="flex w-full items-center justify-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] py-2.5 font-sans text-[14px] font-medium text-[#000000]">
                  <span className="flex size-6 items-center justify-center rounded-full bg-[#1946C5] font-sans text-xs font-medium text-white">
                    U
                  </span>
                  Account
                </span>
              </AccountMenu>
            ) : (
              <>
                <Button variant="secondary" className="w-full" onClick={handleSignIn}>
                  Sign In
                </Button>
                <Button className="w-full">Join Flight Club</Button>
              </>
            )}
          </div>
        </nav>
      )}
    </header>
  )
}

interface PublicPageShellProps {
  children: ReactNode
  viewer?: ShareViewer
}

export function PublicPageShell({ children, viewer }: PublicPageShellProps) {
  return (
    <div className="flex min-h-svh flex-col bg-[#F8F8F8]">
      <PublicHeader viewer={viewer} />

      <main className="flex-1">
        {/* Content lines up with the header: same 1440 frame, ~50px side inset
            (the hi-fi's 1340 content inside a 1440 page). */}
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-[50px] lg:py-8">
          {children}
        </div>
      </main>

      <BrokerDisclosureFooter />
    </div>
  )
}

/**
 * Two-column body: main content left, info panels right on desktop.
 *
 * On mobile the info panels move ABOVE the main content (right after the hero)
 * and collapse to accordions — matching the hi-fi mobile flow, the same pattern
 * the Flight Builder uses. Order is flipped with `order-*` so the panels lead on
 * mobile but sit in the right column on desktop.
 */
export function PublicTwoColumn({
  main,
  aside,
}: {
  main: ReactNode
  aside: ReactNode
}) {
  return (
    <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] lg:items-start lg:gap-6">
      <aside className="order-1 flex flex-col gap-3 lg:order-none lg:col-start-2 lg:row-start-1 lg:gap-5">
        {aside}
      </aside>
      <div className="order-2 flex flex-col gap-5 lg:order-none lg:col-start-1 lg:row-start-1">
        {main}
      </div>
    </div>
  )
}
