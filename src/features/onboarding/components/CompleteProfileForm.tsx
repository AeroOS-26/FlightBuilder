'use client'

/**
 * Complete your profile — frame 31.
 *
 * Four sections: travelers, pets, the travel-readiness agreement, and
 * notification preferences. The first three are the Flight Builder's Pets step
 * in a different wrapper, so `TravelerCard`, `PetCard` and `petOptions` are
 * reused directly rather than rebuilt — same fields, same validation surface,
 * and a pet saved here is the same shape a flight later sends.
 *
 * Section chrome from the frame:
 *   travelers / pets   rgba(255,255,255,0.6) on rgba(168,168,168,0.2), radius 20
 *   readiness / loop   rgba(207,227,241,0.2) on #112D7C, radius 16
 *   add buttons        rgba(207,227,241,0.2) on #112D7C, radius 16, 44 tall
 *
 * The save goes to POST /api/profile and stops there. That is deliberate, not a
 * missing integration: the client has confirmed travelers and pets stay in the
 * application, and only become Zoho records when they are on a flight, carried
 * by the per-member `pets` array the payload contract already has.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Checkbox, ErrorBanner, FieldError, Form, Toggle } from '@/components/ui'
import { Icon } from '@/components/common'
import { TravelerCard } from '@/features/flight-builder/steps/pets/TravelerCard'
import { PetCard } from '@/features/flight-builder/steps/pets/PetCard'
import { MAX_TRAVELERS } from '@/features/flight-builder/config/capacity'
import { AUTH_ROUTES } from '@/features/auth/server/routing'
import {
  validateTravelersAndPets,
  hasPetsErrors,
  type PetsErrors,
} from '@/features/flight-builder/validation'
import type { Pet, Traveler } from '@/types'

let seq = 0
const nextId = (p: string) => `${p}_${(seq += 1)}`

const emptyPet = (): Pet => ({
  id: nextId('pet'),
  name: '',
  type: '',
  breed: '',
  weight: '',
  temperament: '',
})

/** The three toggles under "Stay in the loop", verbatim from the frame. */
const PREFERENCES = [
  {
    id: 'email',
    title: 'Email me about flight updates and member activity',
    detail: 'Quote requests, confirmations, group changes, and weather advisories.',
  },
  {
    id: 'sms',
    title: "Text me when a flight I've joined gets quoted or confirmed",
    detail: 'Time-sensitive updates only. No marketing texts.',
  },
  {
    id: 'routes',
    title: 'Notify me when new shared flights form on routes I might want to fly',
    detail: "We'll suggest routes based on the flights you've joined or browsed.",
  },
] as const

function SectionCard({
  children,
  tone = 'plain',
}: {
  children: React.ReactNode
  tone?: 'plain' | 'accent'
}) {
  return (
    <section
      className={
        tone === 'accent'
          ? 'rounded-[16px] border border-[#112D7C] bg-[#CFE3F1]/20 p-4'
          : 'rounded-[20px] border border-[#A8A8A8]/20 bg-white/60 p-4'
      }
    >
      {children}
    </section>
  )
}

function AddMoreButton({ children, onClick }: { children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-11 w-full items-center justify-center gap-[10px] rounded-[16px] border border-[#112D7C] bg-[#CFE3F1]/20 px-4 font-sans text-[14px] font-medium leading-4 text-[#112D7C] transition-colors hover:bg-[#CFE3F1]/40"
    >
      {children}
    </button>
  )
}

export function CompleteProfileForm({ memberName = '' }: { memberName?: string }) {
  const [travelers, setTravelers] = useState<Traveler[]>([
    { id: 'traveler_self', name: memberName, isFounder: true },
  ])
  const [petsEnabled, setPetsEnabled] = useState(true)
  const [pets, setPets] = useState<Pet[]>([emptyPet()])
  const [readiness, setReadiness] = useState(false)
  const [prefs, setPrefs] = useState<Record<string, boolean>>({
    email: true,
    sms: true,
    routes: false,
  })
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Same rules as the Flight Builder's Pets step, from the same function — the
   * cards below are literally that step's components, so a name that is required
   * there cannot be optional here. Errors appear only after a submit attempt,
   * matching every other form in the app, and clear as the field is edited.
   */
  const [errors, setErrors] = useState<PetsErrors>({ travelers: {}, pets: {} })
  const [submitted, setSubmitted] = useState(false)

  /** Re-run the rules while the user fixes things, but only once they've tried. */
  function revalidate(next: {
    travelers?: Traveler[]
    pets?: Pet[]
    petsEnabled?: boolean
    readiness?: boolean
  }) {
    if (!submitted) return
    setErrors(
      validateTravelersAndPets({
        travelers: next.travelers ?? travelers,
        pets: next.pets ?? pets,
        petsEnabled: next.petsEnabled ?? petsEnabled,
        readinessAccepted: next.readiness ?? readiness,
      }),
    )
  }

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return
    setError(null)

    setSubmitted(true)
    const found = validateTravelersAndPets({
      travelers,
      pets,
      petsEnabled,
      readinessAccepted: readiness,
    })
    setErrors(found)
    if (hasPetsErrors(found)) return

    setPending(true)
    try {
      const res = await fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          travelers,
          pets,
          petsEnabled,
          travelReadinessAccepted: readiness,
          notifyEmail: prefs.email,
          notifySms: prefs.sms,
          notifyRoutes: prefs.routes,
        }),
      })
      if (res.status === 401) {
        // The session expired mid-form; send them back rather than losing it silently.
        window.location.href = '/signin?callbackUrl=/complete-profile'
        return
      }
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { message?: string } | null
        setError(body?.message ?? 'We couldn’t save your details. Please try again.')
        return
      }
      // Step 3 on the frame's stepper is "Join Flight", so a completed profile
      // hands over to the flight surfaces. This used to return to /welcome —
      // the screen most members arrive from — which made completing the form
      // indistinguishable from "Skip for now" just below it.
      //
      // A full navigation, not a router push: the profile just changed and the
      // server components downstream read it.
      window.location.href = AUTH_ROUTES.home
    } catch {
      setError('Network error. Check your connection and try again.')
    } finally {
      setPending(false)
    }
  }

  return (
    <Form onSubmit={handleSubmit} className="flex w-full flex-col gap-[30px]">
      {/* ------------------------------------------------------- Travelers */}
      <SectionCard>
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-2">
            <h2 className="font-heading text-[20px] font-medium leading-[1.2] text-black">
              Travelers
            </h2>
            <p className="font-sans text-[14px] font-medium leading-[1.4] text-black">
              Who flies with you? Add yourself and anyone who&apos;ll be joining flights with you
              regularly.
            </p>
          </div>

          <div className="flex flex-col gap-3">
            {travelers.map((t, i) => (
              <TravelerCard
                key={t.id}
                traveler={t}
                index={i}
                error={errors.travelers[t.id]}
                // No group exists during onboarding, so the builder's
                // "· Group Organizer" role is suppressed — frame 31 reads
                // "Traveler 1 (You)" with a plain "primary" pill.
                showRole={false}
                onChangeName={(name) => {
                  const next = travelers.map((x) => (x.id === t.id ? { ...x, name } : x))
                  setTravelers(next)
                  revalidate({ travelers: next })
                }}
                onRemove={
                  i === 0
                    ? undefined
                    : () => {
                        const next = travelers.filter((x) => x.id !== t.id)
                        setTravelers(next)
                        revalidate({ travelers: next })
                      }
                }
              />
            ))}
            {travelers.length < MAX_TRAVELERS && (
              <AddMoreButton
                onClick={() =>
                  setTravelers((prev) => [
                    ...prev,
                    { id: nextId('traveler'), name: '', isFounder: false },
                  ])
                }
              >
                ＋ Add another traveler
              </AddMoreButton>
            )}
            {/* A new empty row must not be marked invalid before it is submitted,
                so the banner is the only signal until the next attempt. */}
            <p className="font-sans text-[14px] font-medium leading-[1.4] text-black">
              You can always add or edit travelers later.
            </p>
          </div>
        </div>
      </SectionCard>

      {/* ------------------------------------------------------------ Pets */}
      <SectionCard>
        <div className="flex flex-col gap-6">
          <div className="flex items-start justify-between gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <h2 className="font-heading text-[20px] font-medium leading-[1.2] text-black">
                  Bringing pets?
                </h2>
                <Icon name="info" size={18} className="text-black/40" />
              </div>
              <p className="font-sans text-[14px] font-medium leading-[1.4] text-black">
                Tell us about the pets you fly with. Operators need these details before approving
                boarding.
              </p>
            </div>
            <Toggle
              checked={petsEnabled}
              onChange={(v) => {
                setPetsEnabled(v)
                revalidate({ petsEnabled: v })
              }}
              label="Bringing pets"
            />
          </div>

          {petsEnabled && (
            <div className="flex flex-col gap-3">
              {pets.map((p, i) => (
                <PetCard
                  key={p.id}
                  pet={p}
                  index={i}
                  errors={errors.pets[p.id]}
                  onChange={(patch) => {
                    const next = pets.map((x) => (x.id === p.id ? { ...x, ...patch } : x))
                    setPets(next)
                    revalidate({ pets: next })
                  }}
                  onRemove={() => {
                    const next = pets.filter((x) => x.id !== p.id)
                    setPets(next)
                    revalidate({ pets: next })
                  }}
                />
              ))}
              <AddMoreButton onClick={() => setPets((prev) => [...prev, emptyPet()])}>
                ＋ Add another pet
              </AddMoreButton>
            </div>
          )}
        </div>
      </SectionCard>

      {/* ------------------------------------------------- Travel readiness */}
      <SectionCard tone="accent">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-[20px] font-medium leading-[1.2] text-black">
              Travel readiness
            </h2>
            <p className="font-sans text-[14px] font-normal leading-[1.4] text-black">
              I confirm any pet I bring on a Perro Air flight is travel-ready, will not disrupt
              other passengers or crew, and I accept responsibility for their behavior. I
              understand operators reserve the right to refuse boarding for pets that appear unfit
              for travel.
            </p>
          </div>
          <div className="flex flex-col">
            <Checkbox
              checked={readiness}
              onChange={(v) => {
                setReadiness(v)
                revalidate({ readiness: v })
              }}
              invalid={Boolean(errors.readiness)}
              className="gap-3"
            >
              <span className="font-sans text-[14px] leading-[1.4] text-black">
                <span className="font-medium">I agree — </span>
                <span className="font-normal">I have read and accept the above.</span>
              </span>
            </Checkbox>
            {errors.readiness && (
              <FieldError id="profile-readiness-error" className="mt-[8.5px] items-start">
                {errors.readiness}
              </FieldError>
            )}
          </div>
        </div>
      </SectionCard>

      {/* -------------------------------------------------- Stay in the loop */}
      <SectionCard tone="accent">
        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-4">
            <h2 className="font-heading text-[20px] font-medium leading-[1.2] text-black">
              Stay in the loop
            </h2>
            <p className="font-sans text-[14px] font-normal leading-[1.4] text-black">
              Tell us how to reach you about your flights and any new ones forming on your routes.
            </p>
          </div>
          <div className="flex flex-col gap-5">
            {PREFERENCES.map((p) => (
              <Checkbox
                key={p.id}
                checked={prefs[p.id] ?? false}
                onChange={(v) => setPrefs((prev) => ({ ...prev, [p.id]: v }))}
                className="!items-start gap-3"
              >
                <span className="flex flex-col gap-1">
                  <span className="font-sans text-[16px] font-medium leading-[1.2] text-black">
                    {p.title}
                  </span>
                  <span className="font-sans text-[14px] font-medium leading-[1.4] text-black/70">
                    {p.detail}
                  </span>
                </span>
              </Checkbox>
            ))}
          </div>
        </div>
      </SectionCard>

      {/* --------------------------------------------------------- Actions */}
      <div className="flex flex-col items-center gap-5">
        {/* Field problems first — they are actionable. The server message below
            is for a save that failed for a reason the person cannot fix here. */}
        {errors.banner && <ErrorBanner className="w-full">{errors.banner}</ErrorBanner>}
        {error && (
          <p className="w-full rounded-[12px] border border-danger-text/40 bg-error-input-bg px-3 py-2.5 text-center font-sans text-[12px] font-medium text-danger-text">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pending}
          className="flex h-10 items-center justify-center gap-2 rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-4 text-white transition-colors hover:bg-[#101114] disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save and Continue'}
          <Icon name="arrow-right" size={18} />
        </button>
        <p className="flex flex-wrap items-center justify-center gap-1 text-center font-sans text-[14px] leading-4">
          <span className="font-normal text-black">
            You can complete this in your dashboard later.
          </span>
          <a href="/welcome" className="font-medium text-black underline underline-offset-2">
            Skip for now
          </a>
        </p>
      </div>
    </Form>
  )
}
