'use client'

/**
 * Route step.
 *
 * Two location autocompletes (from / to) with airport disambiguation, the
 * "How it works" and "Why we ask" side panels, and field-specific validation
 * that names the missing field. Errors surface only after a continue attempt,
 * then update live.
 */

import { useState } from 'react'
import { StepShell } from './StepShell'
import { LocationField } from './route/LocationField'
import { ErrorBanner, InfoNote } from '@/components/ui'
import { SectionHeading, HowItWorksPanel, SidePanel } from '@/features/flight-builder/components'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import { useStepNavigation } from '@/features/flight-builder/hooks'
import { validateRoute, hasRouteErrors } from '@/features/flight-builder/validation'

export function RouteStep() {
  const route = useFlightBuilderStore((s) => s.draft.route)
  const setRoute = useFlightBuilderStore((s) => s.setRoute)
  const { goNext, currentStepId } = useStepNavigation()
  const [submitted, setSubmitted] = useState(false)
  const [fromNoMatch, setFromNoMatch] = useState(false)
  const [toNoMatch, setToNoMatch] = useState(false)

  const errors = submitted ? validateRoute(route) : {}
  const hasErrors = hasRouteErrors(errors)
  const showCompactFooter = hasErrors || fromNoMatch || toNoMatch

  function handleContinue() {
    setSubmitted(true)
    if (!hasRouteErrors(validateRoute(route))) goNext()
  }

  return (
    <StepShell
      onContinue={handleContinue}
      footerCompact={showCompactFooter}
      aside={
        <>
          <HowItWorksPanel currentStepId={currentStepId} />
          <SidePanel title="Why we ask">
            <p>
              Your route is the starting point for every pricing and routing decision we
              make. Once we know where you’re flying from and to, we look at reachable
              airports, likely aircraft size, and known empty-leg traffic on that corridor.
            </p>
            <p>
              You’ll be able to refine the exact airport later — for now, anywhere in the
              world is fine.
            </p>
          </SidePanel>
        </>
      }
    >
      <SectionHeading
        title="Route"
        description="Tell us where you’re going. We accept any location worldwide — we’ll work out the closest reachable airports once we know your full trip."
      />

      {errors.banner && <ErrorBanner className="mt-5">{errors.banner}</ErrorBanner>}

      <div className="mt-[24px] flex flex-col gap-[24px]">
        <LocationField
          label="Where from"
          placeholder="Type any city, region, or airport — anywhere in the world"
          value={route.from}
          onChange={(place) => setRoute({ from: place })}
          invalid={errors.fromInvalid}
          error={errors.from}
          onNoMatchChange={setFromNoMatch}
        />
        <LocationField
          label="Where to"
          placeholder="Where are you flying to?"
          value={route.to}
          onChange={(place) => setRoute({ to: place })}
          invalid={errors.toInvalid}
          error={errors.to}
          onNoMatchChange={setToNoMatch}
        />
      </div>

      <InfoNote className="mt-4">
        Don’t worry about exact airports yet. We’ll handle that once we know where you want
        to fly.
      </InfoNote>
    </StepShell>
  )
}