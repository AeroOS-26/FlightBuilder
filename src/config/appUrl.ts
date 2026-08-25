import 'server-only'

/**
 * The origin to build emailed links from — verification, password reset and
 * magic link all point back at this.
 *
 * It was duplicated in three route handlers, each falling back to
 * `http://localhost:3000`. That fallback is the dangerous part: on a deployment
 * with `NEXT_PUBLIC_APP_URL` unset, every email still **sends successfully** and
 * every link in it is dead. Nothing errors, nothing logs, and the failure only
 * shows up when a real person clicks.
 *
 * Precedence, and why:
 *
 *  1. `NEXT_PUBLIC_APP_URL` — an explicit answer always wins. This is what
 *     production sets, to the real domain.
 *  2. `VERCEL_BRANCH_URL` — the stable per-branch preview host. Preferred over
 *     VERCEL_URL because it does not change when the branch is redeployed, so a
 *     link already sitting in someone's inbox keeps working.
 *  3. `VERCEL_URL` — the per-deployment host. Correct but short-lived.
 *  4. localhost, for local development.
 *
 * Server-only: `VERCEL_BRANCH_URL` and `VERCEL_URL` have no NEXT_PUBLIC_ prefix
 * and so are absent from the browser bundle. Calling this from a Client
 * Component would silently return localhost in production, which is exactly the
 * bug this file exists to prevent.
 */
export function appUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (explicit) return explicit.replace(/\/$/, '')

  // Vercel supplies these without a scheme.
  const vercelHost = process.env.VERCEL_BRANCH_URL || process.env.VERCEL_URL
  if (vercelHost) return `https://${vercelHost.replace(/\/$/, '')}`

  return 'http://localhost:3000'
}
