'use client'

/**
 * Progress stepper.
 *
 * Desktop: a row of icon nodes joined by connectors. Completed steps are green
 * with a check, the current step uses a dark blue circle with a white icon and an
 * outer accent ring separated by a 5.03px white gap, all within 48×48px. Upcoming
 * steps use a light blue circle with a black icon. Connectors after
 * completed steps are fully light blue; the connector leaving the current step is
 * half-filled accent; upcoming connectors are unchanged.
 *
 * Mobile / tablet: numbered circles joined by full-width connectors; labels sit
 * on a second row. Desktop (lg+): icon node row.
 */

import { Fragment } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'
import { STEPPER_STEPS } from '@/features/flight-builder/config/steps'
import type { StepId } from '@/types'

const MOBILE_STEP_RING_GAP = '2px'
const DESKTOP_STEP_RING_GAP = '5.03px'

interface StepperProps {
  currentStepId: StepId
}

export function Stepper({ currentStepId }: StepperProps) {
  const currentIndex = STEPPER_STEPS.findIndex((s) => s.id === currentStepId)
  const total = STEPPER_STEPS.length
  const safeIndex = currentIndex < 0 ? 0 : currentIndex

  return (
    <nav aria-label="Progress">
      {/* Mobile + tablet: numbered step row with wide connectors. */}
      <div className="w-full lg:hidden">
        <div className="flex w-full items-center">
          {STEPPER_STEPS.map((step, index) => {
            const isComplete = index < safeIndex
            const isCurrent = index === safeIndex
            const isLast = index === total - 1
            const connectorState =
              index < safeIndex ? 'done' : index === safeIndex ? 'active' : 'upcoming'

            return (
              <Fragment key={step.id}>
                <MobileStepNode
                  index={index}
                  isComplete={isComplete}
                  isCurrent={isCurrent}
                />
                {!isLast && (
                  <div className="flex min-w-[20px] flex-1 items-center px-1 sm:min-w-[28px] sm:px-2">
                    <MobileConnector state={connectorState} />
                  </div>
                )}
              </Fragment>
            )
          })}
        </div>
        <div className="flex w-full">
          {STEPPER_STEPS.map((step, index) => {
            const isLast = index === total - 1
            const isCurrent = index === safeIndex

            return (
              <div
                key={`${step.id}-label`}
                className={cn('mt-1.5 flex min-w-0 items-start', !isLast && 'flex-1')}
              >
                <p
                  className={cn(
                    'w-[30px] shrink-0 text-center font-sans text-[10px] font-medium leading-3 sm:w-8 sm:text-[11px] sm:leading-[14px]',
                    isCurrent ? 'text-[#000000]' : 'text-[#6D6D6D]',
                  )}
                >
                  {step.label}
                </p>
                {!isLast && (
                  <div
                    className="min-w-[20px] flex-1 px-1 sm:min-w-[28px] sm:px-2"
                    aria-hidden="true"
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Desktop: full icon node row. */}
      <ol className="hidden w-full items-start lg:flex">
        {STEPPER_STEPS.map((step, index) => {
          const isComplete = index < safeIndex
          const isCurrent = index === safeIndex
          const isLast = index === total - 1
          const connectorState =
            index < safeIndex ? 'done' : index === safeIndex ? 'active' : 'upcoming'

          return (
            <li
              key={step.id}
              className={cn('flex min-w-0 flex-col', !isLast && 'flex-1')}
            >
              <div className="flex w-full items-center">
                <div className="flex w-12 shrink-0 flex-col items-start">
                  <StepNode
                    icon={step.icon}
                    state={isComplete ? 'complete' : isCurrent ? 'current' : 'upcoming'}
                  />
                </div>
                {!isLast && <Connector state={connectorState} />}
              </div>
              <div className="mt-2 shrink-0 text-left">
                <p className="whitespace-nowrap font-sans text-[12px] font-medium leading-[15px] text-[#080B2B]">
                  Step {index + 1}
                </p>
                <p
                  className={cn(
                    'whitespace-nowrap font-heading text-[16px] font-medium leading-[19px]',
                    isCurrent || isComplete ? 'text-[#000000]' : 'text-[#6D6D6D]',
                  )}
                >
                  {step.label}
                </p>
              </div>
            </li>
          )
        })}
      </ol>
    </nav>
  )
}

const STEP_ICON_SRC: Record<string, string> = {
  route: '/svg/route.svg',
  calendar: '/svg/dates.svg',
  pets: '/svg/pent.svg',
  notes: '/svg/notes.svg',
  review: '/svg/review.svg',
}

function StepNode({
  icon,
  state,
}: {
  icon: Parameters<typeof Icon>[0]['name']
  state: 'complete' | 'current' | 'upcoming'
}) {
  const src = STEP_ICON_SRC[icon]

  const iconContent =
    state === 'complete' ? (
      <Icon name="check" size={20} strokeWidth={2.4} />
    ) : src ? (
      <span
        aria-hidden="true"
        className={cn(
          state === 'current'
            ? 'h-[17px] w-[17px] bg-white'
            : 'h-[23px] w-[23px] bg-[#000000]',
        )}
        style={{
          WebkitMaskImage: `url(${src})`,
          maskImage: `url(${src})`,
          WebkitMaskRepeat: 'no-repeat',
          maskRepeat: 'no-repeat',
          WebkitMaskPosition: 'center',
          maskPosition: 'center',
          WebkitMaskSize: 'contain',
          maskSize: 'contain',
        }}
      />
    ) : (
      <Icon name={icon} size={20} />
    )

  if (state === 'current') {
    return (
      <span
        aria-current="step"
        className="box-border flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-accent bg-white"
        style={{ padding: DESKTOP_STEP_RING_GAP }}
      >
        <span className="box-border flex size-full items-center justify-center rounded-full border border-accent bg-accent text-white">
          {iconContent}
        </span>
      </span>
    )
  }

  return (
    <span
      className={cn(
        'box-border flex h-12 w-12 shrink-0 items-center justify-center rounded-full border transition-colors',
        state === 'complete' && 'border-success bg-success text-white',
        state === 'upcoming' && 'border-[#CFE3F1] bg-[#CFE3F1] text-[#000000]',
      )}
    >
      {iconContent}
    </span>
  )
}

function MobileStepNode({
  index,
  isComplete,
  isCurrent,
}: {
  index: number
  isComplete: boolean
  isCurrent: boolean
}) {
  if (isCurrent) {
    return (
      <span
        aria-hidden="true"
        className="box-border flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-accent bg-white sm:h-8 sm:w-8"
        style={{ padding: MOBILE_STEP_RING_GAP }}
      >
        <span className="box-border flex size-full items-center justify-center rounded-full border border-accent bg-accent font-sans text-[12px] font-semibold leading-none text-white">
          {index + 1}
        </span>
      </span>
    )
  }

  if (isComplete) {
    return (
      <span
        aria-hidden="true"
        className="flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-success bg-success text-white sm:h-8 sm:w-8"
      >
        <Icon name="check" size={14} strokeWidth={2.4} />
      </span>
    )
  }

  return (
    <span
      aria-hidden="true"
      className="box-border flex h-[30px] w-[30px] shrink-0 items-center justify-center rounded-full border border-[#CFE3F1] bg-[#CFE3F1] font-sans text-[12px] font-semibold leading-none text-[#112D7C] sm:h-8 sm:w-8"
    >
      {index + 1}
    </span>
  )
}

function MobileConnector({ state }: { state: 'done' | 'active' | 'upcoming' }) {
  if (state === 'done') {
    return (
      <span
        aria-hidden="true"
        className="block h-[2px] w-full rounded-full bg-[#109A51]"
      />
    )
  }

  return (
    <span className="block h-[2px] w-full overflow-hidden rounded-full bg-[#D6D9E2]">
      <span
        className={cn(
          'block h-full rounded-full bg-accent',
          state === 'active' && 'w-1/2',
          state === 'upcoming' && 'w-0',
        )}
      />
    </span>
  )
}

function Connector({ state }: { state: 'done' | 'active' | 'upcoming' }) {
  return (
    <span className="mx-1 h-0.5 flex-1 overflow-hidden rounded-full bg-border md:mx-2">
      <span
        className={cn(
          'block h-full rounded-full',
          state === 'done' && 'w-full bg-[#109A51]',
          state === 'active' && 'w-1/2 bg-accent',
          state === 'upcoming' && 'w-0',
        )}
      />
    </span>
  )
}