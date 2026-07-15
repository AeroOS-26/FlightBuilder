/**
 * Lazy loader for the compact OurAirports dataset.
 *
 * The dataset (public/data/airports.json, ~7MB raw / ~1.4MB gzipped) is served
 * as a static asset and fetched ONCE on first use, then cached in memory. This
 * keeps it out of the JS bundle while supporting global coverage.
 *
 * Regenerate the file with `node scripts/build-airports-dataset.mjs`.
 */

/** Compact airport record as emitted by the build script. */
export interface RawAirport {
  /** ICAO code (or OurAirports ident fallback), e.g. "KOPF". */
  ic: string
  /** IATA code, e.g. "OPF" (may be empty). */
  ia: string
  /** Airport name. */
  nm: string
  /** Type: 'L' large, 'M' medium, 'S' small. */
  ty: 'L' | 'M' | 'S'
  lat: number
  lng: number
  /** Municipality / city served. */
  mun: string
  /** Region (state/province) display name. */
  rg: string
  /** Country display name. */
  co: string
  /** 1 if it has scheduled commercial service, else 0. */
  sch: 0 | 1
}

const DATASET_URL = '/data/airports.json'

let cache: RawAirport[] | null = null
let inflight: Promise<RawAirport[]> | null = null

/** Load the dataset once; subsequent calls resolve from the in-memory cache. */
export async function loadAirports(): Promise<RawAirport[]> {
  if (cache) return cache
  if (inflight) return inflight

  inflight = fetch(DATASET_URL)
    .then((res) => {
      if (!res.ok) throw new Error(`Failed to load airports dataset: ${res.status}`)
      return res.json() as Promise<RawAirport[]>
    })
    .then((data) => {
      cache = data
      inflight = null
      return data
    })
    .catch((err) => {
      inflight = null
      throw err
    })

  return inflight
}
