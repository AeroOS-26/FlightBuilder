/**
 * Minimal className combiner: filters out falsy values and joins with a space.
 * Keeps conditional Tailwind classes readable without pulling in a dependency.
 *
 *   cn('btn', isActive && 'btn-active', error ? 'btn-error' : null)
 */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return classes.filter(Boolean).join(' ')
}
