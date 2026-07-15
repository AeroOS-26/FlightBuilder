/**
 * build-airports-dataset.mjs
 *
 * Reproducibly trims the public OurAirports dataset into a compact JSON the
 * Route step's radius search ships with. Run when refreshing the data:
 *
 *   node scripts/build-airports-dataset.mjs
 *
 * Source (public domain): https://ourairports.com/data/
 *   airports.csv, regions.csv, countries.csv
 *
 * Output: public/data/airports.json
 *   Served as a static asset (not bundled) and fetched once at runtime, cached
 *   in memory — keeps the JS bundle small while supporting global coverage.
 *   A flat array of compact records. We keep only what the radius engine and
 *   the picker need, and only "real" fixed-wing fields (large/medium/small
 *   airports) with a usable code and coordinates — heliports, seaplane bases,
 *   balloonports, and closed fields are dropped.
 *
 * Each record:
 *   { ic: ICAO, ia: IATA, nm: name, ty: 'L'|'M'|'S', lat, lng,
 *     mun: municipality, rg: region name, co: country name, sch: 0|1 }
 */

import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = resolve(HERE, 'ourairports-src') // place the 3 CSVs here
const OUT_FILE = resolve(HERE, '../public/data/airports.json')

const TYPE_CODE = {
  large_airport: 'L',
  medium_airport: 'M',
  small_airport: 'S',
}

/** Minimal CSV parser handling quoted fields and embedded commas/quotes. */
function parseCsv(text) {
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += c
    } else if (c === '"') inQuotes = true
    else if (c === ',') {
      row.push(field)
      field = ''
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else if (c !== '\r') field += c
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }
  return rows
}

function toObjects(rows) {
  const [header, ...body] = rows
  return body
    .filter((r) => r.length === header.length)
    .map((r) => Object.fromEntries(header.map((h, i) => [h, r[i]])))
}

function load(name) {
  return toObjects(parseCsv(readFileSync(resolve(DATA_DIR, name), 'utf8')))
}

console.log('Reading source CSVs from', DATA_DIR)
const airports = load('airports.csv')
const regions = load('regions.csv')
const countries = load('countries.csv')

const regionName = new Map(regions.map((r) => [r.code, r.name]))
const countryName = new Map(countries.map((c) => [c.code, c.name]))

/** Names that mark fields a private jet wouldn't use — drop them. */
const EXCLUDE_NAME = /ultralight|gliderport|\[delete\]|balloon|drone|model aircraft/i

const out = []
for (const a of airports) {
  const ty = TYPE_CODE[a.type]
  if (!ty) continue // drop heliport / seaplane / closed / balloonport
  if (EXCLUDE_NAME.test(a.name)) continue

  const lat = Number(a.latitude_deg)
  const lng = Number(a.longitude_deg)
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue

  const iata = (a.iata_code || '').trim()

  // Derive the ICAO code. In this dataset icao_code is mostly EMPTY for US
  // fixed-wing fields — the ICAO lives in ident/gps_code instead (KOPF, KVNY,
  // KTEB, ...). So resolve it from icao_code -> ident -> gps_code, taking the
  // first that is a real ICAO (4 letters, or the US "K"+3 alphanumeric form).
  const isIcao = (v) => /^[A-Z]{4}$/.test(v) || /^K[A-Z0-9]{3}$/.test(v)
  const rawIcao = (a.icao_code || '').trim()
  const ident = (a.ident || '').trim()
  const gps = (a.gps_code || '').trim()
  const icao = isIcao(rawIcao) ? rawIcao : isIcao(ident) ? ident : isIcao(gps) ? gps : ''

  // A stable identifier for the field: the FAA local id / ident, used for
  // small GA strips that carry an FAA LID (e.g. "43L") rather than an ICAO.
  const localId = ident || gps

  // Key the trim on TYPE, not on ICAO presence — dropping ICAO-less rows would
  // remove most US GA/executive fields, which are the GA-default market.
  // Keep any fixed-wing field that has at least one usable identifier.
  const anyCode = icao || iata || localId
  if (!anyCode) continue
  // Skip OurAirports synthetic idents (e.g. "US-1234", "GB-0785") that mark
  // unverified private/ultralight strips with no real code at all.
  if (!icao && !iata && /^[A-Z]{2}-\d+$/.test(localId)) continue

  out.push({
    // ic carries the ICAO for the payload; falls back to the local id (FAA LID)
    // so a US GA strip still has a code rather than an empty ICAO.
    ic: icao || localId,
    ia: iata,
    nm: a.name,
    ty,
    lat: Math.round(lat * 1e5) / 1e5,
    lng: Math.round(lng * 1e5) / 1e5,
    mun: a.municipality || '',
    rg: regionName.get(a.iso_region) || a.iso_region || '',
    co: countryName.get(a.iso_country) || a.iso_country || '',
    sch: a.scheduled_service === 'yes' ? 1 : 0,
  })
}

mkdirSync(dirname(OUT_FILE), { recursive: true })
writeFileSync(OUT_FILE, JSON.stringify(out))
console.log(`Wrote ${out.length} airports -> ${OUT_FILE}`)
console.log(`Output size: ${(readFileSync(OUT_FILE).length / 1024 / 1024).toFixed(2)} MB`)
