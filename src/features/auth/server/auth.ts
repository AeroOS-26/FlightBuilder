import 'server-only'

/**
 * Auth.js configuration — the session layer for Milestone 1.
 *
 * Identity is owned by the application (settled in the Phase One scope), so
 * this file is the whole of it: credentials, magic link, session shape and the
 * lockout rule. Zoho is not consulted to sign anyone in.
 *
 * Two decisions worth knowing:
 *
 *  - **JWT sessions, not database sessions.** Database rows would be revocable,
 *    which Milestone 4's close-account needs, but Auth.js only supports the
 *    Credentials provider with the JWT strategy — and frames 30 and 32 are an
 *    email-and-password form, so Credentials is not optional. The adapter still
 *    owns the users and verification-token tables; only the session lives in a
 *    cookie. When close-account arrives, revocation is a `session_version`
 *    column compared in the `jwt` callback, which is the standard remedy.
 *    Worth knowing this cuts with the grain of the design: frames 38 and 38B
 *    both state "other devices stay signed in" after a password change, so a
 *    reset is not expected to end other sessions.
 *
 *  - **Sign-in failures are deliberately distinguishable.** `authorize` throws
 *    a tagged error so the UI can render frame 32's three variants. That reveals
 *    which emails are registered, which is the design's choice, recorded as a
 *    CONFIRM in SignInForm — one generic message is a small change if the client
 *    prefers it.
 */

import NextAuth, { CredentialsSignin } from 'next-auth'
import type { NextAuthConfig } from 'next-auth'
import Credentials from 'next-auth/providers/credentials'
import PostgresAdapter from '@auth/pg-adapter'
import { pool } from './db'
import {
  findByEmail,
  isLocked,
  registerFailedAttempt,
  clearFailedAttempts,
  verifyPassword,
} from './members'
import { consumeToken } from './tokens'

/**
 * Sign-in failures, tagged so the page can render frame 32's three variants.
 *
 * These must extend `CredentialsSignin`: a plain `throw new Error()` inside
 * `authorize` is reported by Auth.js as `error=Configuration`, which loses the
 * distinction entirely. Only a `CredentialsSignin` subclass carries its `code`
 * through to the redirect.
 */
export class AccountNotFoundError extends CredentialsSignin {
  code = 'not-found'
}
export class WrongPasswordError extends CredentialsSignin {
  code = 'wrong-password'
}
export class AccountLockedError extends CredentialsSignin {
  code = 'locked'
}

export const authConfig: NextAuthConfig = {
  adapter: PostgresAdapter(pool),
  session: { strategy: 'jwt', maxAge: 30 * 24 * 60 * 60 },
  pages: {
    signIn: '/signin',
    verifyRequest: '/magic-link/sent',
    error: '/signin',
  },
  providers: [
    Credentials({
      name: 'Email and password',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(raw) {
        const email = typeof raw?.email === 'string' ? raw.email : ''
        const password = typeof raw?.password === 'string' ? raw.password : ''
        if (!email || !password) throw new AccountNotFoundError()

        const member = await findByEmail(email)
        if (!member) throw new AccountNotFoundError()

        // Checked before the password so a locked account cannot be probed.
        if (isLocked(member)) throw new AccountLockedError()

        const ok = await verifyPassword(member, password)
        if (!ok) {
          await registerFailedAttempt(member.id)
          const after = await findByEmail(email)
          if (after && isLocked(after)) throw new AccountLockedError()
          throw new WrongPasswordError()
        }

        await clearFailedAttempts(member.id)
        return {
          id: String(member.id),
          email: member.email,
          name: member.name,
        }
      },
    }),

    /**
     * Signs in a member who has just clicked their verification link.
     *
     * Frame 35 reads "You're in." and offers "Create Your Own Shared Flight" —
     * it is written as an arrival, not as a prompt to go and log in. Without
     * this, verification marked the account and then dropped the member on a
     * page whose every link bounced to sign-in.
     *
     * The password is not available on that path and must not be: clicking a
     * link sent to their own address is the proof of ownership. What stands in
     * for it is a `session-grant` token — issued by the verification handler
     * moments earlier, single-use, and dead within a minute.
     *
     * This callback is a public endpoint like every other provider's, which is
     * exactly why it takes a token rather than an address. Handing out a session
     * for an unproven email here would be an authentication bypass.
     */
    Credentials({
      id: 'email-verified',
      name: 'Email verification',
      credentials: {
        email: { label: 'Email', type: 'email' },
        token: { label: 'Grant', type: 'text' },
      },
      async authorize(raw) {
        const email = typeof raw?.email === 'string' ? raw.email : ''
        const token = typeof raw?.token === 'string' ? raw.token : ''
        if (!email || !token) return null

        // Redeeming deletes it, so a replayed grant fails here.
        const granted = await consumeToken('session-grant', email, token)
        if (!granted.ok) return null

        const member = await findByEmail(granted.email)
        if (!member) return null

        return {
          id: String(member.id),
          email: member.email,
          name: member.name,
        }
      },
    }),
  ],
  callbacks: {
    /**
     * Load the member's identity into the token once, at sign-in, rather than
     * reading the database on every request.
     */
    async jwt({ token, user }) {
      if (user?.email) {
        const member = await findByEmail(user.email)
        if (member) {
          token.memberDbId = String(member.id)
          token.accountId = member.account_id
          token.isEmailVerified = Boolean(member.emailVerified)
        }
      }
      return token
    },

    /**
     * Copy it onto the session, so route guards and per-member reads have an id
     * that came from the server and never one supplied by the client.
     */
    async session({ session, token }) {
      if (session.user) {
        session.user.id = (token.memberDbId as string) ?? ''
        session.user.accountId = (token.accountId as string | null) ?? null
        session.user.isEmailVerified = Boolean(token.isEmailVerified)
      }
      return session
    },
  },
  trustHost: true,
}

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig)
