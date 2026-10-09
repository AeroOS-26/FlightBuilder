/**
 * The pieces the approval frames draw the same way, in one place.
 *
 * Both exist because a shared component does not match these frames, and
 * restyling the shared one would change screens the client has already signed
 * off:
 *
 *  - **The footer buttons.** `Button`'s secondary variant carries the
 *    blue-to-coral gradient edge used across the Flight Builder. Frames 43, 44
 *    and 47 specify a plain `#98C3E1` hairline over a 20% light-blue fill —
 *    the same hairline as the eyebrow pill and the form fields on those
 *    screens.
 *  - **The summary row label and its value.** The label is Inter Tight 14/500
 *    uppercase in `#080B2B`; the value is Inter Display 18/500 black. Frames 43
 *    and 44 had the label as 12px black at 50% — a grey, two sizes down — and
 *    43 had the value at 14px in the body face. Read off the frames
 *    (`4031:39235`, `4034:39534`) on 2026-10-08.
 */

/**
 * "Browse shared flights", "Share The Group Link".
 *
 * `min-h-10` rather than `h-10`: frame 46 puts this beside "Start My Own Shared
 * Flight" on one row at phone widths, where the pair is wider than the screen
 * and the longer label has to wrap. A fixed height clipped it. Where the label
 * fits on one line the box is still 40px, so nothing else moves.
 */
export const FOOTER_SECONDARY =
  'inline-flex min-h-10 items-center justify-center rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-3.5 py-2 text-center font-sans text-[14px] font-medium text-[#000000] transition-colors hover:bg-[#CFE3F1]/50 focus-ring'

/** "Go to my dashboard", "Edit Trip Details". */
export const FOOTER_PRIMARY =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] bg-[#000000] px-3.5 py-2 text-center font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 focus-ring'

/** The uppercase label on a summary row, and on the card's own title. */
export const SUMMARY_LABEL =
  'font-sans text-[14px] font-medium uppercase tracking-[0.5px] text-[#080B2B]'

/** The value opposite it: Inter Display 18/500, black. */
export const SUMMARY_VALUE = 'font-heading text-[18px] font-medium text-[#000000]'

/**
 * The row the two footer controls sit in, and the class each one carries.
 *
 * Below `sm` they share the row as equal halves and a long label wraps inside
 * its own box; from `sm` up they are content-sized and centred, as the desktop
 * frames draw them. The mobile frames put the pair side by side too — they only
 * fit there because the frame carries shorter labels than the copy does.
 */
export const FOOTER_ROW =
  'flex w-full flex-nowrap items-stretch justify-center gap-3 sm:w-auto sm:items-center sm:gap-5'
export const FOOTER_ITEM = 'min-w-0 flex-1 basis-0 sm:flex-none sm:basis-auto'

/**
 * Waiting is amber on these frames, not the blue used for information — 43, 44
 * and 47's hero badge all carry it. Node `4038:94372`: `#FFDB43` at 10% behind
 * a full-strength stroke, 10/500 uppercase in `Colors/Yellow/200` (`#66550D`)
 * at 0.5 tracking, 7px radius, padding 9/10.
 */
export const TAG_WAITING =
  'inline-flex shrink-0 items-center rounded-[7px] border border-[#FFDB43] bg-[#FFDB43]/10 px-2.5 py-[9px] font-sans text-[10px] font-medium uppercase leading-none tracking-[0.5px] text-[#66550D]'

/**
 * Something is owed by the person reading — frame 47's "N waiting" counter.
 * Red, and a different red from the decline button. Node `4038:94842`:
 * `Colors/Primary - Melon/Alpha/20` (`#E96A6F` at 20%) behind a
 * `Colors/Primary - Melon/100` stroke (`#F4B5B7`), `#D00416` text, 8px radius,
 * 12/500 uppercase at 0.5 tracking, padding 10/12.
 */
export const TAG_ALERT =
  'inline-flex shrink-0 items-center rounded-[8px] border border-[#F4B5B7] bg-[#E96A6F]/20 px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#D00416]'

/**
 * A neutral informational pill — frame 48's "Not a Service Animal" marker and
 * the eyebrow share it. `#CFE3F1` at 40% behind a `#98C3E1` stroke, 12/500
 * uppercase in `#112D7C`, 8px radius, padding 10/12.
 */
export const TAG_INFO =
  'inline-flex shrink-0 items-center rounded-[8px] border border-[#98C3E1] bg-[#CFE3F1]/40 px-3 py-2.5 font-sans text-[12px] font-medium uppercase leading-none tracking-[0.5px] text-[#112D7C]'

/**
 * Frame 48's two decisions. Solid, not outlined, and each in its own colour —
 * `#D00416` for decline and `#109A51` for approve — because this is the one
 * screen where the organiser commits rather than navigates. Both carry their
 * mark before the label.
 */
const ACTION_BASE =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-[12px] px-3.5 py-2 text-center font-sans text-[14px] font-medium text-white transition-opacity hover:opacity-90 focus-ring disabled:cursor-not-allowed disabled:opacity-40'
export const ACTION_DECLINE = `${ACTION_BASE} bg-[#D00416]`
export const ACTION_APPROVE = `${ACTION_BASE} bg-[#109A51]`

/**
 * A control inside the decline dialog. Frame 48B gives its two buttons the full
 * content width as equal halves at every size, so this is `FOOTER_ITEM` without
 * the `sm` reset back to content width.
 */
export const DIALOG_ITEM = 'min-w-0 flex-1 basis-0'
