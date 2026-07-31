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
import { Icon } from '@/components/common'
import { SidePanel } from '@/features/flight-builder/components'
import { cn } from '@/utils/cn'
import { metroLabel, formatDateRange, fellowPetSummary, aircraftExample } from '../format'
import type { PublicView } from '@/types'

/* ------------------------------------------------------------- state tone */

type BannerTone = 'forming' | 'filling' | 'full'

const bannerToneClass: Record<BannerTone, string> = {
  // Forming = blue, Filling = amber (distinct so the two states don't look alike),
  // Group Full = green.
  forming: 'from-[#EAF1FB] to-[#F5F9FE] border-[#CFE3F1]',
  filling: 'from-[#FDF3E1] to-[#FEF9F0] border-[#F5DCA8]',
  full: 'from-[#E6F5EC] to-[#F4FBF6] border-[#B7E3C7]',
}

const badgeToneClass: Record<BannerTone, string> = {
  forming: 'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]',
  filling: 'border-[#E4B45A] bg-[#FBE9C7]/50 text-[#946400]',
  full: 'border-[#1AA35A]/40 bg-[#1AA35A]/10 text-[#1AA35A]',
}

/** Eyebrow "Shared flight · State" tint per state. */
const eyebrowToneClass: Record<BannerTone, string> = {
  forming: 'text-[#112D7C]/70',
  filling: 'text-[#946400]/80',
  full: 'text-[#1AA35A]',
}

const stateLabel: Record<BannerTone, string> = {
  forming: 'Forming',
  filling: 'Filling',
  full: 'Group Full',
}

const cardClass = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-5'
const eyebrowClass =
  'font-sans text-[12px] font-medium uppercase leading-[15px] tracking-[0.06em] text-[#080B2B]/60'

/* ------------------------------------------------------------- hero banner */

export function FlightHeroBanner({ flight }: { flight: PublicView }) {
  const tone: BannerTone =
    flight.group_state_public === 'full' ? 'full' : (flight.group_state_public as BannerTone)
  const from = metroLabel(flight.route_origin_city)
  const to = metroLabel(flight.route_destination_city)
  const meta = [
    formatDateRange(flight.estimated_date_range),
    flight.aircraft_category,
    flight.pet_friendly ? 'Pets welcome' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  return (
    <div
      className={cn(
        'rounded-[20px] border bg-gradient-to-r p-5 lg:p-6',
        bannerToneClass[tone],
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className={cn(eyebrowClass, eyebrowToneClass[tone])}>
            Shared flight · {stateLabel[tone]}
          </p>
          <h1 className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 font-heading text-[22px] font-medium leading-tight text-[#000000] lg:text-[28px]">
            <span>{from}</span>
            <img src="/svg/soFar.svg" alt="to" className="size-[20px] shrink-0" />
            <span>{to}</span>
          </h1>
          <p className="mt-1.5 font-sans text-[13px] font-medium text-[#000000]/70 lg:text-[14px]">
            {meta}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex h-[30px] shrink-0 items-center rounded-full border px-[10px] font-sans text-[12px] font-medium uppercase leading-none lg:h-[34px] lg:text-[14px]',
            badgeToneClass[tone],
          )}
        >
          {stateLabel[tone]}
        </span>
      </div>
    </div>
  )
}

/* --------------------------------------------------------- flight details */

function DetailRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 py-2.5">
      <span className={cn(eyebrowClass, 'shrink-0')}>{label}</span>
      <span className="min-w-0 text-right font-sans text-[14px] font-medium text-[#000000] lg:text-[16px]">
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
        Flight details
      </h2>
      <div className="mt-3 divide-y divide-[#A8A8A8]/20">
        <DetailRow label="Route">
          <span className="inline-flex items-center gap-2">
            {from}
            <img src="/svg/soFar.svg" alt="to" className="size-[16px]" />
            {to}
          </span>
        </DetailRow>
        <DetailRow label="Dates">{formatDateRange(flight.estimated_date_range)}</DetailRow>
        <DetailRow label="Aircraft">
          <span className="flex flex-col items-end gap-1">
            <span>{aircraftExample(flight.aircraft_category)}</span>
            <span className="font-sans text-[12px] font-normal leading-[16px] text-[#000000]/55">
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
        Estimate pending
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

      <p className="mt-3 font-sans text-[13px] text-[#000000]/60">
        Member details are private. You’ll see the group once you join.
      </p>

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
        <a
          href="/"
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
