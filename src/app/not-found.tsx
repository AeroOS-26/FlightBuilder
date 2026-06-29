/**
 * Catch-all for unknown routes — sends the user back to the start of the flow,
 * mirroring the previous React Router `path: '*'` fallback.
 */

import { redirect } from 'next/navigation'
import { FIRST_STEP } from '@/features/flight-builder/config/steps'

export default function NotFound() {
  redirect(`/build/${FIRST_STEP}`)
}
