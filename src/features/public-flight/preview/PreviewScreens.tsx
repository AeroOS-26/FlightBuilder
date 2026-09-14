'use client'

/**
 * Dev-only harness for the public screens that no route renders.
 *
 * `PublicFlightPage` only ever mounts three states — Live (forming/filling),
 * Group Full, and Not found — and sends quoting/confirmed/closed to Group Full
 * through a `default:` branch, because the client ruled those are member-only
 * and not shown on a public link. The components for frames 10, 10C, 11, 11C,
 * 12, 12B, 13, 14–15, 40, 41 and 41B therefore exist but are unreachable, which
 * makes them impossible to check against the design.
 *
 * This mounts each one with mock data so it can be opened in a browser. It is
 * NOT a decision about where these screens finally live — that is a routing
 * question still open with the client. Delete this directory and its two routes
 * once they are wired for real.
 *
 * The catalogue lives in `screens.ts` so the server routes can read it.
 */

import {
  CompletedState,
  ConfirmedState,
  FillingFlightDetailPage,
  FillingFlightDetailPageWithLead,
  FullFlightDetailPage,
  JoinFlow,
  JoinOutcomeScreen,
  LoggedInFlightDetailPage,
  LoggedInFlightDetailPageWithLead,
  QuotingState,
  UnfilledState,
} from '../states'
import { getMockFlight } from '@/services/mockData'
import { GroupDetailView } from '@/features/group/components/GroupDetailView'
import { readGroupPreview } from '@/features/group/devPreview'

const GROUP_ID = '202609-SFO-LAX-ABC123'

/**
 * Frame 40 reads "Pulled from your profile", so the preview seeds a traveller
 * and a pet. Without them the form opens empty and the Travel Readiness card —
 * which only appears when pets are actually coming — looks absent.
 */
const SEED_TRAVELERS = [{ id: 'seed-t1', name: 'Margot Davies', isFounder: true }]
const SEED_PETS = [
  {
    id: 'seed-p1',
    name: 'Biscuit',
    type: 'Dog',
    breed: 'Golden Retriever',
    weight: '68',
    temperament: 'Experienced Traveler' as const,
  },
]

export function PreviewScreen({ slug }: { slug: string }) {
  switch (slug) {
    case '10':
      return (
        <LoggedInFlightDetailPage
          token="M2-FORMING-001"
          flight={getMockFlight('forming')}
          isAlreadyMember={false}
        />
      )
    case '10c':
      return (
        <LoggedInFlightDetailPageWithLead
          token="M2-FORMING-001"
          flight={getMockFlight('forming')}
        />
      )
    case '11':
      return (
        <FillingFlightDetailPage
          token="M2-FILLING-001"
          flight={getMockFlight('filling')}
          isAlreadyMember={false}
        />
      )
    case '11c':
      return (
        <FillingFlightDetailPageWithLead
          token="M2-FILLING-001"
          flight={getMockFlight('filling')}
        />
      )
    case '12':
      return (
        <FullFlightDetailPage
          token="M2-FULL-001"
          flight={getMockFlight('full')}
          isAlreadyMember
        />
      )
    case '12b':
      return <QuotingState flight={getMockFlight('quoting')} />
    case '13':
      return <ConfirmedState flight={getMockFlight('confirmed')} />
    case '14':
      return <CompletedState flight={getMockFlight('closed')} />
    case '15':
      // An unfilled group by definition never filled, so the shared `closed`
      // mock (which is full) cannot represent it — the empty spaces are the
      // whole point of this frame.
      return (
        <UnfilledState
          flight={{ ...getMockFlight('closed'), spaces_remaining: 4 }}
        />
      )
    case '40':
      // The whole sequence, so Confirm actually advances to 41 / 41B.
      return (
        <JoinFlow
          token="M2-FILLING-001"
          flight={getMockFlight('filling')}
          initialTravelers={SEED_TRAVELERS}
          initialPets={SEED_PETS}
          // Fixed, because a preview never reaches the endpoint and so has no
          // real seat id to show. The live path leaves this unset.
          reference="JN-3041-MGRT"
        />
      )
    case '41':
      return (
        <JoinOutcomeScreen
          flight={getMockFlight('filling')}
          groupId={GROUP_ID}
          filled={false}
          travelers={SEED_TRAVELERS}
          pets={SEED_PETS}
          reference="JN-3041-MGRT"
          memberNumber={3}
        />
      )
    case '41b':
      return (
        <JoinOutcomeScreen
          flight={getMockFlight('full')}
          groupId={GROUP_ID}
          filled
          travelers={SEED_TRAVELERS}
          pets={SEED_PETS}
          reference="JN-3041-MGRT"
          memberNumber={4}
        />
      )
    // The six Flight Group Detail frames. They used to hang off `?as=&state=`
    // on the real route, which cannot work now that the layout guards
    // membership — a preview account is not a member of a mock group. They
    // live here instead, where the whole harness is already dev-only.
    case '60':
      return <GroupPreview role="organizer" state="forming" />
    case '61':
      return <GroupPreview role="organizer" state="filling" />
    case '64':
      return <GroupPreview role="organizer" state="filled" />
    case '62':
      return <GroupPreview role="joiner" state="forming" />
    case '63':
      return <GroupPreview role="joiner" state="filling" />
    case '70':
      return <GroupPreview role="joiner" state="filled" />
    default:
      return (
        <p className="p-8 font-sans text-[14px] text-[#000000]/70">
          No preview for “{slug}”.
        </p>
      )
  }
}

function GroupPreview({
  role,
  state,
}: {
  role: 'organizer' | 'joiner'
  state: 'forming' | 'filling' | 'filled'
}) {
  const preview = readGroupPreview(role, state)
  if (!preview) return null
  return (
    <GroupDetailView
      group={preview.group}
      viewerRole={preview.role}
      groupStatus={preview.status}
    />
  )
}
