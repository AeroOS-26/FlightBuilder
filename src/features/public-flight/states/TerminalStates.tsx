'use client'

/**
 * The public states after a group stops accepting joiners — frames 12B, 13, 14
 * and 15.
 *
 * They share one shape: hero, Flight Details, a roster card, a "what now"
 * action card, and the rail. What changes is the tone, whether the roster still
 * names members, and which card closes the rail.
 *
 * Two things the frames settle that are easy to get wrong:
 *
 *  - **No pricing.** 12B shows "Pricing pending operator quote" in a dashed
 *    box; 13, 14 and 15 carry no cost card at all. There is no figure on any of
 *    them, which matches the standing rule and contradicts the placeholder
 *    component that rendered a per-person price.
 *  - **Identities disappear once the group locks.** 13 and 14 replace the
 *    member rows with a count and an avatar stack. 15 keeps the rows, because
 *    that group never locked — it simply ran out of time.
 */

import type { ReactNode } from 'react'
import { InfoNote } from '@/components/ui'
import { Icon } from '@/components/common'
import { PublicTwoColumn } from '../components/PublicPageShell'
import { FlightHeroBanner, FlightDetailsCard } from '../components/PublicFlightParts'
import { cn } from '@/utils/cn'
import type { PublicView } from '@/types'

const CARD = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-5'
const HEADING = 'font-heading text-[18px] font-medium text-[#000000] lg:text-[20px]'

/* ------------------------------------------------------------------ pieces */

/** The red strip on the two Closed frames. */
function ArchiveNotice({ children }: { children: ReactNode }) {
  return (
    <div
      role="status"
      className="flex items-start gap-3 rounded-[12px] border border-[#F8CED0] bg-[#FCECED] p-4"
    >
      <Icon name="alert" size={18} className="mt-px shrink-0 text-[#D00416]" />
      <p className="font-sans text-[14px] font-medium leading-[1.45] text-[#D00416]">{children}</p>
    </div>
  )
}

/** Centred "what now" card that closes the main column on every terminal state. */
function NextMoveCard({
  title,
  body,
  actions,
}: {
  title: string
  body: string
  actions: { label: string; href: string; primary?: boolean }[]
}) {
  return (
    <section className={cn(CARD, 'text-center')}>
      <h2 className="font-heading text-[20px] font-medium text-[#000000] lg:text-[22px]">
        {title}
      </h2>
      <p className="mx-auto mt-2 max-w-[460px] font-sans text-[14px] leading-[150%] text-[#000000]/70">
        {body}
      </p>
      <div className="mt-4 flex flex-wrap items-center justify-center gap-3">
        {actions.map((a) => (
          <a
            key={a.label}
            href={a.href}
            className={cn(
              'inline-flex h-10 items-center gap-2 rounded-[12px] px-[14px] font-sans text-[14px] font-medium leading-4 transition-colors focus-ring',
              a.primary
                ? 'bg-[#000000] text-white hover:bg-[#101114]'
                : 'border border-[#98C3E1] bg-[#CFE3F1]/20 text-[#000000] hover:bg-[#CFE3F1]/40',
            )}
          >
            {a.label}
            <Icon name="arrow-right" size={18} />
          </a>
        ))}
      </div>
    </section>
  )
}

/** Progress bar shared by every roster card here. */
function Progress({ filled, total, right }: { filled: number; total: number; right: string }) {
  const pct = total > 0 ? Math.round((filled / total) * 100) : 0
  return (
    <div className="mt-3 flex flex-col gap-2.5">
      <div className="h-5 w-full overflow-hidden rounded-[60px] bg-[#112D7C]/10">
        <div className="h-full rounded-[60px] bg-[#112D7C]" style={{ width: `${pct}%` }} />
      </div>
      <div className="flex items-center justify-between gap-3">
        <span className="font-sans text-[14px] font-bold leading-[1.3] text-[#000000]">
          {filled}/ {total} members
        </span>
        <span className="font-sans text-[14px] font-normal leading-[1.3] text-[#000000]">
          {right}
        </span>
      </div>
    </div>
  )
}

/** Overlapping avatars — how 13 and 14 show a roster without naming anyone. */
function AvatarStack({ count, caption }: { count: number; caption: string }) {
  return (
    <div className="mt-4 flex items-center gap-4 rounded-[16px] border border-[#A8A8A8]/20 bg-white p-4">
      <span className="flex shrink-0 items-center">
        {Array.from({ length: Math.min(count, 5) }, (_, i) => (
          <img
            key={i}
            src="/svg/profile.png"
            alt=""
            aria-hidden="true"
            className={cn('size-9 rounded-full', i > 0 && '-ml-3')}
          />
        ))}
      </span>
      <span className="font-sans text-[14px] font-medium text-[#000000]">{caption}</span>
    </div>
  )
}

/* ------------------------------------------------------------------ states */

/** Frame 12B — group full, waiting on an operator quote. Members still named. */
export function QuotingState({ flight }: { flight: PublicView }) {
  const total = flight.spaces_total
  return (
    <div className="flex flex-col gap-5 lg:gap-[30px]">
      <FlightHeroBanner
        flight={flight}
        tone="quoting"
        subline="Group is full · Perro Air is requesting an operator quote"
      />
      <PublicTwoColumn
        main={
          <>
            <FlightDetailsCard flight={flight} />

            {/* Deliberately not a figure — see the file header. */}
            <section className={CARD}>
              <p className="font-sans text-[12px] font-medium uppercase leading-[15px] tracking-[0.06em] text-[#080B2B]/60">
                Whole-flight cost
              </p>
              <div className="mt-3 flex items-start gap-3 rounded-[16px] border border-dashed border-[#112D7C]/40 bg-[#CFE3F1]/15 p-4">
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white font-sans text-[15px] font-semibold text-[#112D7C]">
                  $
                </span>
                <div className="flex flex-col gap-1">
                  <p className="font-heading text-[16px] font-medium text-[#000000]">
                    Pricing pending operator quote
                  </p>
                  <p className="font-sans text-[14px] leading-[1.45] text-[#000000]/70">
                    A whole-flight cost will appear here once Perro Air locks in an operator. Cost
                    is split among the group at booking.
                  </p>
                </div>
              </div>
            </section>

            <section className={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={HEADING}>Who&rsquo;s flying</h2>
                <p className="font-sans text-[14px] text-[#000000]">
                  <span className="font-bold">{total}</span> of estimated{' '}
                  <span className="font-bold">{total}</span> members
                </p>
              </div>
              <Progress filled={total} total={total} right="100% FILLED" />
              <AvatarStack count={total} caption={`${total} members in this group`} />
              <InfoNote className="mt-4">
                Group is locked — no new joiners possible. Members will be notified individually as
                quoting progresses.
              </InfoNote>
            </section>

            <NextMoveCard
              title="This group is past the joining window"
              body="Want to fly this route? Browse other forming groups or set a route alert."
              actions={[
                { label: 'Browse upcoming flights', href: '/', primary: true },
                { label: 'Set a route alert', href: '/' },
              ]}
            />
          </>
        }
        aside={<TerminalAside variant="quoting" />}
      />
    </div>
  )
}

/** Frame 13 — confirmed and locked. Identities hidden. */
export function ConfirmedState({ flight }: { flight: PublicView }) {
  const total = flight.spaces_total
  return (
    <div className="flex flex-col gap-5 lg:gap-[30px]">
      <FlightHeroBanner
        flight={flight}
        tone="confirmed"
        subline={
          <>
            This flight is confirmed for{' '}
            <span className="font-semibold text-[#000000]">
              {flight.estimated_date_range.earliest_date}
            </span>
          </>
        }
      />
      <PublicTwoColumn
        main={
          <>
            <FlightDetailsCard flight={flight} />
            <section className={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={HEADING}>Who&rsquo;s flying</h2>
                <span className="flex items-center gap-3">
                  <span className="font-sans text-[14px] text-[#000000]">
                    {total} members confirmed for this flight
                  </span>
                  <span className="inline-flex shrink-0 items-center rounded-full border border-[#F8CED0] bg-[#FCECED] px-[10px] py-1.5 font-sans text-[12px] font-medium uppercase leading-none text-[#D00416]">
                    Locked
                  </span>
                </span>
              </div>
              <Progress filled={total} total={total} right="100% Filled · Locked" />
              <AvatarStack count={total} caption={`${total} members confirmed for this flight`} />
              <InfoNote className="mt-4">
                Individual member details are private. The group is locked — no new joiners.
              </InfoNote>
            </section>
            <NextMoveCard
              title="This group is closed"
              body="This flight is confirmed and the group is locked. Browse other upcoming groups or set a route alert."
              actions={[
                { label: 'Browse upcoming flights', href: '/', primary: true },
                { label: 'Set a route alert', href: '/' },
              ]}
            />
          </>
        }
        aside={<TerminalAside variant="confirmed" />}
      />
    </div>
  )
}

/** Frame 14 — the flight happened. Preserved for reference. */
export function CompletedState({ flight }: { flight: PublicView }) {
  const total = flight.spaces_total
  const when = flight.estimated_date_range.earliest_date
  return (
    <div className="flex flex-col gap-5 lg:gap-[30px]">
      <FlightHeroBanner
        flight={flight}
        tone="completed"
        subline={
          <>
            This flight took place on{' '}
            <span className="font-semibold text-[#000000]">{when}</span>
          </>
        }
      />
      <ArchiveNotice>
        This flight took place on {when} and is preserved here for reference. Member, operator, and
        pricing details remain private.
      </ArchiveNotice>
      <PublicTwoColumn
        main={
          <>
            <FlightDetailsCard flight={flight} />
            <section className={CARD}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className={HEADING}>Who&rsquo;s flying</h2>
                <p className="font-sans text-[14px] text-[#000000]">
                  {total} members flew on this route
                </p>
              </div>
              <Progress filled={total} total={total} right="100% Filled · Completed" />
              <AvatarStack count={total} caption={`${total} members confirmed for this flight`} />
              <InfoNote className="mt-4">
                Individual member details remain private. This group is preserved here for
                reference only.
              </InfoNote>
            </section>
            <NextMoveCard
              title="This flight has already taken place"
              body="Liked this route? Start your own group or browse upcoming flights."
              actions={[
                { label: 'Start your own flight', href: '/', primary: true },
                { label: 'Browse upcoming flights', href: '/' },
              ]}
            />
          </>
        }
        aside={<TerminalAside variant="completed" />}
      />
    </div>
  )
}

/** Frame 15 — the window closed before the group filled. No flight happened. */
export function UnfilledState({ flight }: { flight: PublicView }) {
  const total = flight.spaces_total
  const joined = Math.max(0, total - flight.spaces_remaining)
  const empty = Math.max(0, total - joined)
  return (
    <div className="flex flex-col gap-5 lg:gap-[30px]">
      <FlightHeroBanner
        flight={flight}
        tone="unfilled"
        subline="This group didn't reach capacity by the booking window · No flight took place"
      />
      <ArchiveNotice>
        No flight took place. The booking window closed before this group reached the {total}-member
        minimum — no charges occurred and member details remain private.
      </ArchiveNotice>
      <PublicTwoColumn
        main={
          <>
            <FlightDetailsCard flight={flight} />
            <section className={CARD}>
              <div className="flex flex-col gap-1">
                <h2 className={HEADING}>Who joined</h2>
                <p className="font-sans text-[14px] text-[#000000]/70">
                  {joined} of {total} spaces filled — group didn&rsquo;t reach capacity
                </p>
              </div>
              <Progress
                filled={joined}
                total={total}
                right={`${Math.round((joined / total) * 100)}% FILLED · BOOKING WINDOW CLOSED`}
              />
              {/* This group never locked, so the roster still shows who joined —
                  and, unlike the other terminal states, the spaces nobody took. */}
              <ul className="mt-4 flex flex-col gap-2">
                {Array.from({ length: empty }, (_, i) => (
                  <li
                    key={`empty-${i}`}
                    className="flex items-center justify-between gap-3 rounded-[20px] border border-[#A8A8A8]/20 bg-[#F7F7F7] p-4"
                  >
                    <span className="flex min-w-0 items-center gap-3">
                      <img
                        src="/svg/profile.png"
                        alt=""
                        aria-hidden="true"
                        className="size-9 shrink-0 rounded-full opacity-50"
                      />
                      <span className="flex flex-col">
                        <span className="font-sans text-[14px] font-medium text-[#000000]/70">
                          Unfilled space
                        </span>
                        <span className="font-sans text-[12px] text-[#000000]/50">
                          No one joined
                        </span>
                      </span>
                    </span>
                    <span className="inline-flex shrink-0 items-center rounded-full border border-[#D0D0D0] bg-[#F0F0F0] px-[10px] py-1.5 font-sans text-[12px] font-medium uppercase leading-none text-[#6D6D6D]">
                      Empty
                    </span>
                  </li>
                ))}
              </ul>
              <InfoNote className="mt-4">
                Individual member details remain private. No charges occurred because the group
                never reached the minimum.
              </InfoNote>
            </section>
            <NextMoveCard
              title="This group didn't take off"
              body="Demand wasn't there in time. Try another flight on this route, or set an alert so we can let you know when new groups form."
              actions={[
                { label: 'Browse upcoming flights', href: '/', primary: true },
                { label: 'Set a route alert', href: '/' },
              ]}
            />
          </>
        }
        aside={<TerminalAside variant="unfilled" />}
      />
    </div>
  )
}

/* -------------------------------------------------------------------- rail */

const RAIL_CLOSER = {
  quoting: {
    title: 'What happens next',
    body: 'Members are waiting on operator quotes. Once a quote is accepted, the flight is confirmed and the group is locked in. Typical wait: 24–48 hours.',
    action: null,
  },
  confirmed: {
    title: 'What happens next',
    body: 'Members are waiting on operator quotes. Once a quote is accepted, the flight is confirmed and the group is locked in. Typical wait: 24–48 hours.',
    action: null,
  },
  completed: {
    title: 'Looking for a similar trip?',
    body: "Create your own shared flight on this route and we'll help you find others to fly with.",
    action: { label: 'Start a shared flight', href: '/' },
  },
  unfilled: {
    title: 'Cancellations are rare',
    body: "We track demand on this route. If a new group forms, we'll email you so you can join early.",
    action: { label: 'Set route alerts', href: '/' },
  },
} as const

function TerminalAside({ variant }: { variant: keyof typeof RAIL_CLOSER }) {
  const closer = RAIL_CLOSER[variant]
  return (
    <>
      <section className={CARD}>
        <h2 className={HEADING}>Why join a shared flight?</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {[
            'Fly private without booking the whole jet.',
            'Pets welcome in cabin — no cargo.',
            'Cost gets split across the group at booking.',
          ].map((t) => (
            <li key={t} className="flex items-start gap-3">
              <span
                aria-hidden="true"
                className="mt-[7px] size-2.5 shrink-0 rounded-full bg-[#0A1B49]"
              />
              <span className="font-sans text-[16px] leading-[1.35] text-[#000000]">{t}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className={CARD}>
        <h2 className={HEADING}>What is Flight Club?</h2>
        <p className="mt-3 font-sans text-[16px] leading-[1.5] text-[#000000]/70">
          Free membership that lets you join shared flights, get alerts on new routes, and manage
          your trips in one place. No paid tier, no points, no commitment.
        </p>
        <a
          href="/"
          className="mt-4 inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] font-sans text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#CFE3F1]/40 focus-ring"
        >
          Learn more
          <Icon name="arrow-right" size={18} />
        </a>
      </section>

      <section className={CARD}>
        <h2 className={HEADING}>{closer.title}</h2>
        <p className="mt-3 font-sans text-[16px] leading-[1.5] text-[#000000]/70">{closer.body}</p>
        {closer.action && (
          <a
            href={closer.action.href}
            className="mt-4 inline-flex h-10 items-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] font-sans text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#CFE3F1]/40 focus-ring"
          >
            {closer.action.label}
            <Icon name="arrow-right" size={18} />
          </a>
        )}
      </section>
    </>
  )
}
