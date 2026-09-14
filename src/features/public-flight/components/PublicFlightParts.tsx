'use client'

/**
 * Building blocks for the public Shared Flight Detail page.
 *
 * State-agnostic pieces composed by each state screen: the hero banner, the
 * flight-details card, the estimate-pending card, the "Who's flying" counts
 * card, and the right-column info panels. All render only public-safe fields
 * from the PublicView — never operator, airport code, exact time, price, or
 * member identity. "Who's flying" shows counts and generic labels only.
 */

import type { ReactNode } from 'react'
import { InfoNote } from '@/components/ui'
import { Icon, PawPrints, RouteHeading } from '@/components/common'
import { env } from '@/config/env'
import { SidePanel } from '@/features/flight-builder/components'
import { cn } from '@/utils/cn'
import { metroLabel, formatDateRange, fellowPetSummary, aircraftRowValue } from '../format'
import type { PublicView } from '@/types'

/* ------------------------------------------------------------- state tone */

/**
 * Display tone. Wider than `PublicFlightState` because the contract has one
 * `closed` while the frames draw two — a group that flew (Completed) and one
 * that never filled (Unfilled). Which applies is derived from whether capacity
 * was reached, so no contract change is needed.
 */
type BannerTone =
  | 'forming'
  | 'filling'
  | 'full'
  | 'quoting'
  | 'confirmed'
  | 'completed'
  | 'unfilled'

const bannerToneClass: Record<BannerTone, string> = {
  // Forming = blue, Filling = amber (distinct so the two states don't look alike),
  // Group Full / Confirmed / Completed = green, Unfilled = the danger red.
  forming: 'from-[#EAF1FB] to-[#F5F9FE] border-[#CFE3F1]',
  filling: 'from-[#FDF3E1] to-[#FEF9F0] border-[#F5DCA8]',
  full: 'from-[#E6F5EC] to-[#F4FBF6] border-[#B7E3C7]',
  quoting: 'from-[#EAF1FB] to-[#F5F9FE] border-[#CFE3F1]',
  confirmed: 'from-[#E8F5EE] to-[#F6FCF9] border-[#B7E3C7]',
  completed: 'from-[#E8F5EE] to-[#F6FCF9] border-[#B7E3C7]',
  unfilled: 'from-[#FCECED] to-[#FEFBFB] border-[#F8CED0]',
}

const badgeToneClass: Record<BannerTone, string> = {
  forming: 'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]',
  filling: 'border-[#E4B45A] bg-[#FBE9C7]/50 text-[#946400]',
  full: 'border-[#1AA35A]/40 bg-[#1AA35A]/10 text-[#1AA35A]',
  quoting: 'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]',
  confirmed: 'border-[#84EBB4] bg-[#1FC16B]/10 text-[#109A51]',
  completed: 'border-[#84EBB4] bg-[#1FC16B]/10 text-[#109A51]',
  unfilled: 'border-[#F8CED0] bg-[#F8CED0]/50 text-[#D00416]',
}

/** Eyebrow "Shared flight · State" tint per state. */
const eyebrowToneClass: Record<BannerTone, string> = {
  forming: 'text-[#112D7C]/70',
  filling: 'text-[#946400]/80',
  full: 'text-[#1AA35A]',
  quoting: 'text-[#112D7C]',
  confirmed: 'text-[#109A51]',
  completed: 'text-[#109A51]',
  unfilled: 'text-[#D00416]',
}

const stateLabel: Record<BannerTone, string> = {
  forming: 'Forming',
  filling: 'Filling',
  full: 'Group Full',
  quoting: 'Quoting',
  confirmed: 'Confirmed',
  completed: 'Closed · Completed',
  unfilled: 'Closed · Unfilled',
}

export type { BannerTone }

/** State pill. Rendered twice — inline on mobile, top-right from lg. */
const badgeClass =
  'inline-flex h-[30px] shrink-0 items-center rounded-full border px-[10px] font-sans text-[12px] font-medium uppercase leading-none lg:h-[34px] lg:text-[14px]'

const cardClass = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-5'
const eyebrowClass =
  'font-sans text-[12px] font-medium uppercase leading-[15px] tracking-[0.06em] text-[#080B2B]/60'

/* ------------------------------------------------------------- hero banner */

export function FlightHeroBanner({
  flight,
  tone: toneOverride,
  subline,
}: {
  flight: PublicView
  /** Forces a tone the contract cannot express — the two Closed variants. */
  tone?: BannerTone
  /** Replaces the date · aircraft · pets line, which the terminal states do. */
  subline?: ReactNode
}) {
  const tone: BannerTone =
    toneOverride ??
    (flight.group_state_public === 'full' ? 'full' : (flight.group_state_public as BannerTone))
  const from = metroLabel(flight.route_origin_city)
  const to = metroLabel(flight.route_destination_city)
  const metaParts = [
    formatDateRange(flight.estimated_date_range),
    // Aircraft is absent until a quote comes back — client, 2026-09-09.
    // Inline meta run: drop the segment and its separator rather than showing
    // a placeholder, which would be noise in a terse dot-separated line.
    flight.aircraft_category,
    // `Boolean` alone is not a type guard, so metaParts would widen to
    // (string | null)[] and the already-correct intent would go untyped.
  ].filter((part): part is string => Boolean(part))

  return (
    <div
      className={cn(
        'rounded-[20px] border bg-gradient-to-r p-5 lg:p-6',
        bannerToneClass[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className={cn(eyebrowClass, eyebrowToneClass[tone])}>
            Shared flight · {stateLabel[tone]}
          </p>
          {/* The route stays on ONE line at every width, as the hi-fi shows it.
              It scales with the viewport rather than wrapping, so a long city
              pair shrinks to fit instead of breaking onto a second line. */}
          <RouteHeading
            as="h1"
            from={from}
            to={to}
            iconClassName="size-[clamp(1rem,4vw,1.25rem)]"
            className="mt-1.5 font-heading text-[clamp(1rem,4.6vw,1.375rem)] font-medium leading-tight text-[#000000] lg:text-[28px]"
          />
          {/* On mobile the state pill sits at the end of this line, per the
              mobile frames; from lg it moves to the banner's top-right. */}
          {/* The pill is pinned to the right of this line and stays there. No
              `flex-wrap`: the text column shrinks and wraps inside itself
              (`min-w-0`) while the pill holds its place (`shrink-0`), so a long
              date range never pushes it onto a line of its own. */}
          <div className="mt-1.5 flex items-center justify-between gap-x-3">
            <p className="min-w-0 font-sans text-[13px] font-medium text-[#000000]/70 lg:text-[14px]">
              {subline ?? (
                <>
              {metaParts.join(' · ')}
              {flight.pet_friendly && (
                <>
                  {' · '}
                  {/* Sized to the copy beside it, not larger — the frames set
                      the paw at roughly the text size. */}
                  <span className="inline-flex items-center gap-2 align-middle">
                    Pets welcome
                    <PawPrints height={13} />
                  </span>
                </>
              )}
                </>
              )}
            </p>
            {/* Visibility lives on a wrapper, not merged into the badge's own
                classes: `cn` is a plain join with no tailwind-merge, so a
                `hidden` next to the badge's `inline-flex` does not win. */}
            <span className="shrink-0 lg:hidden">
              <span className={cn(badgeClass, badgeToneClass[tone])}>
                {stateLabel[tone]}
              </span>
            </span>
          </div>
        </div>
        <span className="hidden lg:block">
          <span className={cn(badgeClass, badgeToneClass[tone])}>{stateLabel[tone]}</span>
        </span>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- flight details */

/**
 * One label/value row.
 *
 * The two hi-fi frames align these differently and both are deliberate: mobile
 * pushes the value to the right edge, desktop starts every value at the same x
 * in a second column (80px label box + 100px gutter). Matching only one of them
 * leaves the other looking wrong, so the row switches at `lg`.
 */
function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 lg:justify-start lg:gap-[100px]">
      <span className={cn(eyebrowClass, 'shrink-0 lg:w-20')}>{label}</span>
      <span className="min-w-0 text-right font-sans text-[14px] font-medium text-[#000000] lg:text-left lg:text-[16px]">
        {children}
      </span>
    </div>
  )
}

export function FlightDetailsCard({ flight }: { flight: PublicView }) {
  const from = metroLabel(flight.route_origin_city)
  const to = metroLabel(flight.route_destination_city)
  return (
    <section className={cardClass}>
      <h2 className="font-heading text-[18px] font-medium text-[#000000] lg:text-[20px]">
        Flight Details
      </h2>
      {/* No rules between rows in either frame — the rows are separated by
          space alone. */}
      <div className="mt-4 flex flex-col gap-[18px]">
        <DetailRow label="Route">
          <span className="inline-flex items-center gap-2">
            {from}
            <img src="/svg/soFar.svg" alt="to" className="size-[16px]" />
            {to}
          </span>
        </DetailRow>
        <DetailRow label="Date">{formatDateRange(flight.estimated_date_range)}</DetailRow>
        <DetailRow label="Aircraft">
          <span className="flex flex-col items-end gap-1 lg:items-start">
            <span>{aircraftRowValue(flight.aircraft_category)}</span>
            <span className="text-right font-sans text-[12px] font-normal leading-[16px] text-[#000000]/55 lg:text-left">
              Final aircraft confirmed after the group fills and the operator quote is locked.
            </span>
          </span>
        </DetailRow>
        <DetailRow label="Pets">
          {flight.pet_friendly ? 'Welcome — cabin' : 'Not on this flight'}
        </DetailRow>
      </div>
    </section>
  )
}

/* -------------------------------------------------------- estimate pending */

export function EstimatePendingCard() {
  return (
    <section className={cardClass}>
      <p className={eyebrowClass}>Whole-flight cost</p>
      <h2 className="mt-1 font-heading text-[22px] font-medium text-[#000000] lg:text-[24px]">
        Estimate Pending
      </h2>
      <p className="mt-2 font-sans text-[14px] text-[#000000]/70">
        Our team is reviewing this route. We’ll post an estimate shortly.
      </p>
      <hr className="my-4 border-0 border-t border-[#A8A8A8]/30" />
      <p className="font-sans text-[13px] italic text-[#000000]/60">
        Cost will be split among the group at booking.
      </p>
    </section>
  )
}

/* ---------------------------------------------------------- who's flying */

/** A single anonymous member row — label + role pill only, never an identity. */
function MemberRow({ role }: { role: 'organizer' | 'joiner' }) {
  const isOrganizer = role === 'organizer'
  return (
    <li
      className={cn(
        // Figma: 20px radius, 16px padding. The organizer row's background is a
        // LINEAR gradient (picker stops #D3A26D → #3EAF72), softened to the pale
        // peach→mint wash the design shows, with a faint gradient edge.
        'flex items-center justify-between gap-3 rounded-[20px] p-4',
        isOrganizer
          ? 'border border-[#E7DED2] bg-[linear-gradient(90deg,#F8EADB_0%,#F4F8F1_50%,#DDF0E4_100%)]'
          : 'border border-[#A8A8A8]/20 bg-white',
      )}
    >
      <span className="flex min-w-0 items-center gap-3">
        <img
          src="/svg/profile.png"
          alt=""
          aria-hidden="true"
          className="size-9 shrink-0 rounded-full"
        />
        <span className="font-sans text-[14px] font-medium text-[#000000]">
          {isOrganizer ? 'Group Organizer' : 'Member'}
        </span>
      </span>
      <span
        className={cn(
          'inline-flex h-[26px] shrink-0 items-center rounded-full border px-[10px] font-sans text-[12px] font-medium leading-none',
          isOrganizer
            ? 'border-[#1AA35A]/40 bg-[#1AA35A]/10 text-[#1AA35A]'
            : 'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]',
        )}
      >
        {isOrganizer ? 'Group Organizer' : 'Joiner'}
      </span>
    </li>
  )
}

/** Counts-only group progress — no member identities, ever. */
export function WhosFlyingCard({
  flight,
  note,
}: {
  flight: PublicView
  note?: ReactNode
}) {
  const total = flight.spaces_total
  const remaining = flight.spaces_remaining
  const filled = Math.max(0, total - remaining)
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  const petSummary = fellowPetSummary(flight.fellow_pet_info.by_species)

  return (
    <section className={cardClass}>
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading text-[18px] font-medium text-[#000000] lg:text-[20px]">
          Who’s flying
        </h2>
        <span className="font-sans text-[13px] text-[#000000]/70 lg:text-[14px]">
          <span className="font-bold text-[#000000]">{filled}</span> of estimated{' '}
          <span className="font-bold text-[#000000]">{total}</span> members
        </span>
      </div>

      <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-[#E9EEF6]">
        <div
          className="h-full rounded-full bg-[#0A1B49] transition-[width]"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between font-sans text-[12px] font-medium">
        <span className="text-[#000000]">
          {filled}/{total} members
        </span>
        <span className="uppercase tracking-[0.04em] text-[#000000]/60">{pct}% filled</span>
      </div>

      {/* Member rows — derived from the filled count only. The first filled
          space is always the Group Organizer; the rest are joiners. No
          identities: labels and pills only, per the public-safe rule. */}
      <ul className="mt-4 flex flex-col gap-2">
        <MemberRow role="organizer" />
        {Array.from({ length: Math.max(0, filled - 1) }, (_, i) => (
          <MemberRow key={i} role="joiner" />
        ))}
      </ul>

      {/* <p className="mt-3 font-sans text-[13px] text-[#000000]/60"> */}
        {/* Member details are private. You’ll see the group once you join. */}
      {/* </p> */}

      {petSummary && (
        <p className="mt-3 font-sans text-[13px] text-[#000000]/70">
          Pets travelling with this group: {petSummary}.
        </p>
      )}

      {note && <InfoNote className="mt-4">{note}</InfoNote>}
    </section>
  )
}

/* --------------------------------------------------------------- panels */

/**
 * The right-column panels shared by the live states.
 *
 * Reuses the Flight Builder's SidePanel so the mobile behaviour matches the
 * hi-fi: "Why join" and "What is Flight Club" collapse to accordions on mobile
 * (chevron toggle), while the state note stays open as context. On desktop all
 * three render as full cards in the right column.
 */
export function PublicAside({ stateNote }: { stateNote: { title: string; body: string } }) {
  return (
    <>
      <SidePanel title="Why join a shared flight?">
        <ul className="flex list-disc flex-col gap-2 pl-4">
          <li>Fly private without booking the whole jet.</li>
          <li>We arrange flights with pet-friendly operators. Pets travel in cabin, not cargo.</li>
          <li>Cost gets split across the group at booking.</li>
        </ul>
      </SidePanel>
      <SidePanel title="What is Flight Club?">
        <p>
          Free membership that lets you join shared flights, get alerts on new routes, and manage
          your trips in one place. No paid tier, no points, no commitment.
        </p>
        {/* Went to `/`, i.e. into the Flight Builder — a "what is Flight Club"
            explainer that dropped you into a booking flow. Points at the
            marketing site until Charles sends a Flight Club page URL. */}
        <a
          href={env.marketingSiteUrl}
          className="mt-3 inline-flex h-10 items-center gap-1.5 rounded-[12px] border border-[#98C3E1] bg-[#F5F9FC] px-[14px] font-sans text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#E9EFFA] focus-ring"
        >
          Learn more
          <Icon name="arrow-right" size={16} />
        </a>
      </SidePanel>
      <SidePanel title={stateNote.title} collapsible={false} defaultOpen>
        {stateNote.body}
      </SidePanel>
    </>
  )
}
