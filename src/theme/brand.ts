/**
 * Brand selection — the single toggle that drives theming.
 *
 * Calling `applyBrand('jetlegs')` swaps the `data-brand` attribute on <html>,
 * which re-points every semantic CSS variable in tokens.css. No component
 * code changes. The active brand defaults from the env config.
 *
 * The root layout sets `data-brand` server-side for first paint; `applyBrand`
 * is the client-side seam for re-asserting or switching at runtime.
 */

import { env } from '@/config/env'

export const BRANDS = ['perro-air', 'jetlegs'] as const
export type Brand = (typeof BRANDS)[number]

function isBrand(value: string): value is Brand {
  return (BRANDS as readonly string[]).includes(value)
}

/** The brand to use at startup, from env (falls back to perro-air). */
export const defaultBrand: Brand = isBrand(env.brand) ? env.brand : 'perro-air'

/** Set the active brand by writing the `data-brand` attribute on the root. */
export function applyBrand(brand: Brand): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-brand', brand)
}
