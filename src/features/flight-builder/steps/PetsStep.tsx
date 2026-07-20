'use client'

/**
 * Pets & Passengers step.
 *
 * Dynamic travelers (Traveler 1 is the non-removable Founder) and an optional
 * pet list gated by the "Bringing pets?" toggle. When pets are on the flight, a
 * conditional travel-readiness disclaimer must be accepted. Validation surfaces
 * a top banner plus per-field errors after a continue attempt.
 */

import { useState } from 'react'
import { StepShell } from './StepShell'
import { TravelerCard } from './pets/TravelerCard'
import { PetCard } from './pets/PetCard'
import { Checkbox, DashedCard, DashedOutline, ErrorBanner, Toggle, dashedAddSurfaceClass } from '@/components/ui'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'
import {
  DashedPanel,
  PetsSummaryStrip,
  SectionHeading,
  SidePanel,
  SubHeading,
} from '@/features/flight-builder/components'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import { useStepNavigation } from '@/features/flight-builder/hooks'
import { MAX_TRAVELERS } from '@/features/flight-builder/config/capacity'
import { validatePets, hasPetsErrors } from '@/features/flight-builder/validation'

const READINESS_TEXT =
  'I confirm my pet is travel-ready, will not disrupt other passengers or crew, and I accept responsibility for their behavior throughout the flight. I understand that operators reserve the right to refuse boarding for pets that appear unfit for travel.'

function AddButton({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        'flex h-11 w-full items-center justify-center gap-2 font-sans text-[14px] font-medium leading-4 text-[#112D7C] transition-colors hover:bg-[#CFE3F1]/30 focus-ring',
        'disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent',
        dashedAddSurfaceClass,
      )}
    >
      <DashedOutline />
      <Icon name="plus" size={16} className="relative text-[#112D7C]" />
      <span className="relative">{label}</span>
    </button>
  )
}

export function PetsStep() {
  const draft = useFlightBuilderStore((s) => s.draft)
  const addTraveler = useFlightBuilderStore((s) => s.addTraveler)
  const updateTraveler = useFlightBuilderStore((s) => s.updateTraveler)
  const removeTraveler = useFlightBuilderStore((s) => s.removeTraveler)
  const setPetsEnabled = useFlightBuilderStore((s) => s.setPetsEnabled)
  const addPet = useFlightBuilderStore((s) => s.addPet)
  const updatePet = useFlightBuilderStore((s) => s.updatePet)
  const removePet = useFlightBuilderStore((s) => s.removePet)
  const setPetReadiness = useFlightBuilderStore((s) => s.setPetReadiness)
  const { goNext } = useStepNavigation()
  const [submitted, setSubmitted] = useState(false)

  const errors = submitted
    ? validatePets(draft)
    : { travelers: {}, pets: {}, readiness: undefined, banner: undefined }

  const petsOnFlight = draft.petsEnabled && draft.pets.length > 0

  function handleContinue() {
    setSubmitted(true)
    if (!hasPetsErrors(validatePets(draft))) goNext()
  }

  return (
    <StepShell
      onContinue={handleContinue}
      footerCompact
      bodyClassName="gap-6 p-4"
      aside={
        <>
          <SidePanel title="Why we ask">
            <div>
              <p className="font-heading text-[14px] font-medium leading-[19px] text-[#000000] lg:text-[16px]">
                Pet details:
              </p>
              <p className="mt-2 font-sans text-[14px] font-normal leading-5 text-[#000000] lg:mt-[8px] lg:font-medium lg:leading-[130%] lg:text-[#000000]/70">
                Operators need breed, weight, temperament, and crate size (cats only) before
                approving boarding. We pass this to them when the group fills.
              </p>
            </div>
            <div>
              <p className="font-heading text-[14px] font-medium leading-[19px] text-[#000000] lg:text-[16px]">
                The disclaimer:
              </p>
              <p className="mt-2 font-sans text-[14px] font-normal leading-5 text-[#000000] lg:mt-[8px] lg:font-medium lg:leading-[130%] lg:text-[#000000]/70">
                Pets in cabin require a clear understanding of behavior and travel-readiness.
                Operators can refuse boarding if a pet appears unfit.
              </p>
            </div>
          </SidePanel>
          <DashedPanel title="Privacy">
            <p>
              Your details are private. We share what’s needed with the operator only after
              the group fills.
            </p>
          </DashedPanel>
        </>
      }
    >
      <SectionHeading title="Pets & Passengers" />

      <div className="flex flex-col gap-4">
        <PetsSummaryStrip />
        {errors.banner && <ErrorBanner>{errors.banner}</ErrorBanner>}
      </div>

      {/* Travelers */}
      <div>
        <SubHeading title="Travelers" description="How many people will be on this flight?" />
        <div className="mt-4 space-y-3">
          {draft.travelers.map((traveler, index) => (
            <TravelerCard
              key={traveler.id}
              traveler={traveler}
              index={index}
              error={errors.travelers[traveler.id]}
              onChangeName={(name) => updateTraveler(traveler.id, name)}
              onRemove={traveler.isFounder ? undefined : () => removeTraveler(traveler.id)}
            />
          ))}
          <AddButton
            label="Add another traveler"
            onClick={addTraveler}
            disabled={draft.travelers.length >= MAX_TRAVELERS}
          />
          {draft.travelers.length >= MAX_TRAVELERS && (
            <p className="font-sans text-[12px] font-medium leading-[18px] text-[#000000]/60">
              You’ve reached the maximum of {MAX_TRAVELERS} travelers for a flight.
            </p>
          )}
        </div>
      </div>

      {/* Pets */}
      <div>
        <SubHeading
          title="Bringing pets?"
          infoTooltip="Pricing reflects the space your pets require. Flights have strict people/pet limits, and seating/load decisions follow operator requirements."
          description="Add each pet so operators can approve boarding."
          action={
            <Toggle
              checked={draft.petsEnabled}
              onChange={setPetsEnabled}
              label="Bringing pets?"
            />
          }
        />
        {draft.petsEnabled && (
          <div className="mt-4 space-y-3">
            {draft.pets.map((pet, index) => (
              <PetCard
                key={pet.id}
                pet={pet}
                index={index}
                errors={errors.pets[pet.id]}
                onChange={(patch) => updatePet(pet.id, patch)}
                onRemove={() => removePet(pet.id)}
              />
            ))}
            <AddButton label="Add another pet" onClick={addPet} />
          </div>
        )}
      </div>

      {/* Travel readiness — conditional on pets being on the flight. */}
      {petsOnFlight && (
        <DashedCard variant="readiness" padding="none" className="p-4">
          <h3 className="font-heading text-[20px] font-medium leading-6 text-[#000000]">
            Travel readiness
          </h3>
          <p className="mt-3 font-sans text-[14px] font-normal leading-5 text-[#000000]/70 lg:leading-[140%]">
            {READINESS_TEXT}
          </p>
          <div className="mt-3">
            <Checkbox
              checked={draft.petReadinessAccepted}
              onChange={setPetReadiness}
              invalid={Boolean(errors.readiness)}
            >
              <span className="font-medium">I agree — </span>
              <span className="font-normal">I have read and accept the above.</span>
            </Checkbox>
            {errors.readiness && (
              <p className="ml-[22px] mt-1.5 flex items-center gap-1.5 font-sans text-[11px] font-medium leading-none tracking-[-0.2px] text-danger-text">
                <Icon name="alert" size={12} className="shrink-0" strokeWidth={2} />
                {errors.readiness}
              </p>
            )}
          </div>
        </DashedCard>
      )}
    </StepShell>
  )
}