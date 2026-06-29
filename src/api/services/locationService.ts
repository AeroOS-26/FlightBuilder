/**
 * Location service — autocomplete search for the Route step. Wraps whatever
 * the backend exposes for location lookup so the Route UI depends only on our
 * `CityOption` shape.
 *
 * Returns a curated static dataset until the live search endpoint is available.
 * This is a dev seam and will be replaced with the real lookup in the
 * integration milestone (no hardcoded data in production paths).
 */

import type { AirportOption, CityOption } from '@/types'

/**
 * Search cities/airports by free-text query.
 *
 * Live implementation:
 *   const { data } = await apiClient.get('/locations', { params: { q: query } })
 *   return data.map(fromBackendLocation)
 */
export async function searchLocations(query: string): Promise<CityOption[]> {
  const q = query.trim().toLowerCase()
  if (q.length === 0) return []
  // Small async tick keeps the call shape identical to the live HTTP version.
  await Promise.resolve()
  return DEV_CITIES.filter((city) => matchesCity(city, q))
}

function matchesCity(city: CityOption, q: string): boolean {
  if (city.city.toLowerCase().includes(q)) return true
  if (city.region.toLowerCase().includes(q)) return true
  if (`${city.city}, ${city.region}`.toLowerCase().includes(q)) return true
  return city.airports.some(
    (a) => a.code.toLowerCase().includes(q) || a.name.toLowerCase().includes(q),
  )
}

function airport(
  code: string,
  name: string,
  category: AirportOption['category'],
  city: string,
  region: string,
  country = 'United States',
): AirportOption {
  return { code, name, category, city, region, country }
}

/** Curated dev dataset; cities with multiple airports exercise disambiguation. */
const DEV_CITIES: CityOption[] = [
  {
    id: 'sfo',
    city: 'San Francisco',
    region: 'California',
    country: 'United States',
    defaultCode: 'SFO',
    airports: [
      airport('SFO', 'San Francisco International Airport', 'Commercial', 'San Francisco', 'California'),
      airport('SQL', 'San Carlos Executive Airport', 'Executive', 'San Carlos', 'California'),
    ],
  },
  {
    id: 'san',
    city: 'San Diego',
    region: 'California',
    country: 'United States',
    defaultCode: 'SAN',
    airports: [
      airport('SAN', 'San Diego International Airport', 'Commercial', 'San Diego', 'California'),
      airport('MYF', 'Montgomery Field Executive', 'Executive', 'San Diego', 'California'),
    ],
  },
  {
    id: 'sjc',
    city: 'San Jose',
    region: 'California',
    country: 'United States',
    defaultCode: 'SJC',
    airports: [
      airport('SJC', 'Norman Y. Mineta San Jose International', 'Commercial', 'San Jose', 'California'),
      airport('RHV', 'Reid-Hillview Executive', 'Executive', 'San Jose', 'California'),
    ],
  },
  {
    id: 'sat',
    city: 'San Antonio',
    region: 'Texas',
    country: 'United States',
    defaultCode: 'SAT',
    airports: [
      airport('SAT', 'San Antonio International Airport', 'Commercial', 'San Antonio', 'Texas'),
    ],
  },
  {
    id: 'sba',
    city: 'Santa Barbara',
    region: 'California',
    country: 'United States',
    defaultCode: 'SBA',
    airports: [
      airport('SBA', 'Santa Barbara Municipal Airport', 'Commercial', 'Santa Barbara', 'California'),
    ],
  },
  {
    id: 'nyc',
    city: 'New York',
    region: 'New York',
    country: 'United States',
    defaultCode: 'JFK',
    airports: [
      airport('JFK', 'John F. Kennedy International Airport', 'Commercial', 'New York', 'New York'),
      airport('EWR', 'Newark Liberty International Airport', 'Commercial', 'Newark', 'New Jersey'),
      airport('LGA', 'LaGuardia Airport', 'Commercial', 'New York', 'New York'),
      airport('TEB', 'Teterboro Executive Airport', 'Executive', 'Teterboro', 'New Jersey'),
    ],
  },
  {
    id: 'mia',
    city: 'Miami',
    region: 'Florida',
    country: 'United States',
    defaultCode: 'MIA',
    airports: [
      airport('MIA', 'Miami International Airport', 'Commercial', 'Miami', 'Florida'),
      airport('OPF', 'Miami Executive Airport', 'Executive', 'Miami', 'Florida'),
      airport('TMB', 'Miami Kendall-Tamiami Executive', 'Executive', 'Miami', 'Florida'),
    ],
  },
  {
    id: 'mibe',
    city: 'Miami Beach',
    region: 'Florida',
    country: 'United States',
    defaultCode: 'MIA',
    airports: [
      airport('MIA', 'Miami International Airport', 'Commercial', 'Miami', 'Florida'),
    ],
  },
  {
    id: 'lax',
    city: 'Los Angeles',
    region: 'California',
    country: 'United States',
    defaultCode: 'LAX',
    airports: [
      airport('LAX', 'Los Angeles International Airport', 'Commercial', 'Los Angeles', 'California'),
      airport('VNY', 'Van Nuys Executive Airport', 'Executive', 'Van Nuys', 'California'),
    ],
  },
  {
    id: 'lon',
    city: 'London',
    region: 'England',
    country: 'United Kingdom',
    defaultCode: 'LHR',
    airports: [
      airport('LHR', 'Heathrow Airport', 'Commercial', 'London', 'England', 'United Kingdom'),
      airport('LGW', 'Gatwick Airport', 'Commercial', 'London', 'England', 'United Kingdom'),
      airport('LCY', 'London City Executive', 'Executive', 'London', 'England', 'United Kingdom'),
    ],
  },
  {
    id: 'bos',
    city: 'Boston',
    region: 'Massachusetts',
    country: 'United States',
    defaultCode: 'BOS',
    airports: [
      airport('BOS', 'Logan International Airport', 'Commercial', 'Boston', 'Massachusetts'),
      airport('BED', 'Hanscom Executive Field', 'Executive', 'Bedford', 'Massachusetts'),
    ],
  },
]
