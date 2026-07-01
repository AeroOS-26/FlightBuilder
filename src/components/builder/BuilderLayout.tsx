'use client'

/**
 * Layout shell for the Flight Builder.
 *
 * Renders the global top nav, then — for the in-flow steps — the centered page
 * title and the progress stepper, followed by the step content (`children`).
 * The Share step is a post-creation success screen, so it opts out of the
 * title + stepper chrome and renders its own header.
 */

import { useEffect, type ReactNode } from 'react'
import { TopNav } from './TopNav'
import { Stepper } from './Stepper'
import { useStepNavigation } from '@/features/flight-builder/hooks/useStepNavigation'
import { useFounderIdentity } from '@/features/flight-builder/hooks/useFounderIdentity'
import type { StepId } from '@/types'

const SUBTITLES: Record<StepId, string> = {
  route: 'Where are you flying from and to?',
  dates: 'When are you flying, from and to?',
  pets: 'Who and which pets are flying with you?',
  notes: 'Anything we should know before we build it?',
  review: 'One last look before we create your shared flight.',
  share: '',
}

export function BuilderLayout({ children }: { children: ReactNode }) {
  // Ensure the Founder is seeded as Traveler 1 / header identity.
  useFounderIdentity()
  const { currentStep, currentStepId } = useStepNavigation()
  const showChrome = currentStep.showInStepper

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 })
  }, [currentStepId])

  return (
    <div className="flex min-h-svh flex-col">
      <TopNav />
      <main className="flex-1 bg-[#F8F8F8] bg-[url('/svg/background.svg')] bg-cover bg-center bg-no-repeat">
        <div className="mx-auto w-full max-w-[1440px]  px-4 pb-16 pt-6 sm:pt-10 lg:px-6">
          {showChrome && (
            <>
              <div className="text-center md:text-center">
                <h1 className="font-heading text-[24px] font-medium  text-[#000000] md:text-[26px] md:leading-tight md:tracking-tight lg:text-[32px]">
                  Create a Shared Flight
                </h1>
                <p className="mt-1 font-sans text-[14px] font-normal leading-none text-[#000000] md:font-medium md:leading-normal md:text-[13px] lg:text-[14px]">
                  {SUBTITLES[currentStepId]}
                </p>
              </div>
              <div
                className="my-4 h-px w-full bg-[#E0E0E0] lg:hidden"
                aria-hidden="true"
              />
              <div className="md:mt-7 lg:mt-9">
                <Stepper currentStepId={currentStepId} />
              </div>
            </>
          )}
          <div className={showChrome ? 'mt-5 sm:mt-7 lg:mt-9' : ''}>
            {children}
          </div>
        </div>
      </main>
    </div>
  )
}
