/**
 * Text folding for search comparisons.
 *
 * The airport dataset spells places as they are actually spelled — "São
 * Paulo", "Málaga", "Reykjavík", "Zürich" — and people type them without the
 * marks. Comparing raw strings meant "Sao Paulo" returned nothing at all, on a
 * field whose own copy promises "any location worldwide".
 *
 * Folding is one-way and used for matching only. Nothing shown to a person is
 * folded: results keep their proper spelling.
 */

/** True when every character is plain ASCII, so folding cannot change it. */
function isAscii(value: string): boolean {
  for (let i = 0; i < value.length; i += 1) {
    if (value.charCodeAt(i) > 127) return false
  }
  return true
}

/**
 * Lower-case, and strip diacritics when there are any.
 *
 * The ASCII short-circuit matters: this runs against ~33,000 airports on every
 * keystroke, and only about 4,600 of them carry a mark. Normalising the rest
 * would be work that could not change the answer.
 */
export function fold(value: string): string {
  const lower = value.toLowerCase()
  if (isAscii(lower)) return lower
  return lower.normalize('NFD').replace(/\p{Diacritic}/gu, '')
}
