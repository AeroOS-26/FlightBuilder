/**
 * Dev-only catalogue of the public screens no route renders.
 *
 * Metadata only, and deliberately server-safe — no `use client`, no JSX. The
 * matching renderer lives in `PreviewScreens.tsx`, which is a client module; a
 * server component cannot read a plain data export across that boundary, so the
 * list and the rendering have to be separate files.
 */

export interface PreviewEntry {
  slug: string
  frame: string
  label: string
}

export const PREVIEW_SCREENS: PreviewEntry[] = [
  { slug: '10', frame: '10', label: 'Public SFD · Forming (logged-in member)' },
  { slug: '10c', frame: '10C', label: 'Public SFD · Forming · Lead capture' },
  { slug: '11', frame: '11', label: 'Public SFD · Filling (logged-in member)' },
  { slug: '11c', frame: '11C', label: 'Public SFD · Filling · Lead capture' },
  { slug: '12', frame: '12', label: 'Public SFD · Group Full' },
  { slug: '12b', frame: '12B', label: 'Public SFD · Quoting' },
  { slug: '13', frame: '13', label: 'Public SFD · Confirmed' },
  { slug: '14', frame: '14', label: 'Public SFD · Closed · Completed (departed)' },
  { slug: '15', frame: '15', label: 'Public SFD · Closed · Unfilled' },
  { slug: '40', frame: '40', label: 'Join · Review and commit' },
  { slug: '41', frame: '41', label: 'Join · Post-join success' },
  { slug: '41b', frame: '41B', label: 'Join · Post-join, group filled' },
  { slug: '60', frame: '60', label: 'Group Detail · Organiser · Forming' },
  { slug: '61', frame: '61', label: 'Group Detail · Organiser · Filling' },
  { slug: '64', frame: '64', label: 'Group Detail · Organiser · Filled' },
  { slug: '62', frame: '62', label: 'Group Detail · Joiner · Forming' },
  { slug: '63', frame: '63', label: 'Group Detail · Joiner · Filling' },
  { slug: '70', frame: '70', label: 'Group Detail · Joiner · Filled' },

  // The approval screens. 47 and 49 have no route a preview can reach without
  // manufacturing a group in the database first, and the rest depend on a
  // request existing, so they are mounted here against the Figma's own sample.
  { slug: '42', frame: '42', label: 'Approval · Review your request' },
  { slug: '43', frame: '43', label: 'Approval · Request sent' },
  { slug: '44', frame: '44', label: 'Approval · Under review' },
  { slug: '45', frame: '45', label: 'Approval · Request approved (banner)' },
  { slug: '46', frame: '46', label: 'Approval · Request not approved' },
  { slug: '47', frame: '47', label: 'Approval · Organiser join requests' },
  { slug: '48', frame: '48', label: 'Approval · Join request detail' },
  { slug: '49', frame: '49', label: 'Approval · Approved, group full' },
  { slug: '09b', frame: '09B', label: 'Builder · Group Organizer acknowledgment' },
]
