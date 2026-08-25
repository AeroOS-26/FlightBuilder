/**
 * Index route — the entry router.
 *
 * This used to redirect straight into the Flight Builder, which meant the app
 * had no front door: anyone landing on `/` was dropped into flight creation
 * whether or not they had an account. Now it resolves the session first and
 * sends the visitor where they actually belong.
 *
 * The rule itself lives in `auth/server/routing.ts` so sign-in, sign-up and
 * this route all answer the question the same way.
 */

import { redirect } from 'next/navigation'
import { currentViewer } from '@/features/auth/server/guard'
import { entryFor } from '@/features/auth/server/routing'

export default async function HomePage() {
  redirect(entryFor(await currentViewer()))
}
