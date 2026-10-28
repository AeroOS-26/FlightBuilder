/**
 * What a Group Organizer may see of someone else's request.
 *
 * Two halves of one rule: the first name they are shown instead of the full
 * one, and what of a pet they are shown. The file is named for the pet half
 * because that is what it held first.
 *
 * Chuck's rule, 2026-10-22 (§34), and a **closed list**: the Organizer sees
 * the traveller's first name, how many travellers there are, **each pet's
 * type, and weight for dogs only** — no weight for cats or anything else, and
 * nothing that is not on the list. The word in the build instructions is
 * *only*, which Murtaza confirmed on 2026-10-27 when he corrected his own
 * earlier answer: the pet's **name** is not on it and never has been. It applies to the join request
 * and to the joined members list, and counsel added on 10-23 that the other
 * eligibility, contact and readiness detail stays outside that view, in
 * notifications and exports as well as on screen.
 *
 * The rule lives here rather than at each surface because there are three
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

/**
 * Someone else's first name — every surface that shows one person to another.
 *
 * Chuck, 2026-10-24: the Organizer's email shows the **first name only**, "to
 * match the screens". The screens did not, which was put back to him, and on
 * 2026-10-27 he answered through Murtaza: move them too, and "joined members
 * list, please show first names only there too". So this is no longer one
 * field on one email — it is the request rows, the request detail and the
 * roster. Inside the hour already approved for the organiser view.
 *
 * **The roster narrows for every viewer, not only the organiser.** It is one
 * component seen by joiners as well, the sentence names the list rather than a
 * role, and a joiner reading another joiner's full name is the same disclosure
 * the rule exists to stop. The three emails that go to a requester about their
 * own request keep the full name: that is a person's own name, not someone
 * else's.
 *
 * The first whitespace-separated word, which is what our forms produce: the
 * join screen collects a single "Full name" box and an account carries one
 * name. A compound given name written "Mary-Jane" survives; one written
 * "Mary Jane" does not, and nothing readable from a name field can tell those
 * two apart. A blank returns null rather than an invented word — the caller
 * already has a fallback for a requester with no name at all.
 */
export function firstNameOnly(name: string | null | undefined): string | null {
  return (name ?? '').trim().split(/\s+/)[0] || null
}

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
  type?: string | null
  weight_lbs?: number | null
}

/**
 * One flat list of descriptors, dot-separated by the caller.
 *
 * Frame 47 gives every descriptor its own dot — "1 pet · Cat · 9lbs" — rather
 * than joining each animal into a label, so this returns the pieces and not a
 * sentence.
 *
 * **The pet's name is out**, 2026-10-27. It had been kept on the reading that
 * Chuck's list did not mention it either way; Murtaza corrected that, and the
 * list is closed rather than silent — "the word in them is only", unchanged
 * since rev. 5. So this is not Chuck changing his mind and it is a deletion,
 * which is the cheap direction.
 *
 * **The frames still draw it.** Frame 47 shows "Nube" and frame 48 the same
 * name, so Faraz's frames and the build instructions now disagree on this one
 * descriptor. The instructions win here, and the frames are Faraz's to settle.
 *
 * A pet with no type contributes nothing rather than a placeholder. Type has
 * been required on the join screen since the request surface was validated, so
 * this is a stored-row case only, and showing less than the list allows is the
 * safe direction to fail in.
 */
export function organiserPetBits(pets: readonly OrganiserVisiblePet[]): string[] {
  return pets.flatMap((pet) =>
    [
      pet.type,
      weightVisibleToOrganiser(pet.type) && pet.weight_lbs ? `${pet.weight_lbs}lbs` : null,
    ].filter((bit): bit is string => Boolean(bit)),
  )
}

/**
 * One pet as frame 48 writes it — "Cat", or "Dog, 68 lbs".
 *
 * The same closed list as `organiserPetBits`, in the detail screen's own
 * format: a comma-separated line with a space before `lbs`, where the rows use
 * dots and `9lbs`. Both are as drawn, which is why there are two functions and
 * not one with a flag.
 *
 * It lives here rather than inline at the page because the page had the list
 * written out a second time, and the pet name coming out on 2026-10-27 had to
 * be applied in both — the exact duplication this module's header warns about.
 */
export function organiserPetLine(pet: OrganiserVisiblePet): string {
  return [
    pet.type,
    weightVisibleToOrganiser(pet.type) && pet.weight_lbs ? `${pet.weight_lbs} lbs` : null,
  ]
    .filter(Boolean)
    .join(', ')
}
