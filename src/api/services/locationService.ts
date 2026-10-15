/**
 * Location service — autocomplete search for the Route step.
 *
 * Resolves the typed query to candidate metros using a radius search over the
 * global OurAirports dataset, prioritising executive / general-aviation fields
 * with the big commercial field as the "lock to a specific airport" opt-out.
 * A curated override table pins specific executive fields for served metros
 * (US + Central America). See:
 *   - features/flight-builder/data/airportsDataset.ts   (lazy dataset loader)
 *   - features/flight-builder/data/radiusSearch.ts      (the engine)
 *   - features/flight-builder/config/routeConfig.ts     (radius, code format)
 *   - features/flight-builder/config/executiveOverrides.ts (curated seed)
 *
 * The UI depends only on the `CityOption[]` contract, which is unchanged.
 */

import type { CityOption } from '@/types'
import { loadAirports } from '@/features/flight-builder/data/airportsDataset'
import { searchCities } from '@/features/flight-builder/data/radiusSearch'

/**
 * Start loading the dataset before anyone types.
 *
 * The dataset is ~1.4MB gzipped and was fetched on the **first keystroke**, so
 * a first-time visitor typed a city and watched an empty dropdown until it
 * arrived — then saw suggestions after a reload, served from the browser cache.
 * That is the client's finding 1 of 2026-10-12, and it was invisible to any
 * test that paused before typing.
 *
 * Called when the Route step's fields mount. `loadAirports` holds one in-flight
 * promise and caches the result, so both fields calling this is one request,
 * and a keystroke that lands mid-flight waits on the same promise rather than
 * starting a second.
 *
 * Failure is swallowed deliberately: this is a head start, not a dependency.
 * A rejected preload leaves the cache empty and the next `searchLocations`
 * retries, which is what used to happen on every first search anyway.
 */
export function warmLocations(): void {
  void loadAirports().catch(() => {})
}

/**
 * Search metros/airports by free-text query.
 *
 * Loads the dataset once (cached), then runs the radius engine. Returns an
 * empty list for empty queries or on a data-load failure, so the UI shows its
 * no-match / keep-typing states rather than erroring.
 */
export async function searchLocations(query: string): Promise<CityOption[]> {
  const q = query.trim()
  if (q.length === 0) return []

  try {
    const airports = await loadAirports()
    return searchCities(q, airports)
  } catch {
    return []
  }
}
