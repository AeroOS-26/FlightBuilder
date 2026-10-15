/**
 * Extend a control's **hit area** to the 44px minimum without changing how it
 * looks.
 *
 * The client's run of 11 October measured several controls under the minimum
 * (2026-10-12, findings 2 and 23): the request row's three icon buttons at 40
 * square with 10 between them, the acknowledgment's Agree button at 40, and its
 * Cancel link at 21.
 *
 * Forty square *is* the frame — "Three icon buttons per request… Forty square,
 * 12px radius, ten apart" — so growing the painted boxes would reflow those
 * rows and change a design the client has signed off. The box stays as drawn
 * and an invisible `::before` carries the difference instead. At 10px apart
 * that leaves 6px between adjacent hit areas, so neighbouring targets still
 * cannot be confused for one another.
 *
 * Two constraints on use:
 *
 *  - the element needs `relative`, which both constants set themselves;
 *  - the control must not sit inside an `overflow-hidden` parent, or the
 *    pseudo-element is clipped and the extra area is silently lost.
 *
 * This is a hit area, not a focus ring. Keep `focus-ring` on the control as
 * well — the visible box is what a keyboard user sees.
 */

/**
 * For a control already close to the minimum: a 40px box becomes 44px.
 * Used on square icon buttons and on the 40px-high footer buttons.
 */
export const TAP_TARGET = "relative before:absolute before:-inset-0.5 before:content-['']"

/**
 * For a bare text link. A 14px link is roughly 21px tall, so it needs about
 * 12px above and below rather than 2px — enough to clear 44 without moving the
 * text or its underline.
 */
export const TAP_TARGET_LINK =
  "relative before:absolute before:-inset-x-2 before:-inset-y-3 before:content-['']"
