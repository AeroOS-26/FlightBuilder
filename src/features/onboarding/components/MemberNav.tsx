/**
 * Signed-in site navigation — the bar on frame 31.
 *
 * This is not the Flight Builder's TopNav: that one carries the builder's own
 * chrome, while frame 31 sits on the marketing site's nav with the member's
 * avatar on the right. Kept in `features/onboarding` for now because frame 31
 * is its only consumer; lift it to `components/` when the dashboard needs it.
 *
 * From the frame: 68 tall, white on a #F2F2F2 hairline, padding 14/24/14/20,
 * links Inter Tight 400/14, avatar 36 square radius 12 with an 8px online dot.
 */

import { Logo } from '@/components/common'
import { AccountMenu } from '@/features/auth/components/AccountMenu'

const LINKS = [
  { label: 'Home', href: '/' },
  { label: 'Empty Legs', href: '/empty-legs' },
  { label: 'Private Charter', href: '/private-charter' },
  { label: 'How it works', href: '/how-it-works' },
  { label: 'About', href: '/about' },
  { label: 'Contact', href: '/contact' },
]

interface MemberNavProps {
  name: string
  avatarSrc?: string
  /** Shown in the account menu, so a member can tell which account they are in. */
  email?: string | null
}

export function MemberNav({ name, avatarSrc, email }: MemberNavProps) {
  const avatar = (
    <span className="relative block size-9 shrink-0 overflow-hidden rounded-[12px] bg-[#E7EAF2]">
      {avatarSrc && (
        // eslint-disable-next-line @next/next/no-img-element -- member avatar
        <img src={avatarSrc} alt="" className="size-full object-cover" />
      )}
      <span
        aria-hidden="true"
        className="absolute bottom-0 right-0 size-2 rounded-full border-2 border-white bg-[#109A51]"
      />
    </span>
  )

  return (
    <header className="w-full border-b border-[#F2F2F2] bg-white">
      {/* Mobile navbar — the artboard uses a different component from desktop:
          logo, then a menu button and the avatar. No inline links, no name. */}
      <div className="mx-auto flex h-16 w-full items-center justify-between gap-4 px-4 lg:hidden">
        <Logo className="w-[116px] shrink-0" />
        <div className="flex items-center gap-3">
          <button
            type="button"
            aria-label="Open menu"
            className="flex size-9 items-center justify-center rounded-[12px] border border-[#E7EAF2] bg-white"
          >
            <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden="true">
              <path
                d="M4 7h16M4 12h16M4 17h16"
                stroke="#28262D"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
          </button>
          {/* The avatar is the only account affordance on mobile, so the menu
              has to hang off it here too — otherwise a member on a phone has
              no way to sign out at all. */}
          <AccountMenu email={email} triggerClassName="flex items-center">
            {avatar}
          </AccountMenu>
        </div>
      </div>

      {/* Desktop navbar — 68 tall, inline links, avatar with the member's name. */}
      <div className="mx-auto hidden h-[68px] w-full max-w-[1440px] items-center justify-between gap-6 pl-5 pr-6 lg:flex">
        <Logo className="w-[152px] shrink-0" />

        <nav className="flex items-center gap-8">
          {LINKS.map((l) => (
            <a
              key={l.label}
              href={l.href}
              className="whitespace-nowrap font-sans text-[14px] font-normal leading-[1.14] text-black transition-opacity hover:opacity-70"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <AccountMenu email={email} triggerClassName="flex shrink-0 items-center gap-2">
          <span className="flex items-center gap-[10px]">
            {avatar}
            <span className="font-sans text-[14px] font-medium leading-4 text-[#28262D]">
              {name}
            </span>
          </span>
          <svg viewBox="0 0 24 24" width={18} height={18} fill="none" aria-hidden="true">
            <path
              d="m6 9 6 6 6-6"
              stroke="#28262D"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </AccountMenu>
      </div>
    </header>
  )
}

/**
 * Site footer from the same frame: the FAA operating-control line that the
 * public join page also carries, plus the copyright.
 */
export function MemberFooter() {
  return (
    <footer className="w-full bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:px-[50px]">
        <p className="max-w-[820px] font-sans text-[14px] font-medium leading-[1.4] text-black lg:text-[16px]">
          Flights arranged by Perro Air, LLC and operated by direct air carriers certified under
          FAA Part 135, 121 or 129. The operating carrier maintains full operational control.
        </p>
        <p className="whitespace-nowrap font-sans text-[14px] font-medium leading-[1.4] text-black lg:text-[16px]">
          © PERRO AIR · PERROAIR.COM
        </p>
      </div>
    </footer>
  )
}
