'use client'

/**
 * Join outcome — frames 41 and 41B.
 *
 * One component, not two. The frames are structurally identical: success
 * banner, "YOU'RE IN" heading, group card, "What happens next", the flight
 * timeline, and a rail. Only the wording, the current timeline step, and the
 * rail's middle card differ — 41 offers the share link, 41B replaces it with
 * what happens during quoting, because a full group has nothing left to share.
 *
 * Which one shows is decided by `filled`, computed by the join endpoint from
 * our own roster. It does not wait on Zoho's `flight_group.filled`.
 *
 * Note the timeline here is FIVE steps, not the seven on Flight Group Detail —
 * this screen collapses Filled into Quoting.
 */

import { Icon, PawPrints } from '@/components/common'
import { metroLabel, formatDateRange } from '../format'
import { cn } from '@/utils/cn'
import type { Pet, PublicView, Traveler } from '@/types'

const CARD = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-5'
const HEADING = 'font-heading text-[20px] font-semibold leading-[1.21] text-[#000000]'
const LABEL = 'font-sans text-[12px] font-medium leading-[1.21] text-[#080B2B]/60'
const SECONDARY_BTN =
  'inline-flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors hover:bg-[#CFE3F1]/40 focus-ring'

const STEPS = ['Forming', 'Filling', 'Quoting', 'Confirmed', 'Closed'] as const

/** Everything that differs between the two frames, in one place. */
const VARIANT = {
  joined: {
    banner: 'You’ve been added to the group.',
    heading: 'You’ve joined this shared flight.',
    sub: 'We’ve added you to the group and notified everyone.',
    currentStep: 1,
    nextStep: 'Group fills. We’ll handle the rest.',
    happensNext: [
      'You’ll get an email and SMS confirmation in the next few minutes.',
      'When the group fills, we lock in the aircraft and request operator quotes.',
      'We’ll notify you when the flight is confirmed.',
      'You’ll see itinerary and boarding details closer to the date.',
    ],
  },
  filledGroup: {
    banner: 'You filled the group — we’re now requesting operator quotes.',
    heading: 'You filled the group!',
    sub: 'Your join brought the group to full capacity. We’re requesting operator quotes now.',
    currentStep: 2,
    nextStep: 'Operator quote accepted — then we lock in the aircraft.',
    happensNext: [
      'We’re requesting an operator quote for the locked group',
      'We’ll post the estimate on your Shared Flight page when it lands.',
      'Once the quote is accepted, the flight is confirmed and the aircraft is locked in.',
      'You and the group will get boarding details closer to departure.',
    ],
  },
} as const

function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex items-start gap-[3px] px-2 pb-1.5">
      {STEPS.map((label, i) => {
        const done = i < current
        const now = i === current
        return (
          <li key={label} className="contents">
            {i > 0 && (
              <span
                aria-hidden="true"
                className={cn(
                  'mt-[14px] h-px min-w-2 flex-1',
                  i <= current ? 'bg-[#109A51]' : i === current + 1 ? 'bg-[#112D7C]' : 'bg-[#CFE3F1]',
                )}
              />
            )}
            <div className="flex w-[52px] shrink-0 flex-col items-center gap-[7px]">
              {done ? (
                <span className="flex size-[30px] items-center justify-center rounded-full bg-[#109A51] text-white">
                  <Icon name="check" size={16} />
                </span>
              ) : now ? (
                <span className="flex size-[30px] items-center justify-center rounded-full border border-[#112D7C] p-[2px]">
                  <span className="flex size-full items-center justify-center rounded-full bg-[#112D7C] font-sans text-[12px] font-medium text-white">
                    {i + 1}
                  </span>
                </span>
              ) : (
                <span className="flex size-[30px] items-center justify-center rounded-full bg-[#CFE3F1] font-sans text-[12px] font-medium text-[#000000]">
                  {i + 1}
                </span>
              )}
              <span
                className={cn(
                  'text-center font-sans text-[11px] leading-[1.33] lg:text-[12px]',
                  now ? 'font-medium text-[#000000]' : 'font-normal text-[#6D6D6D]',
                )}
              >
                {label}
              </span>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

function NumberedList({ items }: { items: readonly string[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((text, i) => (
        <li key={text} className="flex items-start gap-3">
          <span className="mt-px flex size-6 shrink-0 items-center justify-center rounded-full bg-[#CFE3F1]/50 font-sans text-[12px] font-medium text-[#112D7C]">
            {i + 1}
          </span>
          <span className="font-sans text-[14px] leading-[1.45] text-[#000000]">{text}</span>
        </li>
      ))}
    </ol>
  )
}

function SignedUpRow({
  label,
  value,
  detail,
}: {
  label: string
  value: string
  detail?: string
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <span className={cn(LABEL, 'shrink-0')}>{label}</span>
      <span className="flex min-w-0 flex-col items-end gap-0.5 text-right">
        <span className="font-heading text-[16px] font-medium leading-[1.21] text-[#000000]">
          {value}
        </span>
        {detail && (
          <span className="font-sans text-[12px] font-medium leading-[1.3] text-[#000000]/60">
            {detail}
          </span>
        )}
      </span>
    </div>
  )
}

interface JoinOutcomeScreenProps {
  flight: PublicView
  groupId: string
  /** True when this join completed the group — renders 41B instead of 41. */
  filled: boolean
  travelers?: Traveler[]
  pets?: Pet[]
  /** Booking reference shown in the banner. */
  reference?: string
  /** The member's position in the roster, for "YOU ARE MEMBER n". */
  memberNumber?: number
}

export function JoinOutcomeScreen({
  flight,
  groupId,
  filled,
  travelers = [],
  pets = [],
  reference,
  memberNumber,
}: JoinOutcomeScreenProps) {
  const v = filled ? VARIANT.filledGroup : VARIANT.joined
  const from = metroLabel(flight.route_origin_city)
  const to = metroLabel(flight.route_destination_city)
  const seated = Math.max(0, flight.spaces_total - flight.spaces_remaining)
  const shareUrl = `https://perroair.com/share/${groupId}`
  const shareText = `Join my shared flight ${from} to ${to} — ${shareUrl}`
  const primary = travelers[0]
  const pet = pets[0]

  const main = (
    <>
      {/* Group card */}
      <section className={CARD}>
        <p className={cn(LABEL, 'uppercase')}>
          Group ID · {groupId}
          {memberNumber ? ` · You are member ${memberNumber}` : ''}
        </p>
        <h2 className="mt-1.5 flex flex-nowrap items-center gap-x-3 font-heading text-[clamp(1.1rem,3vw,1.375rem)] font-semibold leading-[1.21] text-[#000000]">
          <span className="whitespace-nowrap">{from}</span>
          <img src="/svg/soFar.svg" alt="to" className="size-[24px] shrink-0" />
          <span className="whitespace-nowrap">{to}</span>
        </h2>
        <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 gap-y-1 font-sans text-[15px] font-medium text-[#000000]">
          <span>{formatDateRange(flight.estimated_date_range)}</span>
          {/* Aircraft only once a quote exists — client, 2026-09-09. */}
          {flight.aircraft_category && (
            <>
              <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-[#000000]" />
              <span>{flight.aircraft_category}</span>
            </>
          )}
          {flight.pet_friendly && (
            <>
              <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-[#000000]" />
              <span className="inline-flex items-center gap-2">
                Pets welcome
                <PawPrints height={14} />
              </span>
            </>
          )}
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <p className="font-sans text-[14px] font-medium text-[#000000]">
            {filled
              ? `${flight.spaces_total} of ${flight.spaces_total} members · Group is full`
              : `${seated} of estimated ${flight.spaces_total} members`}
          </p>
          <span
            className={cn(
              'inline-flex shrink-0 items-center rounded-[8px] border px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px]',
              filled
                ? 'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]'
                : 'border-[#FFDB43] bg-[#FFDB43]/10 text-[#66550D]',
            )}
          >
            {filled ? 'Quoting' : 'Filling'}
          </span>
        </div>
      </section>

      <section className={CARD}>
        <h2 className={HEADING}>What happens next</h2>
        <div className="mt-4">
          <NumberedList items={v.happensNext} />
        </div>
      </section>

      <section className={CARD}>
        <div className="flex flex-col gap-1.5">
          <h2 className={HEADING}>Your flight timeline</h2>
          <p className="font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">
            Where this group is and where it&rsquo;s going.
          </p>
        </div>
        <div className="mt-[18px] -mx-1 overflow-x-auto">
          <div className="min-w-[400px] px-1">
            <Stepper current={v.currentStep} />
          </div>
        </div>
        <div className="mt-[18px] flex gap-2 rounded-[12px] bg-[#CFE3F1]/30 p-3">
          <Icon name="info" size={16} className="mt-0.5 shrink-0 text-[#112D7C]" />
          <div className="flex flex-col gap-1">
            <p className="font-sans text-[12px] font-semibold uppercase leading-[1.33] text-[#112D7C]">
              Next step:
            </p>
            <p className="font-sans text-[14px] font-normal leading-[1.15] text-[#112D7C]">
              {v.nextStep}
            </p>
          </div>
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <a
          href={`/group/${groupId}`}
          className="inline-flex h-10 items-center justify-center rounded-[12px] border border-[#D0D0D0] bg-[#F5F5F5] px-[14px] font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors hover:bg-[#EDEDED] focus-ring"
        >
          View Group Detail
        </a>
        <a
          href="/dashboard"
          className="inline-flex h-10 items-center gap-2 rounded-[12px] bg-[#000000] px-[14px] font-sans text-[14px] font-medium leading-[1.4] text-white transition-colors hover:bg-[#101114] focus-ring"
        >
          Go to My Dashboard
          <Icon name="arrow-right" size={18} />
        </a>
      </div>
    </>
  )

  const aside = (
    <>
      <section className={CARD}>
        <h2 className={HEADING}>What you signed up with</h2>
        <div className="mt-4 flex flex-col gap-[18px]">
          {primary && (
            <SignedUpRow
              label="TRAVELER"
              value={primary.name}
              detail={`Primary · ${travelers.length} traveler${travelers.length === 1 ? '' : 's'}`}
            />
          )}
          {pet && (
            <SignedUpRow
              label="PET"
              value={[pet.name, pet.breed].filter(Boolean).join(' · ')}
              detail={[pet.weight && `${pet.weight} lbs`, pet.temperament]
                .filter(Boolean)
                .join(' · ')}
            />
          )}
          {pets.length > 0 && (
            <SignedUpRow
              label="READINESS"
              value="Confirmed for this flight"
              detail="Travel Readiness agreed at join"
            />
          )}
        </div>
        <a href="/dashboard" className={cn(SECONDARY_BTN, 'mt-4 w-fit')}>
          Edit for next time
          <Icon name="arrow-right" size={18} />
        </a>
      </section>

      {/* 41 invites more members; 41B has a full group, so it explains the wait. */}
      {filled ? (
        <section className={CARD}>
          <h2 className={HEADING}>What happens next</h2>
          <div className="mt-4">
            <NumberedList
              items={[
                'Requesting an operator quote for the locked group.',
                'Posting the estimate to your Shared Flight page.',
                'Confirming the aircraft and sending boarding details to the group.',
              ]}
            />
          </div>
          <hr className="my-4 border-0 border-t border-[#A8A8A8]/30" />
          <p className="font-sans text-[13px] italic leading-[1.45] text-[#000000]/60">
            Typical wait: 24–48 hours. We&rsquo;ll email everyone in the group the moment it&rsquo;s
            confirmed.
          </p>
        </section>
      ) : (
        <section className={CARD}>
          <h2 className={HEADING}>Know anyone else who might want to join?</h2>
          <p className="mt-2 font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">
            There&rsquo;s still space in this group. Share the link with friends who might fly this
            route.
          </p>
          <input
            readOnly
            value={shareUrl}
            aria-label="Share link"
            onFocus={(e) => e.currentTarget.select()}
            className="mt-4 w-full rounded-[12px] border border-[#1A45BD] bg-white px-[14px] py-3 font-sans text-[14px] font-medium leading-4 text-[#000000] focus-ring"
          />
          <div className="mt-3 flex items-center gap-2">
            <a
              href={`sms:?&body=${encodeURIComponent(shareText)}`}
              className={cn(SECONDARY_BTN, 'min-w-0 flex-1 px-2')}
            >
              <Icon name="message" size={18} />
              iMessage
            </a>
            <a
              href={`mailto:?subject=${encodeURIComponent('Join my shared flight')}&body=${encodeURIComponent(shareText)}`}
              className={cn(SECONDARY_BTN, 'min-w-0 flex-1 px-2')}
            >
              <Icon name="mail" size={18} />
              Email
            </a>
            <a
              href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(SECONDARY_BTN, 'min-w-0 flex-1 px-2')}
            >
              <Icon name="whatsapp" size={18} />
              WhatsApp
            </a>
          </div>
        </section>
      )}

      <section className={CARD}>
        <h2 className={HEADING}>Need a hand?</h2>
        <p className="mt-2 font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">
          Questions about your join? We&rsquo;ll sort them out.
        </p>
        <a href="/contact" className={cn(SECONDARY_BTN, 'mt-4 w-fit')}>
          Contact support
          <Icon name="arrow-right" size={18} />
        </a>
      </section>
    </>
  )

  return (
    <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-[30px] px-4 py-6 sm:px-6 lg:px-[50px] lg:py-8">
      {/* Success banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-[20px] border border-[#84EBB4]/50 bg-[linear-gradient(90deg,#E4F6EC_0%,#F2FAF6_55%,rgba(255,255,255,0)_100%)] p-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#109A51] text-white">
            <Icon name="check" size={18} />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="font-heading text-[16px] font-semibold leading-[1.3] text-[#000000]">
              {v.banner}
            </p>
            <p className="font-sans text-[13px] leading-[1.3] text-[#000000]/70">
              Confirmation email and SMS sent · Group Organizer and members notified
            </p>
          </div>
        </div>
        {reference && (
          <p className={cn(LABEL, 'shrink-0 uppercase')}>Ref · {reference}</p>
        )}
      </div>

      <header className="flex flex-col items-center gap-2 text-center">
        <span className="inline-flex items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]">
          You&rsquo;re in
        </span>
        <h1 className="font-heading text-[28px] font-semibold leading-tight text-[#000000] lg:text-[34px]">
          {v.heading}
        </h1>
        <p className="font-sans text-[14px] font-medium leading-[1.3] text-[#000000]/70">{v.sub}</p>
      </header>

      <div className="flex flex-col gap-5 lg:grid lg:grid-cols-[minmax(0,750fr)_minmax(0,570fr)] lg:items-start lg:gap-5">
        <aside className="order-1 flex flex-col gap-5 lg:order-none lg:col-start-2 lg:row-start-1">
          {aside}
        </aside>
        <div className="order-2 flex flex-col gap-5 lg:order-none lg:col-start-1 lg:row-start-1">
          {main}
        </div>
      </div>
    </div>
  )
}
