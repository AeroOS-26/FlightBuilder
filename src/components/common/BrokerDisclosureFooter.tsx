/**
 * The regulatory footer, shared by the Flight Builder and the public share page.
 *
 * Charles's attorney requires the Part 295 broker disclosure on any screen where
 * a charter group is created or shared. That is both surfaces, so the disclosure
 * lives in one component and is mounted twice — rather than written out twice,
 * where the two copies would drift the first time a word changed.
 *
 * The builder had no footer at all before this; the share page had the operator
 * line only.
 *
 * Copy is legal text. It is not to be reworded, shortened, or reflowed for
 * layout without the client confirming it with their attorney.
 */

export const BROKER_DISCLOSURE =
  'Perro Air, LLC is an air charter broker arranging this charter under 14 CFR Part 295. ' +
  'The flight will be operated by a third-party direct air carrier, not by Perro Air, LLC.'

export const OPERATOR_DISCLOSURE =
  'Flights arranged by Perro Air, LLC and operated by direct air carriers certified under ' +
  'FAA Part 135, 121 or 129. The operating carrier maintains full operational control.'

export function BrokerDisclosureFooter() {
  return (
    // Solid black on white with a lifted top edge — the same footer the public
    // share frames and the Flight Group Detail frames both carry. It was
    // previously 12px at 60% opacity, which read as greyed-out legal fine print
    // on every screen that mounted it.
    <footer className="w-full bg-white shadow-[0px_-6px_40px_0px_rgba(17,45,124,0.06)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 text-center font-sans text-[14px] font-medium leading-[1.4] text-[#000000] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-[50px] lg:text-left lg:text-[16px]">
        <div className="flex max-w-[940px] flex-col">
          {/* Broker disclosure first — the order the attorney specified. */}
          <span>{BROKER_DISCLOSURE}</span>
          <span>{OPERATOR_DISCLOSURE}</span>
        </div>
        <span className="shrink-0">© PERRO AIR · PERROAIR.COM</span>
      </div>
    </footer>
  )
}
