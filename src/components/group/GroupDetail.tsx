'use client'

/**
 * Group Detail Component (Frames 60–70)
 *
 * Shared component used by all group detail screens.
 * Renders different content based on:
 * - Group state (Forming/Filling/Filled)
 * - Viewer role (Organizer/Joiner)
 *
 * Authorization is enforced server-side in the layout;
 * this component just renders the view for that role/state.
 */

import type { GroupDetail } from '@/types'
import type { GroupMembership } from '@/features/auth/server/guard'

interface GroupDetailProps {
  detail: GroupDetail
  membership: GroupMembership
}

export function GroupDetail({ detail, membership }: GroupDetailProps) {
  const isOrganizer = membership.role === 'group_organizer'
  const canCancel = isOrganizer && (detail.group_state === 'forming' || detail.group_state === 'filling')

  return (
    <div className="w-full max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          {detail.route_origin_city} → {detail.route_destination_city}
        </h1>
        <p className="text-gray-600">
          {detail.estimated_date_range.earliest_date} to {detail.estimated_date_range.latest_date}
        </p>
      </div>

      {/* Group Status */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Spaces filled</p>
          <p className="text-2xl font-bold">
            {detail.spaces_filled} of {detail.spaces_total}
          </p>
        </div>
        <div className="p-4 bg-blue-50 rounded-lg">
          <p className="text-sm text-gray-600">Status</p>
          <p className="text-2xl font-bold capitalize">{detail.group_state}</p>
        </div>
      </div>

      {/* Member Roster */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Members ({detail.fellow_members.length})</h2>
        <div className="space-y-2">
          {detail.fellow_members.map((member) => (
            <div key={member.member_id} className="flex items-center justify-between p-3 border rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center text-sm font-bold">
                  {member.avatar_initials}
                </div>
                <div>
                  <p className="font-semibold">
                    {member.name} {member.is_self && '(You)'}
                  </p>
                  <p className="text-sm text-gray-600">
                    {member.role === 'group_organizer' ? 'Group Organizer' : 'Joiner'}
                  </p>
                </div>
              </div>
              <p className="text-sm text-gray-500">Joined {new Date(member.joined_at).toLocaleDateString()}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Pets Info */}
      {detail.fellow_pet_info.pets_total > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4">Pets traveling with this group</h2>
          <p className="text-gray-600">
            {Object.entries(detail.fellow_pet_info.by_species)
              .map(([species, count]) => `${count} ${species}${count > 1 ? 's' : ''}`)
              .join(', ')}
          </p>
        </div>
      )}

      {/* Organizer Actions */}
      {canCancel && (
        <div className="border-t pt-8">
          <h2 className="text-lg font-semibold mb-4">Organizer actions</h2>
          <button className="px-4 py-2 border border-red-600 text-red-600 rounded-lg hover:bg-red-50">
            Cancel group
          </button>
        </div>
      )}
    </div>
  )
}
