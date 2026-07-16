'use client'

/**
 * Global state for the Flight Builder.
 *
 * Holds the in-progress draft and exposes granular setters per step. This is
 * what makes "move forward and back without losing entered data" work: the
 * draft lives here, independent of which step component is currently mounted.
 *
 * State is persisted to sessionStorage so a refresh mid-flow is non-destructive
 * within the session, while not leaking a draft across sessions.
 */

import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { MAX_TRAVELERS } from '@/features/flight-builder/config/capacity'
import type {
  DateSelection,
  FlightDraft,
  FlightRecord,
  MemberIdentity,
  Pet,
  RouteSelection,
  Traveler,
} from '@/types'

let idCounter = 0
/** Stable-enough client id for list items (avoids crypto dependency). */
function nextId(prefix: string): string {
  idCounter += 1
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`
}

/** The Founder is always Traveler 1 and is auto-populated from member data. */
function founderTraveler(member: MemberIdentity): Traveler {
  return { id: 'traveler_founder', name: member.name, isFounder: true }
}

function emptyPet(): Pet {
  return { id: nextId('pet'), name: '', type: '', breed: '', weight: '', temperament: '' }
}

const emptyDraft: FlightDraft = {
  route: { from: null, to: null },
  date: { mode: 'specific', start: null, end: null },
  travelers: [],
  primaryContactId: null,
  petsEnabled: false,
  pets: [],
  petReadinessAccepted: false,
  notes: '',
}

interface FlightBuilderState {
  /** The Founder's identity, once known. Drives header + Traveler 1. */
  founder: MemberIdentity | null
  draft: FlightDraft
  /** The created flight record, set on confirm and read by the Share step. */
  createdFlight: FlightRecord | null

  /** Seed the Founder identity and auto-populate them as Traveler 1. */
  initFounder: (member: MemberIdentity) => void

  /** Store the created flight record (set by the create-flight mutation). */
  setCreatedFlight: (flight: FlightRecord) => void

  // --- Route step ---
  setRoute: (route: Partial<RouteSelection>) => void

  // --- Dates step ---
  setDate: (patch: Partial<DateSelection>) => void

  // --- Pets & passengers step ---
  addTraveler: () => void
  updateTraveler: (id: string, name: string) => void
  removeTraveler: (id: string) => void
  setPrimaryContact: (id: string) => void
  setPetsEnabled: (enabled: boolean) => void
  addPet: () => void
  updatePet: (id: string, patch: Partial<Omit<Pet, 'id'>>) => void
  removePet: (id: string) => void
  setPetReadiness: (accepted: boolean) => void

  // --- Notes step ---
  setNotes: (notes: string) => void

  /** Reset the whole flow (e.g. after a flight is created, or Start over). */
  reset: () => void
}

export const useFlightBuilderStore = create<FlightBuilderState>()(
  persist(
    (set) => ({
      founder: null,
      draft: emptyDraft,
      createdFlight: null,

      setCreatedFlight: (flight) => set({ createdFlight: flight }),

      initFounder: (member) =>
        set((state) => {
          const hasFounder = state.draft.travelers.some((t) => t.isFounder)
          const founder = founderTraveler(member)
          return {
            founder: member,
            draft: hasFounder
              ? state.draft
              : {
                  ...state.draft,
                  travelers: [founder, ...state.draft.travelers],
                  primaryContactId: founder.id,
                },
          }
        }),

      setRoute: (route) =>
        set((state) => ({
          draft: { ...state.draft, route: { ...state.draft.route, ...route } },
        })),

      setDate: (patch) =>
        set((state) => ({
          draft: { ...state.draft, date: { ...state.draft.date, ...patch } },
        })),

      addTraveler: () =>
        set((state) => {
          // Never add past the flight's total spaces — the payload's spaces_total
          // is the same number, so this keeps members ≤ spaces (no "52 members in
          // 4 spaces" contradiction).
          if (state.draft.travelers.length >= MAX_TRAVELERS) return state
          return {
            draft: {
              ...state.draft,
              travelers: [
                ...state.draft.travelers,
                { id: nextId('traveler'), name: '', isFounder: false },
              ],
            },
          }
        }),

      updateTraveler: (id, name) =>
        set((state) => ({
          draft: {
            ...state.draft,
            travelers: state.draft.travelers.map((t) =>
              t.id === id ? { ...t, name } : t,
            ),
          },
        })),

      removeTraveler: (id) =>
        set((state) => {
          const travelers = state.draft.travelers.filter(
            (t) => t.id !== id || t.isFounder,
          )
          const founder = travelers.find((t) => t.isFounder)
          const primaryContactId =
            state.draft.primaryContactId === id
              ? (founder?.id ?? null)
              : state.draft.primaryContactId

          return {
            draft: {
              ...state.draft,
              travelers,
              primaryContactId,
            },
          }
        }),

      setPrimaryContact: (id) =>
        set((state) => ({
          draft: { ...state.draft, primaryContactId: id },
        })),

      setPetsEnabled: (enabled) =>
        set((state) => ({
          draft: {
            ...state.draft,
            petsEnabled: enabled,
            // Seed one pet card when turning the toggle on with none present.
            pets: enabled && state.draft.pets.length === 0 ? [emptyPet()] : state.draft.pets,
            // Readiness only applies while pets are on the flight.
            petReadinessAccepted: enabled ? state.draft.petReadinessAccepted : false,
          },
        })),

      addPet: () =>
        set((state) => ({
          draft: { ...state.draft, pets: [...state.draft.pets, emptyPet()] },
        })),

      updatePet: (id, patch) =>
        set((state) => ({
          draft: {
            ...state.draft,
            pets: state.draft.pets.map((p) => (p.id === id ? { ...p, ...patch } : p)),
          },
        })),

      removePet: (id) =>
        set((state) => {
          const pets = state.draft.pets.filter((p) => p.id !== id)
          return {
            draft: {
              ...state.draft,
              pets,
              // If the last pet is removed, the pet section collapses.
              petsEnabled: pets.length === 0 ? false : state.draft.petsEnabled,
              petReadinessAccepted:
                pets.length === 0 ? false : state.draft.petReadinessAccepted,
            },
          }
        }),

      setPetReadiness: (accepted) =>
        set((state) => ({ draft: { ...state.draft, petReadinessAccepted: accepted } })),

      setNotes: (notes) => set((state) => ({ draft: { ...state.draft, notes } })),

      reset: () =>
        set((state) => ({
          createdFlight: null,
          draft: {
            ...emptyDraft,
            travelers: state.founder ? [founderTraveler(state.founder)] : [],
            primaryContactId: state.founder ? 'traveler_founder' : null,
          },
        })),
    }),
    {
      name: 'aeroos.flight-builder.draft',
      storage: createJSONStorage(() => sessionStorage),
      // Persist only the data, not the action functions.
      partialize: (state) => ({
        founder: state.founder,
        draft: state.draft,
        createdFlight: state.createdFlight,
      }),
    },
  ),
)