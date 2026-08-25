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

  error?: string

  onChangeName: (name: string) => void

  onRemove?: () => void

  /**
   * Show the "· Group Organizer" role and the "primary contact" pill.
   * True in the Flight Builder, where a group exists. Frame 31 (onboarding)
   * runs before any group is created, so it reads plain "Traveler 1 (You)"
   * with a "primary" pill — pass false there.
   */
  showRole?: boolean

}



export function TravelerCard({

  traveler,

  index,

  error,

  onChangeName,

  onRemove,

  showRole = true,

}: TravelerCardProps) {

  const fieldId = `traveler-${traveler.id}`

  return (

    <div className="rounded-[12px] border border-[#A8A8A8]/20 bg-white p-4 lg:rounded-2xl lg:p-5">

      <div className="mb-3 flex items-center justify-between gap-3">

        <h4 className="font-heading text-[16px] font-medium leading-[19px] text-[#000000]">

          {traveler.isFounder && showRole
            ? 'Traveler 1 · Group Organizer'
            : `Traveler ${index + 1}`}
          {traveler.isFounder && <span className="text-[#000000]/70"> (You)</span>}

        </h4>

        {/* Founder: primary-contact label. Additional travelers: Remove button
            in the same top-right slot, per the Figma. */}
        {traveler.isFounder ? (

          <span className={cn(travelerBadgeClass, 'text-[#112D7C]')}>
            {showRole ? 'primary contact' : 'primary'}
          </span>

        ) : (
          onRemove && (
            <button

              type="button"

              onClick={onRemove}

              aria-label={`Remove Traveler ${index + 1}`}

              className={cn(

                travelerBadgeClass,

                'text-[#000000] transition-opacity hover:opacity-90 focus-ring',

              )}

            >

              Remove Traveler

            </button>
          )
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

    </div>

  )

}


