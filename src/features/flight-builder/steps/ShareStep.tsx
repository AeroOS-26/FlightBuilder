'use client'

/**
 * Share link step — the post-creation success screen.
 *
 * Surfaces the live flight group, its tracked share link and share card with
 * copy / messaging shortcuts, plus "what just happened" context. Reads the
 * created flight from the store; if there isn't one (e.g. a direct visit), it
 * sends the user back to the start of the flow.
 */

import { Fragment, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button, DashedCard, TextInput } from '@/components/ui'
import { Icon } from '@/components/common'
import { SidePanel } from '@/features/flight-builder/components'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import { FIRST_STEP } from '@/features/flight-builder/config/steps'
import { displayShareUrl } from '@/utils/shareLink'
import { formatDateSelection, placeCity, placeWithCode } from '@/utils/flightFormat'
import { formatMonthLabel, fromISODate } from '@/utils/date'
import { cn } from '@/utils/cn'

const SHARE_TIPS = [
  'Post in pet relocation groups on Facebook.',
  'Share with friends and family who travel with pets.',
  'Members join, group fills, operator quotes.',
  'We notify members in your area when the flight forms.',
]

const flightCreatedBadgeClass =
  'inline-flex h-[30px] items-center justify-center rounded-[60px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-[10px] font-sans text-[14px] font-medium leading-none text-[#112D7C] uppercase lg:h-[34px]'

const shareHeroClass =
  'mx-auto flex max-w-[340px] flex-col items-center gap-2 text-center lg:max-w-xl'

const shareHeroTitleClass =
  'font-heading text-[24px] font-medium leading-6 text-[#000000] lg:text-[32px] lg:leading-[48px]'

const shareHeroSubtitleClass =
  'font-sans text-[14px] font-normal leading-[130%] text-[#080B2B]/60 lg:font-medium lg:leading-4 lg:text-[#000000]'

const flightSummaryCardClass =
  'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-4'

const flightSummaryEyebrowClass =
  'font-sans text-[12px] font-medium uppercase leading-[15px] tracking-normal text-[#080B2B]/60'

const flightSummaryRouteClass =
  'font-heading text-[16px] font-medium leading-5 text-[#000000] lg:text-[22px] lg:leading-[27px]'

const flightSummaryMetaClass =
  'font-sans text-[14px] font-normal leading-[21px] text-[#000000]/70 lg:font-medium lg:leading-[130%]'

const statusBadgeClass =
  'inline-flex h-[30px] shrink-0 items-center rounded-full border border-[#98C3E1] bg-[#CFE3F1]/40 px-[10px] font-sans text-[12px] font-medium leading-none text-[#112D7C] uppercase lg:h-[34px] lg:text-[14px]'

const flightSummaryMemberClass =
  'min-w-0 text-right font-sans text-[14px] font-normal leading-[130%] text-[#000000]'

const flightSummaryMemberNumberClass = 'font-bold'

const shareLinkEditButtonClass =
  'size-10 shrink-0 items-center justify-center rounded-[12px] border border-[#98C3E1] bg-[#F5F9FC] transition-opacity hover:opacity-90 focus-ring'

const shareSectionLabelClass =
  'font-heading text-[14px] font-medium uppercase leading-normal tracking-[0.06em] text-[#000000] lg:text-[16px]'

const shareLinkCardClass =
  'relative flex flex-col gap-4 rounded-[20px] border border-[#A8A8A8]/20 bg-white p-[10px] sm:p-[16px]'

const shareLinkTitleClass =
  'font-heading text-[18px] font-semibold leading-[22px] text-[#000000]'

const shareLinkMetaClass =
  'font-sans text-[14px] font-medium leading-[130%] text-[#000000]/70'

const shareLinkUrlClass =
  'min-w-0 font-sans text-[14px] font-bold leading-[130%] text-[#000000] underline'

const shareLinkJoinButtonClass =
  'inline-flex h-10 shrink-0 items-center gap-1.5 rounded-[12px] border border-[#98C3E1] bg-[linear-gradient(90deg,#E9EFFA_0%,#FFFFFF_100%)] px-[14px] font-sans text-[14px] font-medium leading-4 text-[#000000] transition-opacity hover:opacity-90 focus-ring'

const shareCardClass =
  'flex flex-col gap-4 rounded-[20px] border border-[#A8A8A8]/20 bg-[#ffffff] p-[10px] sm:p-[16px]'

const shareChannelButtonClass =
  'flex h-10 w-full items-center justify-center gap-1.5 rounded-[12px] border border-[#98C3E1] bg-[#F5F9FC] px-2 font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors hover:bg-[#E9EFFA] focus-ring lg:gap-2 lg:px-[10px]'

const shareLinkDividerClass = 'border-[#A8A8A8]/40'

const sidebarStepBadgeClass =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#98C3E1]/87 bg-[#ECF4F9] font-sans text-[10px] font-semibold leading-none text-[#080B2B] lg:h-[26px] lg:w-[26px] lg:text-[12px]'

const shareTipsStepBadgeClass =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#CFE3F1] bg-[#E5EFF8] font-sans text-[10px] font-semibold leading-none text-[#080B2B] lg:h-[26px] lg:w-[26px] lg:text-[12px]'

const sidebarStepTextClass =
  'font-sans text-[14px] font-normal leading-[21px] text-[#000000] lg:text-[16px] lg:font-medium lg:leading-6'

const shareTipsTitleClass =
  'font-heading text-[16px] font-medium leading-[19px] text-[#000000] lg:text-[20px] lg:leading-6'

const dotSeparatorClass = 'size-1 shrink-0 rounded-full bg-[#000000]'

const shareTipsPanelClass = '!bg-[#FFFFFF]/40'

const shareFooterClass =
  'flex flex-row items-stretch justify-between gap-3 pt-1 max-lg:[&_button]:min-h-10 max-lg:[&_button]:flex-1 max-lg:[&_button]:px-3 max-lg:[&_button]:text-[12px] max-lg:[&_button]:leading-4'

export function ShareStep() {
  const flight = useFlightBuilderStore((s) => s.createdFlight)
  const reset = useFlightBuilderStore((s) => s.reset)
  const hasPets = useFlightBuilderStore(
    (s) => s.draft.petsEnabled && s.draft.pets.length > 0,
  )
  const router = useRouter()
  const [copied, setCopied] = useState(false)
  const [hasHydrated, setHasHydrated] = useState(false)

  useEffect(() => {
    const persist = useFlightBuilderStore.persist
    if (!persist) {
      setHasHydrated(true)
      return
    }
    if (persist.hasHydrated()) {
      setHasHydrated(true)
      return
    }
    return persist.onFinishHydration(() => {
      setHasHydrated(true)
    })
  }, [])

  // No created flight (e.g. a direct visit) — send back to the start of the flow.
  useEffect(() => {
    if (!hasHydrated) return
    if (!flight) router.replace(`/build/${FIRST_STEP}`)
  }, [hasHydrated, flight, router])

  if (!hasHydrated || !flight) return null

  const link = displayShareUrl(flight.shareUrl)
  const monthLabel = flight.date.start ? formatMonthLabel(fromISODate(flight.date.start)) : ''
  const summaryLine = [
    formatDateSelection(flight.date),
    flight.aircraftClass,
    hasPets ? 'Pets welcome' : null,
  ]
    .filter(Boolean)
    .join(' · ')

  const sharePreviewFrom = placeCity(flight.route.from).toUpperCase()
  const sharePreviewTo = placeCity(flight.route.to).toUpperCase()
  const sharePreviewMonth = monthLabel ? monthLabel.toUpperCase() : null

  const shareText = `Join my shared flight: ${flight.shareUrl}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(flight!.shareUrl)
    } catch {
      // Clipboard may be unavailable; the visible link is still selectable.
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  function goToDashboard() {
    reset()
    router.push(`/build/${FIRST_STEP}`)
  }

  return (
    <div className="animate-fade-in">
      <div className={shareHeroClass}>
        <span className={flightCreatedBadgeClass}>Flight created</span>
        <h1 className={shareHeroTitleClass}>Your shared flight is live.</h1>
        <p className={shareHeroSubtitleClass}>
          Share the link below to start filling the group. We&apos;ll keep you posted as members
          join.
        </p>
      </div>

      <div className="mt-12 flex flex-col gap-4 lg:mt-[30px] lg:grid lg:grid-cols-[minmax(0,1.72fr)_minmax(0,1fr)] lg:items-start lg:gap-5">
        <aside className="order-1 flex flex-col gap-2 lg:order-0 lg:col-start-2 lg:row-start-1 lg:gap-5">
          <SidePanel title="What just happened">
            <ol className="space-y-3">
              {[
                `Group created — ${flight.groupCode}`,
                'You’re listed as Founder.',
                'Members in your area are getting notified.',
                'We synced your group to our CRM.',
              ].map((text, i) => (
                <li key={text} className="flex items-center gap-2">
                  <span className={sidebarStepBadgeClass}>{i + 1}</span>
                  <span className={sidebarStepTextClass}>{text}</span>
                </li>
              ))}
            </ol>
          </SidePanel>
          <SidePanel title="Get help" collapsible={false}>
            <p>
              Questions about your group, pricing, or sharing? Visit the Help Center or reply
              to your confirmation email.
            </p>
          </SidePanel>
        </aside>

        <div className="order-2 flex flex-col gap-4 lg:order-0 lg:col-start-1 lg:row-start-1 lg:gap-5">
          <div className={flightSummaryCardClass}>
            <p className={flightSummaryEyebrowClass}>Group ID · {flight.groupCode}</p>
            <div className="mt-1.5 flex flex-nowrap items-center gap-2 lg:flex-wrap lg:gap-[20px]">
              <span className={cn(flightSummaryRouteClass, 'shrink-0')}>
                {placeWithCode(flight.route.from)}
              </span>
              <img
                src="/svg/soFar.svg"
                alt=""
                aria-hidden="true"
                className="size-[18px] shrink-0"
              />
              <span className={cn(flightSummaryRouteClass, 'min-w-0 truncate')}>
                {placeWithCode(flight.route.to)}
              </span>
            </div>
            <p className={cn('mt-1.5', flightSummaryMetaClass)}>{summaryLine}</p>
            <div className="mt-3 flex flex-nowrap items-center justify-between gap-2">
              <span className={statusBadgeClass}>Forming</span>
              <span className={flightSummaryMemberClass}>
                <span className={flightSummaryMemberNumberClass}>{flight.memberCount}</span>
                {' of estimated '}
                <span className={flightSummaryMemberNumberClass}>{flight.estimatedMembers}</span>
                {' members'}
              </span>
            </div>
          </div>

          <div>
            <p className={cn('mb-2', shareSectionLabelClass)}>Your share link</p>
            <div className={shareLinkCardClass}>
              <button
                type="button"
                aria-label="Edit share card"
                className={cn(
                  'absolute right-[16px] top-[16px] hidden lg:inline-flex',
                  shareLinkEditButtonClass,
                )}
              >
                <img
                  src="/svg/edittrip.svg"
                  alt=""
                  aria-hidden="true"
                  className="size-[18px]"
                />
              </button>
              <p
                className={cn(
                  'flex flex-wrap items-center gap-x-[6px] lg:pr-[56px]',
                  flightSummaryEyebrowClass,
                )}
              >
                <span>Shared flight · {sharePreviewFrom}</span>
                <img
                  src="/svg/soFar.svg"
                  alt=""
                  aria-hidden="true"
                  className="size-[12px] shrink-0"
                />
                <span>
                  {sharePreviewTo}
                  {sharePreviewMonth ? ` · ${sharePreviewMonth}` : ''}
                </span>
              </p>
              <p className={cn('flex flex-wrap items-center gap-[2px] sm:gap-x-2', shareLinkTitleClass)}>
                {(hasPets
                  ? ['Pets welcome', 'Forming now', 'Join us']
                  : ['Forming now', 'Join us']
                ).map((item, i) => (
                  <Fragment key={item}>
                    {i > 0 && <span aria-hidden="true" className={dotSeparatorClass} />}
                    <span>{item}</span>
                  </Fragment>
                ))}
              </p>
              <p className={cn('flex flex-wrap items-center gap-[4px] sm:gap-x-2', shareLinkMetaClass)}>
                {[flight.aircraftClass, 'Member-organized', 'Whole-flight pricing'].map(
                  (item, i) => (
                    <Fragment key={item}>
                      {i > 0 && <span aria-hidden="true" className={dotSeparatorClass} />}
                      <span>{item}</span>
                    </Fragment>
                  ),
                )}
              </p>
              <div
                className={cn(
                  'flex gap-2 border-t pt-4',
                  'max-md:flex-col max-md:items-stretch max-md:gap-3',
                  'md:flex-nowrap md:items-center',
                  shareLinkDividerClass,
                )}
              >
                <span className={cn(shareLinkUrlClass, 'min-w-0 break-all md:flex-1')}>{link}</span>
                <div className="flex shrink-0 items-center justify-start sm:justify-end gap-2">
                  <button
                    type="button"
                    aria-label="Edit share card"
                    className={cn('inline-flex lg:hidden', shareLinkEditButtonClass)}
                  >
                    <img
                      src="/svg/edittrip.svg"
                      alt=""
                      aria-hidden="true"
                      className="size-[18px]"
                    />
                  </button>
                  <button
                    type="button"
                    className={shareLinkJoinButtonClass}
                    onClick={() => window.open(flight.shareUrl, '_blank', 'noopener')}
                  >
                    Tap to join
                    <Icon name="arrow-right" size={16} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div>
            <p className={cn('mb-2', shareSectionLabelClass)}>Your share card</p>
            <div className={shareCardClass}>
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <div className="min-w-0 flex-1">
                    <TextInput
                      readOnly
                      value={link}
                      endAdornment={
                        <img
                          src="/svg/location.svg"
                          alt=""
                          aria-hidden="true"
                          className="size-4 shrink-0"
                        />
                      }
                      onFocus={(e) => e.currentTarget.select()}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={copyLink}
                    aria-label="Copy share link"
                    className="shrink-0 transition-opacity hover:opacity-90 focus-ring"
                  >
                    {copied ? (
                      <span className="flex size-10 items-center justify-center rounded-[12px] border border-[#98C3E1] bg-[#F5F9FC]">
                        <Icon name="check" size={18} />
                      </span>
                    ) : (
                      <img
                        src="/svg/blackedit.svg"
                        alt=""
                        aria-hidden="true"
                        className="size-10"
                      />
                    )}
                  </button>
                </div>
                {copied && (
                  <p className="font-sans text-[12px] font-medium text-success-text">
                    Link copied to clipboard.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-3 gap-2">
                <ChannelButton
                  icon="sms"
                  label="iMessage"
                  href={`sms:?&body=${encodeURIComponent(shareText)}`}
                />
                <ChannelButton
                  icon="email"
                  label="Email"
                  href={`mailto:?subject=${encodeURIComponent('Join my shared flight')}&body=${encodeURIComponent(shareText)}`}
                />
                <ChannelButton
                  icon="whatsapp"
                  label="WhatsApp"
                  href={`https://wa.me/?text=${encodeURIComponent(shareText)}`}
                />
              </div>
            </div>
          </div>

          <DashedCard padding="sm" className={shareTipsPanelClass}>
            <h3 className={shareTipsTitleClass}>Get the most out of your shared flight</h3>
            <ol className="mt-4 space-y-3">
              {SHARE_TIPS.map((tip, i) => (
                <li key={tip} className="flex items-center gap-2">
                  <span className={shareTipsStepBadgeClass}>{i + 1}</span>
                  <span className={sidebarStepTextClass}>{tip}</span>
                </li>
              ))}
            </ol>
          </DashedCard>

          <div className={shareFooterClass}>
            <Button variant="secondary">Go to Flight Group Detail</Button>
            <Button
              trailingAdornment={
                <img
                  src="/svg/whiteArrow.svg"
                  alt=""
                  aria-hidden="true"
                  className="size-[18px] shrink-0"
                />
              }
              onClick={goToDashboard}
            >
              Go to My Dashboard
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}

const channelIconSrc = {
  sms: '/svg/sms.svg',
  email: '/svg/email.svg',
  whatsapp: '/svg/whatsapp.svg',
} as const

function ChannelButton({
  icon,
  label,
  href,
}: {
  icon: keyof typeof channelIconSrc
  label: string
  href: string
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(shareChannelButtonClass)}
    >
      <img
        src={channelIconSrc[icon]}
        alt=""
        aria-hidden="true"
        className="size-[18px] shrink-0"
      />
      {label}
    </a>
  )
}