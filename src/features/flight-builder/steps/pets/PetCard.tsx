'use client'

/**
 * A single pet form card inside the Pets & Passengers step: name, type, breed,
 * weight, and a single-select temperament. Changing the species resets the
 * breed so the options stay coherent.
 */

import { FormField, PillGroup, Select, TextInput } from '@/components/ui'
import {
  PET_TYPES,
  TEMPERAMENTS,
  WEIGHT_OPTIONS,
  getBreedOptions,
} from '@/features/flight-builder/config/petOptions'
import type { PetFieldErrors } from '@/features/flight-builder/validation'
import type { Pet, PetTemperament } from '@/types'

interface PetCardProps {
  pet: Pet
  index: number
  errors?: PetFieldErrors
  onChange: (patch: Partial<Omit<Pet, 'id'>>) => void
  onRemove: () => void
}

export function PetCard({ pet, index, errors, onChange, onRemove }: PetCardProps) {
  const idBase = `pet-${pet.id}`
  return (
    <div className="flex flex-col gap-3 rounded-[12px] border border-[#A8A8A8]/20 bg-white p-4 lg:gap-2 lg:px-[14px] lg:py-[10px]">
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
        <FormField label="Pet name" htmlFor={`${idBase}-name`} error={errors?.name}>
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
            onChange={(e) => onChange({ type: e.target.value, breed: '' })}
          />
        </FormField>

        <FormField label="Breed" htmlFor={`${idBase}-breed`} error={errors?.breed}>
          <Select
            id={`${idBase}-breed`}
            placeholder="Select breed"
            options={getBreedOptions(pet.type)}
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
        error={errors?.temperament}
      >
        <PillGroup<PetTemperament>
          value={pet.temperament}
          options={TEMPERAMENTS}
          invalid={Boolean(errors?.temperament)}
          onChange={(temperament) => onChange({ temperament })}
        />
      </FormField>
    </div>
  )
}