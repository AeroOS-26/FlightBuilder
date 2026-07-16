'use client'

/**
 * Seeds the Founder's member identity into the store on startup.
 *
 * The Founder's real identity comes from member data. Auth/member fetching is
 * out of scope for the Flight Builder, so this is the seam where that data is
 * injected — currently a placeholder identity, swapped for the real member
 * lookup once auth/onboarding lands (no invented data in production paths).
 */

import { useEffect } from 'react'
import { useFlightBuilderStore } from '@/features/flight-builder/store/flightBuilderStore'
import type { MemberIdentity } from '@/types'

// Placeholder — replace with the real member lookup when auth is wired.
// Name/email/phone are intentionally blank: email is the dedup key in Zoho, so a
// seeded address would collapse every flight onto one Contact. Sending empty
// values until auth provides the real member identity is safer.
const PLACEHOLDER_FOUNDER: MemberIdentity = {
  id: 'member_self',
  name: '',
  email: '',
  phone: '',
}

export function useFounderIdentity() {
  const founder = useFlightBuilderStore((s) => s.founder)
  const initFounder = useFlightBuilderStore((s) => s.initFounder)

  useEffect(() => {
    if (!founder) initFounder(PLACEHOLDER_FOUNDER)
  }, [founder, initFounder])
}