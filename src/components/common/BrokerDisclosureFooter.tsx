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

import { PRIVACY_NOTICE_ENABLED } from '@/config/features'

export const BROKER_DISCLOSURE =
  'Perro Air LLC is an air charter broker, not a direct air carrier, and does not exercise operational control over aircraft. Air transportation is provided by properly licensed third-party direct air carriers.'

export function BrokerDisclosureFooter() {
  return (
    // Solid black on white with a lifted top edge — the same footer the public
    // share frames and the Flight Group Detail frames both carry. It was
    // previously 12px at 60% opacity, which read as greyed-out legal fine print
    // on every screen that mounted it.
    <footer className="w-full bg-white shadow-[0px_-6px_40px_0px_rgba(17,45,124,0.06)]">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-4 px-4 py-5 text-center font-sans text-[14px] font-medium leading-[1.4] text-[#000000] sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-[50px] lg:text-left lg:text-[16px]">
        <p className="max-w-[940px]">{BROKER_DISCLOSURE}</p>
        <span className="flex shrink-0 items-center justify-center gap-3 lg:justify-end">
          {/* Hidden until the notice is written — see PRIVACY_NOTICE_ENABLED. */}
          {PRIVACY_NOTICE_ENABLED && (
            <a href="/privacy" className="underline underline-offset-2 focus-ring">
              Privacy &amp; Cookies
            </a>
          )}
          <span>© PERRO AIR · PERROAIR.COM</span>
        </span>
      </div>
    </footer>
  )
}
