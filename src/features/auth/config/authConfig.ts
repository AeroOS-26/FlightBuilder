/**
 * Auth constants — the single place the M1 rules live.
 *
 * Every value here is taken from the hi-fi rather than invented, so the copy on
 * screen and the behaviour behind it cannot drift apart.
 *
 * The three link flows have THREE DIFFERENT lifetimes. They are stated on the
 * frames themselves and are not interchangeable:
 *   magic link          15 minutes  frame 34 "works for the next 15 minutes"
 *   email verification  24 hours    frame 36 "works for the next 24 hours"
 *   password reset      60 minutes  frames 37/37B "Valid for 60 minutes"
 * Each screen renders its own number from the value below, so a copy change and
 * a behaviour change are always the same edit.
 */

/** Magic-link sign-in token lifetime (frame 34). */
export const MAGIC_LINK_TTL_MINUTES = 15

/** Email-verification token lifetime (frame 36). */
export const EMAIL_VERIFICATION_TTL_MINUTES = 24 * 60

/** Password-reset token lifetime (frames 37, 37B). */
export const PASSWORD_RESET_TTL_MINUTES = 60

/**
 * Account lockout — frame 32 variant 3.
 *
 * CONFIRM: the frame draws the locked state and its recovery action, but the
 * client has not specified a threshold, a duration, or whether a completed reset
 * clears the lock. These are working values, kept here rather than in the
 * database so a decision is one edit. A successful reset does clear it, which is
 * what "Reset your password" on the frame implies.
 */
export const LOCKOUT_THRESHOLD = 5
export const LOCKOUT_MINUTES = 15

/**
 * Lifetime of the one-time grant that signs a member in straight after they
 * click their verification link.
 *
 * Deliberately tiny. It is issued and redeemed inside a single request, so it
 * never needs to survive longer than that — and because the credentials
 * callback it feeds is a public endpoint, a short window is what keeps a leaked
 * grant worthless. One minute is generous cover for a slow round trip.
 */
export const SESSION_GRANT_TTL_MINUTES = 1

/** Minimum password length, per the rule printed under the field. */
export const PASSWORD_MIN_LENGTH = 8

/**
 * The password policy, expressed exactly once.
 *
 * Every screen and every endpoint that cares about password strength goes
 * through this list — sign-up, the reset form, `/api/register` and
 * `/api/reset-password` — so the rule shown to a person, the rule the form
 * enforces, and the rule the server re-checks cannot drift apart. Tightening
 * the policy means editing this array and nothing else.
 *
 * Raised on 25 Aug from "8+ characters, letters and numbers" to the full
 * composition set at the client's request.
 */
interface PasswordRule {
  /** True when the value satisfies this requirement. */
  test: (value: string) => boolean
  /** Named as the missing piece, so it reads as "Password needs …". */
  missing: string
}

const PASSWORD_RULES: PasswordRule[] = [
  { test: (v) => v.length >= PASSWORD_MIN_LENGTH, missing: `${PASSWORD_MIN_LENGTH} characters` },
  { test: (v) => /[A-Z]/.test(v), missing: 'an uppercase letter' },
  { test: (v) => /[a-z]/.test(v), missing: 'a lowercase letter' },
  { test: (v) => /\d/.test(v), missing: 'a number' },
  // Anything that is not a letter or a digit counts, including spaces — a
  // passphrase should not be refused for using the obvious separator.
  { test: (v) => /[^A-Za-z0-9]/.test(v), missing: 'a special character' },
]

/**
 * Human-readable rule — rendered as the field hint AND enforced above. Frame 38
 * prints this under the first field and turns it red on error, so it has to fit
 * one line.
 */
export const PASSWORD_RULE_TEXT =
  '8+ characters, with upper and lower case, a number and a symbol.'

export function isValidPassword(value: string): boolean {
  return PASSWORD_RULES.every((rule) => rule.test(value))
}

/** Joins as "a, b and c" — an English list, not a comma-separated dump. */
function listPhrase(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`
}

/**
 * What is actually missing from this password, or null when nothing is.
 *
 * Preferred over restating the whole rule at someone who has met four of the
 * five parts: "Password needs a special character." tells them what to change,
 * where the full rule makes them re-read and compare. Derived from the same
 * array as the predicate, so the two can never disagree.
 */
export function passwordProblem(value: string): string | null {
  const missing = PASSWORD_RULES.filter((rule) => !rule.test(value)).map((r) => r.missing)
  return missing.length === 0 ? null : `Password needs ${listPhrase(missing)}.`
}

/**
 * Third-party sign-in providers shown on frames 30 and 32.
 *
 * PENDING CLIENT DECISION: Google and Apple appear in the hi-fi but are not in
 * the Milestone 1 scope, task list, or backend list — OAuth, the Apple Developer
 * Program, and account linking against Zoho's email dedup key are all
 * unestimated. They render disabled until the scope question is answered, so the
 * screens match the design without promising a flow that does not exist yet.
 * Flip `enabled` once confirmed; nothing else needs to change.
 */
export interface SsoProvider {
  id: 'google' | 'apple' | 'email-link'
  label: string
  enabled: boolean
}

export const SSO_PROVIDERS: SsoProvider[] = [
  { id: 'google', label: 'Google', enabled: false },
  { id: 'apple', label: 'Apple', enabled: false },
  // The email link IS in scope for M1 — it is the magic-link flow (frames 33/34).
  { id: 'email-link', label: 'Email Link', enabled: true },
]
