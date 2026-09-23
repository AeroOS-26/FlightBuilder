'use client'

/**
 * Public Flight Detail — Full State (Frame 12)
 *
 * Displayed when group is full (all spaces taken, awaiting quote).
 * Routes: /share/[token] (when logged in + group full)
 *
 * Responsive: Desktop (1440px) → Mobile (375px+)
 */

import { useRouter } from 'next/navigation'
import { BrokerDisclosureFooter } from '@/components/common'
import type { PublicView } from '@/types'
import { aircraftRowValue } from '../format'

interface FullFlightDetailPageProps {
  token: string
  flight: PublicView
  isAlreadyMember: boolean
}

export function FullFlightDetailPage({
  token,
  flight,
  isAlreadyMember,
}: FullFlightDetailPageProps) {
  const router = useRouter()

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner - Green for Full State */}
      <div className="relative h-80 md:h-96 bg-gradient-to-r from-green-600 to-green-700 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {flight.route_origin_city} → {flight.route_destination_city}
          </h1>
          <p className="text-green-100 text-sm md:text-base">
            {flight.estimated_date_range.earliest_date} to {flight.estimated_date_range.latest_date}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Badge - Group Full */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-green-100 border border-green-300 rounded-full">
              <div className="w-2 h-2 bg-green-600 rounded-full" />
              <span className="text-sm font-semibold text-green-900">Group is full — requesting quote</span>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                <p className="text-xs md:text-sm text-gray-600 font-semibold uppercase tracking-wide">Aircraft</p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 mt-2">{aircraftRowValue(flight.aircraft_category)}</p>
                <p className="text-xs md:text-sm text-gray-500 mt-2">Subject to operator availability</p>
              </div>

              <div className="bg-white rounded-lg p-4 md:p-6 border border-green-200 bg-green-50">
                <p className="text-xs md:text-sm text-green-900 font-semibold uppercase tracking-wide">Places</p>
                <p className="text-lg md:text-2xl font-bold text-green-600 mt-2">
                  {flight.spaces_total} of {flight.spaces_total} ✓
                </p>
                <p className="text-xs md:text-sm text-green-700 mt-2">Group is complete</p>
              </div>
            </div>

            {/* Flight Details */}
            <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-200 space-y-6">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Flight Details</h2>
                <div className="grid grid-cols-2 gap-6">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">From</p>
                    <p className="text-lg font-semibold text-gray-900">{flight.route_origin_city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">To</p>
                    <p className="text-lg font-semibold text-gray-900">{flight.route_destination_city}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Travel Window</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {flight.estimated_date_range.earliest_date}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Until</p>
                    <p className="text-lg font-semibold text-gray-900">
                      {flight.estimated_date_range.latest_date}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* What Happens Next */}
            <div className="bg-green-50 rounded-lg p-6 md:p-8 border border-green-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">What happens next</h2>
              <div className="space-y-4">
                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-600 text-white flex items-center justify-center text-xs font-bold">
                    ✓
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Group is full</p>
                    <p className="text-sm text-gray-600 mt-1">All {flight.spaces_total} spaces are now reserved.</p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">
                    2
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">We're requesting an operator quote</p>
                    <p className="text-sm text-gray-600 mt-1">
                      We've submitted availability and pricing requests to multiple air charter operators.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <div className="flex-shrink-0 w-6 h-6 rounded-full bg-gray-400 text-white flex items-center justify-center text-xs font-bold">
                    3
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">You'll see the final offer within 24 hours</p>
                    <p className="text-sm text-gray-600 mt-1">
                      Once we receive quotes, we'll lock in the best aircraft, times, and per-person cost.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* All Members */}
            <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Your Group — {flight.spaces_total} Members</h2>
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: flight.spaces_total }).map((_, i) => (
                  <div
                    key={i}
                    className="w-10 h-10 rounded-full bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center text-white text-sm font-bold"
                    title={`Participant ${i + 1}`}
                  >
                    M{i + 1}
                  </div>
                ))}
              </div>
            </div>

            {/* Pets */}
            {flight.pet_friendly && (
              <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Pets Traveling with This Group</h2>
                <p className="text-gray-700 mb-4">
                  {flight.fellow_pet_info.pets_total > 0
                    ? Object.entries(flight.fellow_pet_info.by_species)
                        .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
                        .join(', ')
                    : 'No pets on this flight, but they are welcome.'}
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Status Card */}
          <div className="lg:sticky lg:top-8">
            <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-200 shadow-sm">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">✓ Full</h2>
              <p className="text-gray-600 mb-6">All {flight.spaces_total} spaces are reserved</p>

              <div className="space-y-4">
                {isAlreadyMember ? (
                  <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                    <p className="text-sm font-semibold text-green-900 mb-2">You're in this group</p>
                    <p className="text-xs text-green-700">
                      You'll be notified when the operator quote is ready.
                    </p>
                  </div>
                ) : (
                  <button
                    disabled
                    className="w-full px-6 py-3 bg-gray-300 text-gray-600 rounded-lg font-semibold cursor-not-allowed"
                  >
                    Group is full
                  </button>
                )}
              </div>

              <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <h3 className="font-semibold text-blue-900 text-sm mb-2">Quote status</h3>
                <ul className="text-xs md:text-sm text-blue-800 space-y-1">
                  <li>✓ Group fills</li>
                  <li>⏳ Operator quotes requested</li>
                  <li>⏳ Group approves a quote</li>
                  <li>⏳ Group fully funded</li>
                  <li>⏳ Confirmed once the operator commits</li>
                </ul>
              </div>

              <p className="text-xs text-gray-500 mt-6 text-center">
                All participants will receive updates via email
              </p>
            </div>
          </div>
        </div>
      </div>

      <BrokerDisclosureFooter />
    </div>
  )
}
