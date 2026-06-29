/**
 * /build index — redirect to the first step.
 * Mirrors the old `/build` -> `/build/route` index redirect.
 */

import { redirect } from 'next/navigation'
import { FIRST_STEP } from '@/features/flight-builder/config/steps'

export default function BuildIndexPage() {
  redirect(`/build/${FIRST_STEP}`)
}
