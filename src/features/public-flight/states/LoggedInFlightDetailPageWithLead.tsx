'use client'

/**
 * Public Flight Detail — Logged-In with Lead Capture (Frame 10C)
 *
 * Variant of Frame 10: shows flight details to logged-in member but leads with
 * interest capture form instead of direct join. For members who want to register
 * interest before committing.
 *
 * Routes: /share/[token] (when logged in + lead capture variant)
 * Responsive: Desktop (1440px) → Mobile (375px+)
 */

import { useState } from 'react'
import type { PublicView } from '@/types'
import { LeadCaptureForm } from '../components/LeadCaptureForm'
import { ConfirmationState } from './ConfirmationState'

interface LoggedInFlightDetailPageWithLeadProps {
  token: string
  flight: PublicView
}

export function LoggedInFlightDetailPageWithLead({
  token,
  flight,
}: LoggedInFlightDetailPageWithLeadProps) {
  const [submitted, setSubmitted] = useState(false)

  if (submitted) {
    return <ConfirmationState flight={flight} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Banner */}
      <div className="relative h-80 md:h-96 bg-gradient-to-r from-blue-600 to-blue-800 overflow-hidden">
        <div className="absolute inset-0 bg-black/20" />
        <div className="relative h-full flex flex-col justify-end p-6 md:p-8">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            {flight.route_origin_city} → {flight.route_destination_city}
          </h1>
          <p className="text-blue-100 text-sm md:text-base">
            {flight.estimated_date_range.earliest_date} to {flight.estimated_date_range.latest_date}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-8 md:py-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Flight Details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Status Cards */}
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                <p className="text-xs md:text-sm text-gray-600 font-semibold uppercase tracking-wide">
                  Aircraft
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 mt-2">
                  {flight.aircraft_category}
                </p>
                <p className="text-xs md:text-sm text-gray-500 mt-2">
                  Final aircraft confirmed after group fills
                </p>
              </div>

              <div className="bg-white rounded-lg p-4 md:p-6 border border-gray-200">
                <p className="text-xs md:text-sm text-gray-600 font-semibold uppercase tracking-wide">
                  Spaces
                </p>
                <p className="text-lg md:text-2xl font-bold text-gray-900 mt-2">
                  {flight.spaces_remaining} of {flight.spaces_total}
                </p>
                <p className="text-xs md:text-sm text-gray-500 mt-2">
                  {flight.spaces_total - flight.spaces_remaining} members joined
                </p>
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
                    <p className="text-lg font-semibold text-gray-900">
                      {flight.route_destination_city}
                    </p>
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

            {/* Members Joining */}
            <div className="bg-white rounded-lg p-6 md:p-8 border border-gray-200">
              <h2 className="text-xl font-semibold text-gray-900 mb-4">Who's Flying</h2>
              <p className="text-gray-600 mb-4">
                {flight.spaces_total - flight.spaces_remaining} members have already joined this group
              </p>
              <div className="flex items-center space-x-2">
                <div className="flex -space-x-2">
                  {Array.from({ length: Math.min(flight.spaces_total - flight.spaces_remaining, 5) }).map(
                    (_, i) => (
                      <div
                        key={i}
                        className="w-8 h-8 md:w-10 md:h-10 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 border-2 border-white flex items-center justify-center"
                      >
                        <span className="text-xs md:text-sm font-bold text-white">M{i + 1}</span>
                      </div>
                    ),
                  )}
                </div>
                {flight.spaces_total - flight.spaces_remaining > 5 && (
                  <span className="text-sm text-gray-600">
                    +{flight.spaces_total - flight.spaces_remaining - 5} more
                  </span>
                )}
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
                    : 'No pets yet, but this flight welcomes them!'}
                </p>
                <p className="text-sm text-gray-600">
                  We arrange flights with pet-friendly operators. Pets travel in cabin, not cargo.
                </p>
              </div>
            )}
          </div>

          {/* Right Column: Lead Capture Form */}
          <div className="lg:sticky lg:top-8">
            <LeadCaptureForm
              groupId={flight.group_id}
              onSuccess={() => setSubmitted(true)}
            />
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-8 mt-12">
        <div className="max-w-6xl mx-auto px-4 md:px-6 text-center text-sm text-gray-400">
          <p>
            Flights arranged by Perro Air, LLC and operated by direct air carriers certified under FAA
            Part 135, 121 or 129. The operating carrier maintains full operational control.
          </p>
        </div>
      </footer>
    </div>
  )
}
