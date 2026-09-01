/**
 * Radius-search engine for the Route step.
 *
 * Given a typed query, this resolves matching metros from the OurAirports
 * dataset and, for each, finds the nearby fields within a radius. The default
 * presentation prioritises executive / general-aviation fields; the big
 * scheduled-service commercial airport is offered only as the "lock to a
 * specific airport" opt-out. A curated override table can pin specific
 * executive fields for served metros.
 *
 * Output is the existing `CityOption[]` shape, so the Route picker UI is
 * unchanged — only the data source moved from a hardcoded list to this engine.
 */

import type { AirportOption, CityOption } from '@/types'
import {
  MAX_AIRPORTS_PER_CITY,
  MAX_CITY_RESULTS,
  PAYLOAD_CODE_FORMAT,
  RADIUS_KM,
} from '@/features/flight-builder/config/routeConfig'
import { findOverride, containsWord } from '@/features/flight-builder/config/executiveOverrides'
import type { RawAirport } from './airportsDataset'
import { fold } from '@/utils/text'

const EARTH_RADIUS_KM = 6371

function toRad(deg: number): number {
  return (deg * Math.PI) / 180
}

/** Great-circle distance between two lat/lng points, in km. */
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const dLat = toRad(bLat - aLat)
  const dLng = toRad(bLng - aLng)
  const lat1 = toRad(aLat)
  const lat2 = toRad(bLat)
  const h =
    Math.sin(dLat / 2) ** 2 + Math.sin(dLng / 2) ** 2 * Math.cos(lat1) * Math.cos(lat2)
  return 2 * EARTH_RADIUS_KM * Math.asin(Math.sqrt(h))
}

/**
 * An airport is "Commercial" (the opt-out) when it's a large field with
 * scheduled service; everything else is treated as executive / general
 * aviation — the default routing target.
 */
function classify(a: RawAirport): AirportOption['category'] {
  return a.ty === 'L' && a.sch === 1 ? 'Commercial' : 'Executive'
}

/**
 * Payload code: ICAO by default (the backend keys on ICAO), falling back to
 * IATA only if a field somehow lacks ICAO. Controlled by PAYLOAD_CODE_FORMAT.
 */
function payloadCode(a: RawAirport): string {
  if (PAYLOAD_CODE_FORMAT === 'iata') return a.ia || a.ic
  return a.ic || a.ia
}

/**
 * Display code: IATA when present (reads more naturally on screen), falling
 * back to ICAO so we never show a blank. Display only — not sent to the backend.
 */
function displayCode(a: RawAirport): string {
  return a.ia || a.ic
}

function toAirportOption(a: RawAirport): AirportOption {
  return {
    code: payloadCode(a),
    displayCode: displayCode(a),
    name: a.nm,
    category: classify(a),
    city: a.mun,
    region: a.rg,
    country: a.co,
  }
}



/**
 * Pick the "anchor" airports a query matches on — these define the candidate
 * metros. We match on municipality first (the metro name), then airport name
 * or code, so "san francisco" anchors on SFO's municipality and "teb" on the
 * Teterboro field.
 */
function findAnchors(query: string, airports: RawAirport[]): RawAirport[] {
  const raw = fold(query.trim())
  if (raw.length < 2) return []

  /**
   * People type "Fort Lauderdale, Florida", and no municipality in the dataset
   * is spelled that way — `mun` is just "Fort Lauderdale". Matching the whole
   * string found nothing, so being *more* specific returned fewer results than
   * being vague, which is the opposite of what anyone expects.
   *
   * The part before the first comma is the place; anything after it is the
   * region or country the person added to disambiguate. We match on the first
   * and use the rest to rank, so the extra detail helps instead of hurting.
   */
  const [placePart, ...restParts] = raw.split(',').map((s) => s.trim())
  const q = placePart || raw
  const qualifiers = restParts.filter(Boolean)

  /** True when the typed region/country agrees with this airport's. */
  const matchesQualifier = (a: RawAirport) =>
    qualifiers.length > 0 &&
    qualifiers.every((part) => {
      const rg = fold(a.rg)
      const co = fold(a.co)
      return rg.startsWith(part) || co.startsWith(part) || part === rg || part === co
    })

  const byMunicipality: RawAirport[] = []
  const byOther: RawAirport[] = []

  for (const a of airports) {
    const mun = fold(a.mun)
    if (mun && (mun === q || mun.startsWith(q) || mun.includes(q))) {
      byMunicipality.push(a)
      continue
    }
    if (
      fold(a.nm).includes(q) ||
      a.ic.toLowerCase() === q ||
      a.ia.toLowerCase() === q
    ) {
      byOther.push(a)
    }
  }

  // Rank anchors so the intended metro wins:
  //  - a curated-override metro outranks coincidental substring matches
  //    (e.g. "panama" -> Panama City, Panama, not Panama City Beach, FL),
  //  - exact municipality match beats prefix beats substring,
  //  - larger fields (L > M > S) and scheduled service break remaining ties.
  const rank = (a: RawAirport) => {
    const mun = fold(a.mun)
    let score = 0
    // A typed region wins over everything: someone who wrote "Fort Lauderdale,
    // Florida" has told us which one they mean.
    if (!matchesQualifier(a)) score += 8
    if (!findOverride(a.mun || a.nm)) score += 4 // override metros first
    if (mun === q) score += 0
    else if (mun.startsWith(q)) score += 1
    else score += 2
    score += a.ty === 'L' ? 0 : a.ty === 'M' ? 0.2 : 0.4
    score += a.sch ? 0 : 0.1
    return score
  }
  return [...byMunicipality, ...byOther].sort((x, y) => rank(x) - rank(y))
}

/** Build a CityOption for one metro anchored at the given airport. */
function buildCity(anchor: RawAirport, airports: RawAirport[]): CityOption {
  // Gather fields within the radius of this metro's anchor.
  const nearby = airports
    .map((a) => ({ a, d: haversineKm(anchor.lat, anchor.lng, a.lat, a.lng) }))
    .filter(({ d }) => d <= RADIUS_KM)
    .sort((x, y) => x.d - y.d)
    .map(({ a }) => a)

  const override = findOverride(anchor.mun || anchor.nm)

  // Order: overridden executive fields first (curated), then remaining nearby
  // executive/GA fields, then the commercial opt-out(s) last.
  const ordered = applyOrdering(nearby, override)

  // Guarantee the "lock to a specific airport" commercial opt-out is present:
  // executives can otherwise fill every slot and crowd it out. Reserve the last
  // slot for the nearest commercial field when one exists in range.
  const execs = ordered.filter((a) => classify(a) === 'Executive')
  const commercials = ordered.filter((a) => classify(a) === 'Commercial')
  let chosen: RawAirport[]
  if (commercials.length > 0 && execs.length >= MAX_AIRPORTS_PER_CITY) {
    chosen = [...execs.slice(0, MAX_AIRPORTS_PER_CITY - 1), commercials[0]]
  } else {
    chosen = ordered.slice(0, MAX_AIRPORTS_PER_CITY)
  }
  const airportOptions = chosen.map(toAirportOption)

  // The city's representative (default) field: the first executive option if
  // any, else the anchor — this is what "Any airport" resolves to. We keep both
  // the ICAO payload code and the IATA-preferred display code.
  const firstExec = airportOptions.find((o) => o.category === 'Executive')
  const defaultCode = firstExec?.code ?? payloadCode(anchor)
  const defaultDisplayCode = firstExec?.displayCode ?? displayCode(anchor)

  return {
    id: (anchor.ic || anchor.ia).toLowerCase(),
    city: anchor.mun || anchor.nm,
    region: anchor.rg,
    country: anchor.co,
    defaultCode,
    defaultDisplayCode,
    airports: airportOptions,
  }
}

/** Apply the curated override ordering (primary exec first), keep the rest. */
function applyOrdering(
  nearby: RawAirport[],
  override: ReturnType<typeof findOverride>,
): RawAirport[] {
  const execs = nearby.filter((a) => classify(a) === 'Executive')
  const commercials = nearby.filter((a) => classify(a) === 'Commercial')

  if (!override) return [...execs, ...commercials]

  // Promote overridden executive codes to the front, in the client's order.
  const wanted = new Set(override.executive)
  const promoted = override.executive
    .map((code) => execs.find((a) => a.ic === code || a.ia === code))
    .filter((a): a is RawAirport => Boolean(a))
  const remainingExecs = execs.filter((a) => !wanted.has(a.ic) && !wanted.has(a.ia))

  return [...promoted, ...remainingExecs, ...commercials]
}

/**
 * Resolve a curated-override metro to an anchor airport, so served metros
 * always center correctly even when OurAirports labels their fields under
 * varying municipalities (e.g. Panama City -> "Albrook"/"Tocumen").
 * Prefers the override's explicit anchor coords, else its primary executive
 * field looked up by ICAO/IATA.
 */
function overrideAnchor(query: string, airports: RawAirport[]): RawAirport | null {
  const ov = findOverride(query)
  if (!ov) return null

  /**
   * A curated metro is pinned to the top of the results, so it must not
   * override a region the person actually typed.
   *
   * Several aliases are legitimate names of somewhere else: "salvador" is a
   * city in Brazil as well as the country El Salvador, "panama city" is in
   * Florida as well as Panama, "san jose" is in California as well as Costa
   * Rica. Matching the alias alone sent all three to the served market, so
   * adding the region made the answer wrong rather than more precise.
   *
   * When the query carries a qualifier after a comma, the override has to
   * agree with it or step aside and let the normal search answer.
   */
  const qualifiers = query
    .toLowerCase()
    .split(',')
    .slice(1)
    .map((s) => s.trim())
    .filter(Boolean)

  /**
   * A typed qualifier has to agree with either the metro we curated or the
   * field we would anchor on. Both are needed, because they disagree in
   * opposite directions:
   *
   *  - the curated labels abbreviate ("Los Angeles, CA"), so "california"
   *    only matches the field's real region;
   *  - a metro can span a state line — New York's executive field is
   *    Teterboro, in New Jersey — so "NY" only matches the metro label.
   *
   * Word boundaries throughout: a bare `includes` would find "ca" inside
   * "Costa Rica" and keep San José for someone who typed "San Jose, CA".
   */
  const agreesWithQualifiers = (a: RawAirport) =>
    qualifiers.length === 0 ||
    qualifiers.some(
      (part) =>
        containsWord(ov.metro.toLowerCase(), part) ||
        containsWord(a.rg.toLowerCase(), part) ||
        containsWord(a.co.toLowerCase(), part),
    )

  const primary = ov.executive[0]
  const field = airports.find((a) => a.ic === primary || a.ia === primary)
  if (field) return agreesWithQualifiers(field) ? field : null

  // Fall back to explicit anchor coords with a synthetic record if the field
  // isn't in the dataset (keeps the metro resolvable from the radius alone).
  if (ov.anchor) {
    const [city, region = '', country = ov.country] = ov.metro.split(',').map((s) => s.trim())
    return {
      ic: primary,
      ia: '',
      nm: ov.metro,
      ty: 'S',
      lat: ov.anchor.lat,
      lng: ov.anchor.lng,
      mun: city,
      rg: region,
      co: country,
      sch: 0,
    }
  }
  return null
}

/**
 * Search metros for a query and return them as CityOption[] (top one is the
 * recommended city in the UI). Dedupes by metro so we don't list the same city
 * twice from different anchor airports. A curated-override metro, when matched,
 * is surfaced first so served markets resolve reliably.
 */
export function searchCities(query: string, airports: RawAirport[]): CityOption[] {
  const seen = new Set<string>()
  const cities: CityOption[] = []

  const keyOf = (a: RawAirport) =>
    `${(a.mun || a.nm).toLowerCase()}|${a.co.toLowerCase()}`

  // Curated override metro first (if the query matches one).
  const curated = overrideAnchor(query, airports)
  if (curated) {
    seen.add(keyOf(curated))
    cities.push(buildCity(curated, airports))
  }

  for (const anchor of findAnchors(query, airports)) {
    const key = keyOf(anchor)
    if (seen.has(key)) continue
    seen.add(key)
    cities.push(buildCity(anchor, airports))
    if (cities.length >= MAX_CITY_RESULTS) break
  }

  return cities
}
