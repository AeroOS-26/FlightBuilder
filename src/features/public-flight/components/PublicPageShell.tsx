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
import { Logo, Icon } from '@/components/common'
import { Button } from '@/components/ui'

/** Public marketing nav — matches the hi-fi (no member/dashboard chrome). */
const NAV_LINKS = ['Home', 'Empty Legs', 'Private Charter', 'How it works', 'About', 'Contact']

function PublicHeader() {
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <header className="border-b border-[#F2F2F2] bg-white">
      <div className="mx-auto flex h-[68px] w-full max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-[50px]">
        <a href="/" aria-label="Perro Air home" className="focus-ring rounded-md">
          <Logo />
        </a>

        {/* Desktop nav */}
        <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
          {NAV_LINKS.map((label) => (
            <a
              key={label}
              href="/"
              className="font-sans text-[14px] font-medium text-[#000000]/80 transition-colors hover:text-[#000000] focus-ring rounded-md"
            >
              {label}
            </a>
          ))}
        </nav>

        {/* Desktop actions — logged-out state: Sign In + Join Flight Club. */}
        <div className="hidden items-center gap-3 lg:flex">
          <Button variant="secondary" className="gap-1.5">
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

        {/* Mobile hamburger */}
        <button
          type="button"
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="flex size-10 items-center justify-center rounded-[10px] border border-[#98C3E1] text-[#112D7C] focus-ring lg:hidden"
        >
          <Icon name={menuOpen ? 'close' : 'grid'} size={20} />
        </button>
      </div>

      {/* Mobile menu drawer */}
      {menuOpen && (
        <nav
          aria-label="Primary"
          className="border-t border-[#EAEAEA] bg-white px-4 py-3 lg:hidden"
        >
          <ul className="flex flex-col">
            {NAV_LINKS.map((label) => (
              <li key={label}>
                <a
                  href="/"
                  className="block py-2.5 font-sans text-[15px] font-medium text-[#000000]/85 focus-ring rounded-md"
                >
                  {label}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-col gap-2">
            <Button variant="secondary" className="w-full">
              Sign In
            </Button>
            <Button className="w-full">Join Flight Club</Button>
          </div>
        </nav>
      )}
    </header>
  )
}

export function PublicPageShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-[#F8F8F8]">
      <PublicHeader />

      <main className="flex-1">
        {/* Content lines up with the header: same 1440 frame, ~50px side inset
            (the hi-fi's 1340 content inside a 1440 page). */}
        <div className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-[50px] lg:py-8">
          {children}
        </div>
      </main>

      <footer className="border-t border-[#F2F2F2] bg-white">
        <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-2 px-4 py-4 text-center text-[12px] text-[#000000]/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-[50px]">
          <span className="max-w-[820px]">
            Flights arranged by Perro Air, LLC and operated by direct air carriers certified under
            FAA Part 135, 121 or 129. The operating carrier maintains full operational control.
          </span>
          <span className="shrink-0">© Perro Air · perroair.com</span>
        </div>
      </footer>
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
