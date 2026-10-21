/**
 * The regulatory footer: the Part 295 broker disclosure plus the copyright.
 *
 * Every screen that carries the disclosure mounts this component rather than
 * writing the line out, because copies are what drift the first time the wording
 * changes — and the wording is the attorney's, so it does change.
 *
 * Copy is legal text. It is not to be reworded, shortened, or reflowed for
 * layout without the client confirming it with their attorney. This is not the
 * Scheduled Charter footer: those pages are Part 380 and carry a different line.
 */

import { LEGAL_PAGE_LINKS_ENABLED } from '@/config/features'

/**
 * Counsel's wording, settled 2026-10-21. Three sentences, and all three are his.
 *
 * ── Why this is a restoration and not an edit ───────────────────────────────
 *
 * Production has carried the first two sentences since the footer was built.
 * This branch did not: they were dropped during the legal pages work and
 * replaced with a single sentence of our own that named no Part 295 role at
 * all. Counsel ruled on production's wording, so a release from here would have
 * put text in front of users that he has never seen — and dropped the role line
 * in the same move. The first two sentences are therefore put back rather than
 * kept.
 *
 * ── What counsel actually asked for ─────────────────────────────────────────
 *
 * His position has two halves and the second is the one that nearly got lost.
 * Use his operator sentence consistently across the general broker materials —
 * and separately, trip-specific material must still identify Perro Air's
 * particular role. This footer is trip-specific, because it names the charter
 * being arranged, so the role line stays. Charles, 2026-10-21, correcting two
 * earlier instructions of his own.
 *
 * ── What changed and what did not ───────────────────────────────────────────
 *
 * Out, because it promised every operator is FAA certificated and Perro Air
 * will fly foreign carriers to Panama and Costa Rica:
 *
 *   "Flights arranged by Perro Air, LLC and operated by direct air carriers
 *    certified under FAA Part 135, 121 or 129. The operating carrier maintains
 *    full operational control."
 *
 * The third sentence below replaces it. Nothing else changes.
 *
 * Copy is legal text. It is not to be reworded, shortened or reflowed for
 * layout. Three people have now given three different versions of this footer;
 * the next change comes from counsel through Charles, in writing, or not at all.
 */
/**
 * Counsel's two halves, kept apart because they are two separate rulings and
 * because each renders on its own line. Split to match `main`, so the two
 * branches hold the same constants and the release cannot quietly change the
 * footer again.
 */
export const BROKER_DISCLOSURE =
  'Perro Air, LLC is an air charter broker arranging this charter under 14 CFR Part 295. ' +
  'The flight will be operated by a third-party direct air carrier, not by Perro Air, LLC.'

export const OPERATOR_DISCLOSURE =
  'Flights arranged by Perro Air, LLC are operated by properly licensed U.S. or foreign ' +
  'direct air carriers that retain operational control of the aircraft.'

export function BrokerDisclosureFooter() {
  return (
    // Solid black on white with a lifted top edge — the same footer the public
    // share frames and the Flight Group Detail frames both carry. It was
    // previously 12px at 60% opacity, which read as greyed-out legal fine print
    // on every screen that mounted it.
    <footer className="w-full bg-white shadow-[0px_-6px_40px_0px_rgba(17,45,124,0.06)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col items-center gap-[10px] px-4 py-5 text-center font-sans text-[14px] font-medium leading-[1.4] text-[#000000] sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:gap-[60px] sm:text-left lg:px-[50px]">
        {/*
         * Counsel's two halves, one per line, and the break is deliberate.
         *
         * The frame holds all of it in a single text node with **no newline**
         * — 344 characters that happen to run out of room at 1088 right after
         * "…not by Perro Air, LLC." So the two-line reading everyone has taken
         * from the design is an accident of that width and that older, longer
         * wording. Counsel's replacement is 327 characters, and at the width a
         * 1366 window actually gives this column the first line runs on and
         * carries "Flights" with it, splitting the second disclosure across
         * both lines.
         *
         * Each half is its own block instead, so the sentence that starts
         * "Flights arranged by" always starts a line. No gap between them —
         * the frame's two lines are one line-height apart, which the inherited
         * leading already gives.
         *
         * Width, size and the orphan guard are the measured spec: 1088 wide,
         * 14px on BOTH frames (there is no 16px step at desktop, which this
         * file previously claimed), and `text-pretty` to keep the last word of
         * either half off a line of its own.
         */}
        <p className="text-pretty sm:max-w-[1088px]">
          <span className="block">{BROKER_DISCLOSURE}</span>
          <span className="block">{OPERATOR_DISCLOSURE}</span>
        </p>
        <span className="flex shrink-0 items-center justify-center gap-3 font-normal sm:justify-end sm:font-medium">
          {/* The pages carry the client-approved placeholder and say in as many
              words that the text is being finalised, so linking them is honest
              before the notices land. The interest form's *consent* line is a
              different claim and stays behind PRIVACY_NOTICE_ENABLED. */}
          {LEGAL_PAGE_LINKS_ENABLED && (
            <>
              <a href="/privacy" className="underline underline-offset-2 focus-ring">
                Privacy &amp; Cookies
              </a>
              <a href="/terms" className="underline underline-offset-2 focus-ring">
                Terms of Service
              </a>
            </>
          )}
          <span>© PERRO AIR · PERROAIR.COM</span>
        </span>
      </div>
    </footer>
  )
}
