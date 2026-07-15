# Route step — airport search implementation

How the Route step resolves origin/destination, and the technical decisions
taken during implementation (with the items still pending client confirmation).

## Behaviour

Per the agreed model:
- **Radius search, global.** As the Founder types, we resolve candidate metros
  and gather the airfields within a radius, defaulting to **executive / GA**
  fields. The big scheduled-service **commercial** airport is offered only as
  the "lock to a specific airport" opt-out.
- **Curated overrides (US + Central America).** A seed table pins each served
  metro's executive field(s) (primary first) and is also used to anchor the
  search reliably. Metros outside the table still resolve from the radius +
  GA/executive baseline; they just lack a hand-tuned override.
- **Payload unchanged.** City selection → `origin_type: "city"`,
  `origin_airport_code: null`. Locking a specific airport → `origin_type:
  "airport"` with the code populated. Symmetric on the destination side.

## Architecture

| Piece | File |
| --- | --- |
| Lazy dataset loader (fetch once, cache) | `src/features/flight-builder/data/airportsDataset.ts` |
| Radius engine (haversine, classify, override, dedupe) | `src/features/flight-builder/data/radiusSearch.ts` |
| Tunables (radius, code format, limits) | `src/features/flight-builder/config/routeConfig.ts` |
| Curated override seed | `src/features/flight-builder/config/executiveOverrides.ts` |
| Service entry (unchanged UI contract) | `src/api/services/locationService.ts` |
| Dataset build script | `scripts/build-airports-dataset.mjs` |
| Dataset (static asset) | `public/data/airports.json` |

The Route picker UI (`LocationField.tsx`) is **unchanged** — it still consumes
`locationService.searchLocations(): Promise<CityOption[]>`. Only the data source
moved from a hardcoded list to the radius engine.

## Dataset

- Source: **OurAirports** (public domain). Regenerate with
  `node scripts/build-airports-dataset.mjs` (place the 3 source CSVs in
  `scripts/ourairports-src/`, gitignored).
- Trimmed from ~85k rows to **~18k** real fixed-wing fields: keeps
  large/medium/small airports **with a real ICAO (4-letter) or IATA (3-letter)
  code**; drops heliports, seaplane/balloon, closed fields, synthetic-ident
  private strips (`US-1234`), and ultralight/glider parks.
- **~2.7 MB raw / ~0.6 MB gzipped.** Shipped as a **static asset in `public/`
  and fetched once at runtime (cached in memory)** — deliberately NOT bundled,
  so the JS bundle stays small while coverage stays global.

## Technical decisions (documented per "continue with the best approach")

1. **Dataset as a lazily-fetched static asset, not bundled.** 18k airports is
   too large for the JS bundle; `public/` + one cached fetch keeps the bundle
   lean and the data global. (Decision made because global coverage was required
   but bundling the data would bloat first load.)
2. **Classification:** an airport is treated as **Commercial** (the opt-out)
   when it is a *large* field *with* scheduled service; everything else is
   **Executive/GA** (the default). This matches the "executive default,
   commercial opt-out" requirement using the data we have.
3. **Guaranteed commercial opt-out.** Executives can fill every visible slot, so
   the engine reserves the last slot for the nearest commercial field — the
   "lock to a specific airport" option is always available.
4. **Override-anchored curated metros.** OurAirports labels some metros' fields
   under varying municipalities (e.g. Panama City fields sit under "Albrook"/
   "Tocumen"), so a plain municipality match misses them. For curated metros we
   anchor the radius on the override's primary executive field, so served
   markets resolve reliably regardless of labelling.
5. **Junk filtering.** Required a real ICAO/IATA code and excluded
   ultralight/glider/balloon/"[delete]" names, which otherwise polluted results
   with private strips a jet wouldn't use.

## Code format — CONFIRMED ICAO in payload, IATA-preferred for display

Client confirmed: **the payload `airport_code` is ICAO** (`KOPF`, `KTMB`, …),
because OurAirports keys on ICAO and many executive/GA fields have no IATA.

We therefore carry **two codes** through the model:
- `code` — **ICAO**, the value sent to the backend (`PAYLOAD_CODE_FORMAT='icao'`).
- `displayCode` — **IATA when present, ICAO fallback**, used only for on-screen
  display (e.g. shows `OPF`, but sends `KOPF`). Fields with no IATA fall back to
  ICAO for display rather than showing a blank — per the client's note.

Display uses `displayCode`: the picker rows, the selected-field label, the
route summary (`placeWithCode`), and the human-facing group code / share slug
(which match the sample's IATA form, e.g. `202606-SFO-JFK-01`). The Zoho
`airport_code` payload value stays ICAO.

## ⏳ Still pending client confirmation (built with a safe default + seam)

- **Radius value** (`RADIUS_KM`, currently 60) and the **exact GA/commercial
  filter** are centralized in `routeConfig.ts` / the `classify()` helper for a
  one-line lock once confirmed.
- **Override values** (esp. Central America) may receive small corrections from
  Charles; they are pure data in `executiveOverrides.ts`.
