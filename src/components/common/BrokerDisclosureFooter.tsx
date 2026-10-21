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

/**
 * Counsel's replacement, settled 2026-10-21.
 *
 * The sentence it replaces promised that every operator is certificated under
 * FAA Part 135, 121 or 129. Perro Air will fly foreign carriers to Panama and
 * Costa Rica, so the promise was wrong on a live page and counsel asked for it
 * removed:
 *
 *   "Flights arranged by Perro Air, LLC and operated by direct air carriers
 *    certified under FAA Part 135, 121 or 129. The operating carrier maintains
 *    full operational control."
 *
 * `BROKER_DISCLOSURE` above is deliberately untouched. Counsel's position has
 * two halves: use this operator sentence consistently across the general broker
 * materials, and separately, trip-specific material must still identify Perro
 * Air's particular role. This footer names the charter being arranged, so it is
 * trip-specific and the role line stays.
 *
 * Copy is legal text. It is not to be reworded, shortened or reflowed.
 */
const OPERATOR_DISCLOSURE =
  'Flights arranged by Perro Air, LLC are operated by properly licensed U.S. or foreign ' +
  'direct air carriers that retain operational control of the aircraft.'

export function BrokerDisclosureFooter() {
  return (
    /*
     * Measured off "Footer - web" on frame 4835:50402, and "Footer - mobile"
     * on 4881:43415, rather than read off a screen capture.
     *
     *   container   #FFFFFF, no border, drop shadow #112D7C at 6% alpha,
     *               offset 0/-6, blur 40
     *   padding     50 left and right, 20 top and bottom
     *   row         horizontal, 60 between the disclosure and the copyright,
     *               both vertically centred
     *   disclosure  1088 wide, 14px / 500 / 19.6 line height, LEFT on desktop
     *               and CENTER on mobile, #000000 at FULL opacity
     *   copyright   14px / 19.6, right of the row, and upper case in the
     *               characters themselves rather than by text-transform
     *
     * What this replaces: 12px at 60% opacity with a 1px top border, which is
     * the pre-release treatment and is what the client photographed. The size
     * is 14px on BOTH frames — there is no 16px step at desktop.
     */
    <footer className="w-full bg-white shadow-[0px_-6px_40px_0px_rgba(17,45,124,0.06)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-[10px] px-4 py-5 text-center font-sans text-[14px] font-medium leading-[1.4] text-[#000000] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:gap-[60px] sm:text-left lg:px-[50px]">
        {/*
         * Counsel's two halves, one per line, and the break is deliberate.
         *
         * The frame holds all of it in a single text node with **no newline**
         * — 344 characters that happen to run out of room at 1088 right after
         * "…not by Perro Air, LLC." So the two-line reading everyone has taken
         * from the design is an accident of that width and that older, longer
         * wording. Reproduce it by letting the browser wrap and it survives
         * only until the viewport is a little narrower or the text a little
         * shorter: counsel's replacement is 327 characters, and at the width a
         * 1366 window actually gives this column the first line ran on and
         * carried "Flights" with it.
         *
         * Each half is its own block instead, so the sentence that starts
         * "Flights arranged by" always starts a line. No gap between them —
         * the frame's two lines are one line-height apart, which is what the
         * inherited leading already gives.
         *
         * `text-pretty` is inherited by both and keeps the last word of either
         * half off a line of its own, which is the "LLC." orphan the client
         * photographed on the live site.
         *
         * The strings are untouched. No non-breaking spaces and no joining
         * character, so each half stays byte-identical to counsel's wording.
         */}
        <p className="text-pretty sm:max-w-[1088px]">
          <span className="block">{BROKER_DISCLOSURE}</span>
          <span className="block">{OPERATOR_DISCLOSURE}</span>
        </p>
        {/* Upper case as drawn. Weight is 400 on the mobile frame and 500 on
            the desktop one; matched rather than averaged. */}
        <span className="shrink-0 font-normal sm:font-medium">© PERRO AIR · PERROAIR.COM</span>
      </div>
    </footer>
  )
}
