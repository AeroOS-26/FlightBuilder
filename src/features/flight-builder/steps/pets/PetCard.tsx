'use client'

/**
 * A single pet form card inside the Pets & Passengers step: name, type, breed
 * (free text), weight, and a single-select temperament.
 */

import { FormField, PillGroup, Select, TextInput } from '@/components/ui'
import {
  PET_TYPES,
  TEMPERAMENTS,
  WEIGHT_OPTIONS,
} from '@/features/flight-builder/config/petOptions'
import type { PetFieldErrors } from '@/features/flight-builder/validation'
import type { Pet, PetTemperament } from '@/types'

/**
 * Shown only where the client asked for it — the join request (frame 42) — so
 * the Flight Builder and the profile form keep the card they already have.
 * Opt-in rather than flag-gated inside the card, because the same component
 * serves three surfaces and only one of them asks the question.
 */
const SERVICE_ANIMAL_CHOICES = ['No', 'Yes'] as const
type ServiceAnimalChoice = (typeof SERVICE_ANIMAL_CHOICES)[number]

/**
 * Counsel's wording, 2026-09-29. Legal text: not to be reworded, shortened or
 * reflowed without the client confirming it with their attorney.
 */
const SERVICE_ANIMAL_NOTE =
  'A qualified service animal is not subject to the travel readiness confirmation. ' +
  'The operating carrier may still make the inquiries permitted by law, request the ' +
  'documentation authorised by law, and assess the animal’s behaviour. For a large ' +
  'service animal, carriage depends on an accommodation and safety assessment by the carrier.'

interface PetCardProps {
  pet: Pet
  index: number
  errors?: PetFieldErrors
  onChange: (patch: Partial<Omit<Pet, 'id'>>) => void
  onRemove: () => void
  /** Ask whether this animal is a service animal. Join request only. */
  showServiceAnimal?: boolean
}

export function PetCard({
  pet,
  index,
  errors,
  onChange,
  onRemove,
  showServiceAnimal = false,
}: PetCardProps) {
  const idBase = `pet-${pet.id}`
  return (
    <div className="flex flex-col gap-3 rounded-[16px] border border-[#CDCDCD] bg-white p-4 lg:gap-2 lg:px-[14px] lg:py-[10px]">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-heading text-[16px] font-medium leading-[19px] text-[#000000]">
          Pet {index + 1}
        </h4>
        <button
          type="button"
          onClick={onRemove}
          className="inline-flex h-10 shrink-0 items-center rounded-[12px] border border-[#98C3E1] bg-[#F5F9FC] px-[14px] font-sans text-[14px] font-medium leading-4 text-[#000000] transition-opacity hover:opacity-90 focus-ring max-lg:py-[10px] lg:gap-2 lg:py-[12px]"
        >
          Remove pet
        </button>
      </div>

      <div className="grid gap-3 lg:grid-cols-2 lg:gap-2">
        <FormField label="Pet's name" htmlFor={`${idBase}-name`} error={errors?.name}>
          <TextInput
            id={`${idBase}-name`}
            placeholder="e.g. Biscuit"
            value={pet.name}
            invalid={Boolean(errors?.name)}
            onChange={(e) => onChange({ name: e.target.value })}
          />
        </FormField>

        <FormField label="Pet type" htmlFor={`${idBase}-type`} error={errors?.type}>
          <Select
            id={`${idBase}-type`}
            placeholder="Select type"
            options={PET_TYPES}
            value={pet.type}
            invalid={Boolean(errors?.type)}
            onChange={(e) => onChange({ type: e.target.value })}
          />
        </FormField>

        <FormField label="Breed" htmlFor={`${idBase}-breed`} error={errors?.breed}>
          <TextInput
            id={`${idBase}-breed`}
            placeholder="e.g. Labrador Retriever"
            value={pet.breed}
            invalid={Boolean(errors?.breed)}
            onChange={(e) => onChange({ breed: e.target.value })}
          />
        </FormField>

        <FormField label="Weight (lbs)" htmlFor={`${idBase}-weight`} error={errors?.weight}>
          <Select
            id={`${idBase}-weight`}
            placeholder="Select weight"
            options={WEIGHT_OPTIONS}
            value={pet.weight}
            invalid={Boolean(errors?.weight)}
            onChange={(e) => onChange({ weight: e.target.value })}
          />
        </FormField>
      </div>

      <FormField
        label="Temperament (pick one)"
        className="items-start"
        labelClassName="font-heading text-[16px] mt-[19px] font-medium leading-normal text-[#000000]"
        error={errors?.temperament}
      >
        <PillGroup<PetTemperament>
          value={pet.temperament}
          options={TEMPERAMENTS}
          invalid={Boolean(errors?.temperament)}
          onChange={(temperament) => onChange({ temperament })}
        />
      </FormField>

      {showServiceAnimal && (
        <>
          <FormField
            label={`Is ${pet.name.trim() || `Pet ${index + 1}`} a service animal?`}
            className="items-start"
            labelClassName="font-heading text-[16px] mt-[19px] font-medium leading-normal text-[#000000]"
          >
            <PillGroup<ServiceAnimalChoice>
              value={pet.serviceAnimal ? 'Yes' : 'No'}
              options={SERVICE_ANIMAL_CHOICES}
              onChange={(choice) => onChange({ serviceAnimal: choice === 'Yes' })}
            />
          </FormField>

          {/* Only once the answer is yes: the note explains what the answer
              changes, so showing it beforehand would read as a warning about a
              question not yet asked. */}
          {pet.serviceAnimal && (
            <p className="font-sans text-[13px] leading-[1.5] text-[#000000]/70">
              {SERVICE_ANIMAL_NOTE}
            </p>
          )}
        </>
      )}
    </div>
  )
}