'use client'

/**

 * A single traveler row inside the Pets & Passengers step.

 * One traveler is designated primary contact; others can be assigned via the

 * header pill. The Founder (Traveler 1) cannot be removed.

 */



import { FormField, TextInput } from '@/components/ui'

import { cn } from '@/utils/cn'

import type { Traveler } from '@/types'



const travelerBadgeClass =

  'inline-flex h-10 shrink-0 items-center rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] py-[10px] font-sans text-[14px] font-medium leading-4'



interface TravelerCardProps {

  traveler: Traveler

  index: number

  isPrimaryContact: boolean

  error?: string

  onChangeName: (name: string) => void

  onSetPrimaryContact: () => void

  onRemove?: () => void

}



export function TravelerCard({

  traveler,

  index,

  isPrimaryContact,

  error,

  onChangeName,

  onSetPrimaryContact,

  onRemove,

}: TravelerCardProps) {

  const fieldId = `traveler-${traveler.id}`

  return (

    <div className="rounded-[12px] border border-[#A8A8A8]/20 bg-white p-4 lg:rounded-2xl lg:p-5">

      <div className="mb-3 flex items-center justify-between gap-3">

        <h4 className="font-heading text-[16px] font-medium leading-[19px] text-[#000000]">

          {traveler.isFounder ? 'Traveler 1 · Founder' : `Traveler ${index + 1}`}
          {traveler.isFounder && <span className="text-[#000000]/70"> (You)</span>}

        </h4>

        {isPrimaryContact ? (

          <span className={cn(travelerBadgeClass, 'text-[#112D7C]')}>primary contact</span>

        ) : (

          <button

            type="button"

            onClick={onSetPrimaryContact}

            aria-label={`Set Traveler ${index + 1} as primary contact`}

            className={cn(

              travelerBadgeClass,

              'text-[#000000] transition-opacity hover:opacity-90 focus-ring',

            )}

          >

            primary contact

          </button>

        )}

      </div>

      <FormField label="Full name" htmlFor={fieldId} error={error}>

        <TextInput

          id={fieldId}

          placeholder={traveler.isFounder ? 'Your full name' : 'e.g. Daniel Reyes'}

          value={traveler.name}

          invalid={Boolean(error)}

          onChange={(e) => onChangeName(e.target.value)}

        />

      </FormField>

      {!traveler.isFounder && onRemove && (

        <button

          type="button"

          onClick={onRemove}

          className="mt-2 font-sans text-[12px] font-medium leading-[18px] text-[#000000]/70 underline-offset-2 hover:text-[#000000] hover:underline focus-ring"

        >

          Remove traveler

        </button>

      )}

    </div>

  )

}


