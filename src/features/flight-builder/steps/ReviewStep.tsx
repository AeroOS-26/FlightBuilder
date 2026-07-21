'use client'

/**
 * Review step.
 *
 * Summarizes what happens on confirm and triggers flight creation. The confirm
 * action shows a failure banner with the normalized API error; on success the
 * create-flight hook advances to the Share step.
 */

import { StepShell } from './StepShell'
import { ErrorBanner } from '@/components/ui'
import { SectionHeading, SidePanel, TripSummaryPanel, TripSummaryRows } from '@/features/flight-builder/components'
import { useCreateFlight } from '@/features/flight-builder/hooks'
import { cn } from '@/utils/cn'

interface TimelineItem {
  title: string
  body: string
  chip?: { label: string; tone: 'accent' | 'warning' | 'success' }
}

const TIMELINE: TimelineItem[] = [
  {
    title: 'We review your route and post an estimate',
    body: 'An advisor checks the route, available aircraft, and any pet or party constraints, then posts a shared and private estimate to your Shared Flight page.',
  },
  {
    title: 'You get a shareable link',
    body: 'Send it to friends, your relocation groups, and post it publicly to invite other travelers on the same route.',
    chip: { label: 'Immediately', tone: 'accent' },
  },
  {
    title: 'Members join, we source the aircraft',
    body: 'As members commit, we line up the operator and confirm the aircraft for the group.',
    chip: { label: 'Rolling', tone: 'warning' },
  },
  {
    title: 'Group confirms and we book',
    body: 'Once the group is full or you decide to lock at current size, we confirm the group, collect payment from group members, confirm the charter with the operator, pay the operator, and send out exact flight details.',
    chip: { label: 'On Fill', tone: 'success' },
  },
]

const WHATS_NEXT = [
  'We create your shared flight group.',
  'You get a shareable link to send around.',
  'Members join, group fills, operator quotes.',
  'Once confirmed, we lock in your flight.',
]

const reviewCardClass = 'rounded-[20px] border border-[#A8A8A8]/20 bg-white p-4'

const reviewDividerClass = 'border-[#A8A8A8]/40'

const reviewEyebrowClass =
  'font-sans text-[12px] font-medium uppercase leading-[15px] tracking-normal text-[#080B2B] lg:text-[#080B2B]/60'

const reviewLabelClass =
  'font-sans text-[12px] font-medium uppercase leading-[15px] tracking-normal text-[#080B2B]/60'

const reviewValueClass =
  'font-heading text-[14px] font-medium leading-6 text-[#000000] lg:text-[16px]'

const reviewLeadClass =
  'font-heading text-[16px] font-semibold leading-5 text-[#000000] lg:text-[18px] lg:leading-[22px]'

const reviewBodyClass =
  'font-sans text-[14px] font-normal leading-[21px] text-[#000000]/70 lg:font-medium lg:leading-[130%]'

const timelineStepBadgeClass =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#98C3E1]/87 bg-[#ECF4F9] font-sans text-[10px] font-semibold leading-none text-[#080B2B] lg:h-[26px] lg:w-[26px] lg:text-[12px]'

const whatsNextStepBadgeClass =
  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-[#98C3E1]/87 bg-[#ECF4F9] font-sans text-[10px] font-semibold leading-none text-[#080B2B] lg:h-[26px] lg:w-[26px] lg:text-[12px]'

const whatsNextStepTextClass =
  'font-sans text-[14px] font-medium leading-5 text-[#000000] lg:text-[16px] lg:leading-6'

const timelineSectionTitleClass =
  'font-heading text-[20px] font-medium leading-[19px] text-[#000000] lg:leading-6'

const timelineTitleClass =
  'font-heading text-[14px] font-medium leading-5 text-[#000000] lg:text-[16px] lg:leading-6'

const timelineBodyClass =
  'max-w-[486px] font-sans text-[14px] font-normal leading-[21px] text-[#000000]/70 lg:font-medium lg:leading-[130%]'

const timelineChipBaseClass =
  'inline-flex h-[26px] shrink-0 items-center rounded-full border px-[10px] font-sans text-[14px] font-normal leading-none lg:h-[34px] lg:text-[14px] lg:font-normal'

const timelineChipClass: Record<'accent' | 'warning' | 'success', string> = {
  accent: cn(
    timelineChipBaseClass,
    'border-[#98C3E1] bg-[#CFE3F1]/40 text-[#112D7C]',
  ),
  warning: cn(
    timelineChipBaseClass,
    'border-[#FFDB43] bg-[#FFDB43]/10 text-[#946400]',
  ),
  success: cn(
    timelineChipBaseClass,
    'border-[#1AA35A] bg-[#1AA35A]/10 text-[#1AA35A]',
  ),
}

function ReviewTimelineChip({ label, tone }: { label: string; tone: 'accent' | 'warning' | 'success' }) {
  return <span className={timelineChipClass[tone]}>{label}</span>
}

export function ReviewStep() {
  const { confirm, isPending, isError, error } = useCreateFlight()

  return (
    <StepShell
      onContinue={confirm}
      continueDisabled={isPending}
      bodyClassName="gap-6 p-4"
      stackClassName="max-lg:gap-[18px]"
      asideClassName="max-lg:gap-2"
      aside={
        <>
          <SidePanel title="Your Trip so far" className="lg:hidden">
            <TripSummaryRows includeNotes />
          </SidePanel>
          <TripSummaryPanel includeNotes showEditButton={false} className="hidden lg:block" />
          <SidePanel title="What happens next">
            <ol className="space-y-3">
              {WHATS_NEXT.map((text, i) => (
                <li key={text} className="flex items-center gap-2">
                  <span className={whatsNextStepBadgeClass}>{i + 1}</span>
                  <span className={whatsNextStepTextClass}>{text}</span>
                </li>
              ))}
            </ol>
          </SidePanel>
        </>
      }
    >
      <SectionHeading title="Review & Create" />

      <div className={cn(reviewCardClass, 'flex flex-col gap-[15px]')}>
        <div className="flex flex-col gap-[15px]">
          <p className={reviewEyebrowClass}>Ready to hand off to Perro Air</p>
          <h3 className={reviewLeadClass}>
            The Perro Air team will respond with shared and private flight estimates.
          </h3>
          <p className={reviewBodyClass}>
            Once we&apos;ve reviewed your route, we&apos;ll post an estimate on your Shared Flight
            page and start sourcing the aircraft. You don&apos;t need to do anything else right now
            — we&apos;ll email you the moment the estimate lands.
          </p>
        </div>

        {isError && error && (
          <ErrorBanner>
            {error.message} {error.retryable && 'Please try again.'}
          </ErrorBanner>
        )}

        <hr className={cn('border-0 border-t', reviewDividerClass)} />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className={reviewLabelClass}>Your trip so far</p>
            <p className={cn('mt-1', reviewValueClass)}>A Perro Air advisor</p>
          </div>
          <div>
            <p className={reviewLabelClass}>Cost so far</p>
            <p className={cn('mt-1', reviewValueClass)}>$0 - no charge until you book</p>
          </div>
        </div>
      </div>

      <div className={cn(reviewCardClass, 'flex flex-col gap-4')}>
        <h3 className={timelineSectionTitleClass}>
          When you tap Create Shared Flight
        </h3>
        <ol>
          {TIMELINE.map((item, index) => (
            <li
              key={item.title}
              className={cn(
                'flex gap-3 py-[18px] first:pt-0 last:pb-0',
                index > 0 && cn('border-t', reviewDividerClass),
              )}
            >
              <span className={timelineStepBadgeClass}>{index + 1}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 flex-1 flex-col gap-2">
                    <p className={cn(timelineTitleClass, 'min-w-0')}>{item.title}</p>
                    <p className={timelineBodyClass}>{item.body}</p>
                  </div>
                  {item.chip && (
                    <ReviewTimelineChip label={item.chip.label} tone={item.chip.tone} />
                  )}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </StepShell>

  )
}