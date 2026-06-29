/**
 * Index route — sends the Founder to the start of the flow.
 * Mirrors the old `/` -> `/build/route` redirect.
 */

import { redirect } from 'next/navigation'
import { FIRST_STEP } from '@/features/flight-builder/config/steps'

export default function HomePage() {
  redirect(`/build/${FIRST_STEP}`)
}
