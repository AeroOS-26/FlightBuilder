/**
 * The auth split-screen shell.
 *
 * Ten of Milestone 1's thirteen frames share exactly this scaffold — 30, 32 in
 * its three variants, 33, 34, 35, 36, 37, 37B, 38 and 38B — so it is built once
 * here and each screen supplies only its hero copy and its form. Frame 31
 * (Complete Profile) is the exception: it runs inside the signed-in app chrome,
 * not this shell.
 *
 * Measurements are taken from the hi-fi frame itself (node 1453:45447, 1440×960)
 * rather than eyeballed from an export:
 *   page #EFF1F5 · frame radius 20 · hero inset 14, 720×932, radius 15
 *   right column 706 wide, holding a 406-wide centred form column, gap 24
 * The proportions are expressed as flex rather than pinned pixels so the layout
 * still holds between breakpoints.
 *
 * Mobile is not that layout scaled down. Per the mobile artboards the hero is
 * photography ONLY — the headline, membership card, carousel dots and hero
 * footer are all desktop-only — and the form sits in a white card overlapping
 * the photo, with the small print below it on the page background.
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Logo } from '@/components/common'

interface AuthShellProps {
  /** Hero headline, e.g. "Sign in to continue." — the trailing full stop is part of the copy. */
  heroTitle: ReactNode
  /** Supporting line under the hero headline. */
  heroSubtitle: string
  /** Optional card pinned to the hero (membership card on 30/32, verified badge on 38B). */
  heroCard?: ReactNode
  /**
   * Stack the hero card under the copy instead of beside it.
   *
   * The file has exactly two hero layouts, and they split by what the screen is
   * for. The seven form screens (30, 30B, 32, 33, 34, 36, 37, 38) put the card
   * to the right at x=492 with the subtitle held to 222. The two arrival
   * screens — 35 "You're in." and 38B "You're back in." — run the subtitle to
   * 402 and drop the status card beneath it, left-aligned.
   *
   * Those two are also the only frames whose title fits on one line, which is
   * what frees the width.
   */
  heroCardBelow?: boolean
  /** The form panel content. */
  children: ReactNode
  /** Small print pinned to the bottom of the form column. */
  footerNote?: ReactNode
  /**
   * How wide the right-hand content runs.
   * `form` — the 406 column used by the input screens (30, 32, 33, 37, 38).
   * `card` — the wider result card used by the "sent" screens (36, 37B), which
   *   the frames size to roughly 500 by hugging a 399-wide body inside 50 padding.
   */
  contentWidth?: 'form' | 'card'
  /**
   * Mobile photo height. The artboards use 548 on most screens and 607 on the
   * verification and password-updated screens, whose cards are shorter.
   */
  heroHeightMobile?: 548 | 607
}

const DOTS = [0, 1, 2, 3] as const

/** Hero art, exported from the frame's image fill. */
const HERO_IMAGE = '/images/auth/auth-hero.png'

export function AuthShell({
  heroTitle,
  heroSubtitle,
  heroCard,
  heroCardBelow = false,
  children,
  footerNote,
  contentWidth = 'form',
  heroHeightMobile = 548,
}: AuthShellProps) {
  // The frame is 1440×960, but that is the design canvas, not a page height:
  // pinning 960px forces a scrollbar on any shorter viewport. Desktop fills the
  // viewport instead and never scrolls the page — if a window is short enough
  // that the form cannot fit, the form column scrolls on its own. Mobile keeps
  // its natural height, where scrolling is intended.
  return (
    <div className="min-h-screen bg-[#F8F8F8] lg:h-svh lg:min-h-0 lg:overflow-hidden lg:bg-[#EFF1F5]">
      <div className="relative mx-auto flex min-h-screen w-full max-w-[1440px] flex-col lg:h-full lg:min-h-0 lg:flex-row lg:rounded-[20px] lg:p-[14px]">
        {/* ---------------- Hero */}
        {/* Mobile photo is 548 of the 956-tall artboard; the card then overlaps
            it by 120. Desktop is the left half of the split. */}
        <section
          className={cn(
            'relative flex w-full shrink-0 flex-col justify-between overflow-hidden lg:h-full lg:w-1/2 lg:rounded-[15px]',
            heroHeightMobile === 607 ? 'h-[607px]' : 'h-[548px]',
          )}
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static hero art, sized by CSS */}
          <img
            src={HERO_IMAGE}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 size-full object-cover"
          />
          {/* The frame layers this gradient over the photo — a warm base that
              fades out by 37%, not a neutral scrim. */}
          <div
            aria-hidden="true"
            className="absolute inset-0"
            style={{
              background:
                'linear-gradient(0deg, rgba(156,127,94,1) 21%, rgba(175,148,118,0) 37%)',
            }}
          />

          <div className="relative p-6 lg:px-6 lg:py-6">
            <Logo className="w-[88px] text-white" />
          </div>

          {/* Desktop-only: the mobile artboards show photography and nothing else. */}
          <div className="relative hidden flex-col gap-[54px] px-[30px] pb-3 lg:flex">
            <div
              className={cn(
                'flex gap-6',
                // Arrival screens stack; form screens sit side by side. See the
                // note on `heroCardBelow`.
                heroCardBelow ? 'flex-col items-start' : 'items-end justify-between',
              )}
            >
              <div className="flex shrink-0 flex-col gap-[14px]">
                <h2
                  // A fixed 315px box, exactly as the file has it — every hero
                  // title there is one string in a 315-wide frame with
                  // textAutoResize: HEIGHT, and the line breaks are natural
                  // wraps inside it, not authored breaks. At this width
                  // "Sign in to continue." falls to two lines and "You're in."
                  // stays on one, which is what each frame shows.
                  //
                  // It must be a width, not a max-width: as a max-width the box
                  // collapsed to whatever the flex row allowed (220px at 1440,
                  // 155px at 1220), so the wrap point moved with the viewport.
                  //
                  // The two arrival frames (35 "You're in." and 38B "You're
                  // back in.") are the single-line ones — both 56 tall in the
                  // file where every other hero title is 112. Our Inter Display
                  // renders about 3% wider than the file's, which is enough to
                  // tip "You're back in." (323.6px) over the 315 box and break
                  // it in two. Holding those two on one line states the intent
                  // directly rather than relying on a metric that is off by 9px.
                  className={cn(
                    'w-[315px] font-heading text-[46px] font-semibold leading-[1.21] text-transparent',
                    heroCardBelow && 'whitespace-nowrap',
                  )}
                  style={{
                    backgroundImage:
                      'linear-gradient(90deg, rgba(255,255,255,1) 24%, rgba(193,193,193,1) 77%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                  }}
                >
                  {heroTitle}
                </h2>
                <div className="flex flex-col gap-[22px]">
                  {/* 222 beside the card, 402 above it — the file widens the
                      line once it has the whole column to run across. */}
                  <p
                    className={cn(
                      'font-sans text-[14px] font-normal leading-[1.3] text-white',
                      heroCardBelow ? 'max-w-[402px]' : 'max-w-[223px]',
                    )}
                  >
                    {heroSubtitle}
                  </p>
                  {/* Decorative dashes, not a progress indicator.
                      Two facts from the file, both measured rather than assumed:
                      the seven form frames carry four dashes with the FIRST one
                      at full opacity and the rest at 0.38 — identical on every
                      one, so there is no per-screen state to track — and frames
                      35 and 38B carry none at all. Those are the same two
                      arrival screens that stack the hero card, which is why the
                      one flag governs both. */}
                  {!heroCardBelow && (
                    <div aria-hidden="true" className="flex items-center gap-[5px]">
                      {DOTS.map((d) => (
                        <span
                          key={d}
                          className={cn(
                            'h-[1.5px] w-[35px]',
                            d === 0 ? 'bg-white' : 'bg-white/[0.38]',
                          )}
                        />
                      ))}
                    </div>
                  )}
                </div>
              </div>
              {heroCard}
            </div>

            <div className="flex items-center justify-between font-sans text-[14px] font-medium leading-[1.4] text-white">
              <span>By Perro Air · Pet-friendly private aviation</span>
              <span>© 2026</span>
            </div>
          </div>
        </section>

        {/* ---------------- Form column.
            Mobile: a white card overlapping the photo. Desktop: a 406-wide
            column centred in the 706-wide right side, per the frame. */}
        <section className="relative z-10 -mt-[120px] mx-4 flex flex-1 flex-col rounded-[20px] bg-white px-4 pb-4 pt-6 lg:mx-0 lg:mt-0 lg:min-h-0 lg:overflow-y-auto lg:rounded-none lg:bg-transparent lg:px-0 lg:pb-0 lg:pt-0">
          <div className="hidden justify-end pr-0 pt-4 lg:flex">
            <p className="flex items-center gap-1 font-sans text-[14px] leading-[1.14]">
              <span className="text-black/70">Need help?</span>
              <a href="/support" className="font-medium text-[#0A1B49] underline underline-offset-2">
                Contact support
              </a>
            </p>
          </div>

          <div className="flex flex-1 flex-col justify-center">
            <div
              className={cn(
                'mx-auto flex w-full flex-col items-center gap-6',
                contentWidth === 'card' ? 'max-w-[500px]' : 'max-w-[406px]',
              )}
            >
              {children}
            </div>
          </div>

          {/* Desktop: sits at the foot of the right column. */}
          {footerNote && (
            <div className="hidden pb-[30px] text-center font-sans text-[14px] leading-[1.14] lg:block">
              {footerNote}
            </div>
          )}
        </section>

        {/* Mobile: the same note, below the card on the page background. */}
        {footerNote && (
          <div className="px-5 py-6 text-center font-sans text-[14px] lg:hidden">
            {footerNote}
          </div>
        )}
      </div>
    </div>
  )
}

/**
 * The membership card pinned to the hero on the sign-in and reset frames.
 * Sized from the frame: 215.46 wide, 1.57px hairline, 21.92 radius, avatars
 * 46.97 with a -15.66 overlap and a #A88E72 ring.
 */
const MEMBERS = ['/images/auth/member-1.png', '/images/auth/member-2.png', '/images/auth/member-3.png']

export function MembershipCard() {
  return (
    <div
      className="flex w-[215px] flex-col justify-center gap-[19px] rounded-[22px] border-[1.57px] border-white/30 bg-white/10 px-[17px] pb-[16px] pt-[17px]"
    >
      <div className="flex items-center" aria-hidden="true">
        {MEMBERS.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- decorative avatars
          <img
            key={src}
            src={src}
            alt=""
            className={cn(
              'size-[47px] rounded-full border-2 border-[#A88E72] object-cover',
              i > 0 && '-ml-[16px]',
            )}
          />
        ))}
      </div>
      <div className="flex flex-col gap-[6px]">
        <p className="font-sans text-[18px] font-medium leading-[1.21] text-white">
          Free Membership
        </p>
        <p className="font-sans text-[16px] font-medium leading-[1.21] text-white">
          10k+ Flight Club
        </p>
      </div>
    </div>
  )
}
