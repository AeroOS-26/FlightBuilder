'use client'

/**
 * Notes step.
 *
 * A single optional free-text field with a character counter. Fully skippable —
 * advancing with no input is valid; only the length cap is enforced.
 */

import { StepShell } from './StepShell'
import { FormField, Textarea } from '@/components/ui'
import { SectionHeading, SidePanel, TripSummaryPanel } from '@/features/flight-builder/components'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import { NOTES_MAX_LENGTH, validateNotes } from '@/features/flight-builder/validation'

export function NotesStep() {
  const notes = useFlightBuilderStore((s) => s.draft.notes)
  const setNotes = useFlightBuilderStore((s) => s.setNotes)
  const error = validateNotes(notes).notes

  return (
    <StepShell
      continueDisabled={Boolean(error)}
      bodyClassName="gap-6 p-4"
      stackClassName="max-lg:gap-[18px]"
      asideClassName="max-lg:gap-2"
      aside={
        <>
          <TripSummaryPanel />
          <SidePanel title="Why we ask">
            <p className="font-sans text-[12px] font-medium leading-[18px] text-[#000000]/70 lg:text-[14px] lg:font-normal lg:leading-5 lg:text-[#000000]">
              Notes are optional but useful. They reach the operator alongside the booking
              details once the group fills. Examples: morning flights only, no other dogs in
              cabin, oversized luggage.
            </p>
          </SidePanel>
        </>
      }
    >
      <SectionHeading
        title="Notes"
        description="Optional. Mention anything that might affect routing, scheduling, or pets. Examples: morning departure preferred, allergies in the group, large luggage."
      />

      <FormField label="Notes for the operator" htmlFor="notes" className="mt-5">
        <Textarea
          id="notes"
          rows={6}
          maxCount={NOTES_MAX_LENGTH}
          error={error}
          placeholder="Add any notes for the operator... (optional)"
          value={notes}
          invalid={Boolean(error)}
          onChange={(e) => setNotes(e.target.value)}
        />
      </FormField>
    </StepShell>
  )
}