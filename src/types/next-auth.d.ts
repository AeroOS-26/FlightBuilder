/**
 * Session shape.
 *
 * `id` is the member's database id and is the ONLY id any per-member read
 * should trust — never one supplied by the client. `accountId` is the
 * human-facing value shown on frame 35.
 */

import type { DefaultSession } from 'next-auth'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      accountId: string | null
      /**
       * Named `isEmailVerified` rather than `emailVerified`: the adapter's
       * AdapterUser already carries `emailVerified` as a Date, and reusing the
       * name would conflict with it.
       */
      isEmailVerified: boolean
    } & DefaultSession['user']
  }
}
