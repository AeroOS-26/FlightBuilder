'use client'

/**
 * Global top navigation bar.
 *
 * Brand mark + primary nav on the left; the "Dashboard" pill and the Founder's
 * real member identity on the right. Per the member-identity product rule, the
 * Founder is shown by their real name here; other members on public surfaces
 * are shown by label only (enforced on those surfaces).
 */

import { useEffect, useId, useRef, useState } from 'react'
import { Logo, Icon } from '@/components/common'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import { AccountMenu } from '@/features/auth/components/AccountMenu'

const NAV_LINKS = [
  { label: 'How it works' },
  { label: 'Empty Legs' },
]

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
            <a href="/" aria-label="Perro Air home" className="focus-ring rounded-md">
              <Logo />
            </a>
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
          </div>

          <div className="flex items-center gap-2 sm:gap-4">
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
            <span className="hidden rounded-[12px] bg-[linear-gradient(90deg,#1946C5_0%,#E96A6F_100%)] p-px shadow-[0px_8px_24px_0px_rgba(233,106,111,0.15)] lg:inline-flex">
              <button
                type="button"
                className="flex h-8 items-center gap-2 rounded-[11px] bg-white px-4 font-sans text-[14px] font-medium leading-4 tracking-normal text-[#000000] transition-colors hover:bg-[#FAFAFA] focus-ring"
              >
                <img src="/svg/headerdashboardicon.svg" alt="" className="h-4 w-[17px]" />
                Dashboard
              </button>
            </span>
            <span className="hidden h-[21px] w-px bg-[#CFE3F1] sm:block"></span>
            {/* The chevron always implied a menu; until 26 Aug there was none,
                which is where the missing sign-out was hiding. */}
            <AccountMenu
              email={founder?.email}
              triggerClassName="flex items-center gap-2 rounded-[16px] py-1 pl-1 pr-1 sm:pr-2"
            >
              <span className="relative shrink-0">
                <img
                  src="/svg/headerprofile.svg"
                  alt={founder?.name ?? 'Member'}
                  className="h-9 w-9 rounded-[16px]"
                />
                <span
                  aria-hidden="true"
                  className="absolute bottom-0 right-0 h-2 w-2 rounded-full bg-success shadow-[0_0_0_1px_#FFFFFF]"
                />
              </span>
              <span className="hidden text-[14px] font-medium text-[#28262D] sm:inline">
                {founder?.name ?? 'Member'}
              </span>
              <Icon name="chevron-down" size={20} className="hidden text-[#E96A6F] sm:block" />
            </AccountMenu>
          </div>
        </div>

        {menuOpen && (
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