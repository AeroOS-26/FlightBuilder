/**
 * What a Group Organizer may see of someone else's pet.
 *
 * Chuck's rule, 2026-10-22 (§34): the Organizer sees the traveller's first
 * name, how many travellers there are, **each pet's type, and weight for dogs
 * only** — no weight for cats or anything else. It applies to the join request
 * and to the joined members list, and counsel added on 10-23 that the other
 * eligibility, contact and readiness detail stays outside that view, in
 * notifications and exports as well as on screen.
 *
 * The rule lives here rather than at each screen because there are three
 * places that show a pet to an organiser — the request rows and the membership
 * list on frame 47, and the request detail on frame 48 — and a rule copied
 * three times is a rule that will be right in two of them.
 *
 * It only became expressible on 2026-10-26. The type was free text on the join
 * screen until then, so "weight for dogs only" could not be decided from the
 * record: a pet typed "lab" is a dog to a reader and not to a comparison. The
 * five-value list is what makes the test below meaningful rather than
 * approximate.
 */

/** The one value the weight rule turns on. `PET_TYPES` holds the five. */
const DOG = 'Dog'

/**
 * Whether this pet's weight may be shown to the Organizer.
 *
 * Exact comparison, deliberately. Everything the screens can produce is one of
 * the five values; anything else is a record from somewhere else, and guessing
 * that "lab" means a dog is the normalisation that was refused when the CDC
 * requirement depended on it. A value we do not recognise therefore shows no
 * weight — the narrower of the two mistakes, and the one Chuck's rule asks for.
 */
export function weightVisibleToOrganiser(type: string | null | undefined): boolean {
  return (type ?? '').trim() === DOG
}

/** The fields this view reads. Narrow on purpose: a stored pet may predate any
 *  of the contract's other fields, and none of them belong here anyway. */
export interface OrganiserVisiblePet {
  name?: string | null
  type?: string | null
  weight_lbs?: number | null
}

/**
 * One flat list of descriptors, dot-separated by the caller.
 *
 * Frame 47 gives every descriptor its own dot — "1 pet · Nube · Cat · 9lbs" —
 * rather than joining each animal into a label, so this returns the pieces and
 * not a sentence.
 *
 * The pet's **name** is kept. It is drawn on the frame and has been on this
 * screen since it shipped, and it is not one of the three things counsel named.
 * Chuck's list does not mention it either way, which is a question for him
 * rather than a licence to drop it — flagged, not decided here.
 */
export function organiserPetBits(pets: readonly OrganiserVisiblePet[]): string[] {
  return pets.flatMap((pet) =>
    [
      pet.name,
      pet.type,
      weightVisibleToOrganiser(pet.type) && pet.weight_lbs ? `${pet.weight_lbs}lbs` : null,
    ].filter((bit): bit is string => Boolean(bit)),
  )
}
