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

const BROKER_DISCLOSURE =
  'Perro Air, LLC is an air charter broker arranging this charter under 14 CFR Part 295. ' +
  'The flight will be operated by a third-party direct air carrier, not by Perro Air, LLC.'

const OPERATOR_DISCLOSURE =
  'Flights arranged by Perro Air, LLC and operated by direct air carriers certified under ' +
  'FAA Part 135, 121 or 129. The operating carrier maintains full operational control.'

export function BrokerDisclosureFooter() {
  return (
    <footer className="border-t border-[#F2F2F2] bg-white">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-2 px-4 py-4 text-center text-[12px] text-[#000000]/60 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:text-left lg:px-[50px]">
        <div className="flex max-w-[820px] flex-col gap-1">
          {/* Broker disclosure first — the order the attorney specified. */}
          <span>{BROKER_DISCLOSURE}</span>
          <span>{OPERATOR_DISCLOSURE}</span>
        </div>{' '}
        <span className="shrink-0">© Perro Air · perroair.com</span>
      </div>
    </footer>
  )
}
