/**
 * Auth form validation.
 *
 * Pure functions over form values — no React, no DOM — matching the pattern in
 * `features/flight-builder/validation`. Each returns a structured error object
 * the form renders as inline field messages, so the rules live in one testable
 * place rather than inside components.
 *
 * Copy is taken from the frames where the frames state it. Where they do not —
 * empty fields, malformed email, mismatched confirmation — the design is silent,
 * so the wording here is marked CONFIRM: and is a one-line change once the
 * client rules on it.
 */

import { passwordProblem } from './config/authConfig'

/**
 * Deliberately permissive: shape only, no attempt to guess deliverability.
 * The server is the authority on whether an address exists.
 */
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/

export interface SignInErrors {
  email?: string
  password?: string
}

export interface ResetRequestErrors {
  email?: string
}

export interface NewPasswordErrors {
  password?: string
  confirm?: string
}

/** CONFIRM: not stated on any frame. */
const MSG = {
  emailRequired: 'Enter your email address.',
  emailInvalid: 'Enter a valid email address.',
  passwordRequired: 'Enter your password.',
  confirmRequired: 'Re-enter your new password.',
  confirmMismatch: 'Both passwords need to match.',
} as const

export function validateEmail(email: string): string | undefined {
  const value = email.trim()
  if (!value) return MSG.emailRequired
  if (!EMAIL_RE.test(value)) return MSG.emailInvalid
  return undefined
}

/** Sign in (frame 30). Password is checked for presence only — the server
 *  decides whether it is correct, and says so via frame 32's variants. */
export function validateSignIn(values: { email: string; password: string }): SignInErrors {
  const errors: SignInErrors = {}
  const email = validateEmail(values.email)
  if (email) errors.email = email
  if (!values.password) errors.password = MSG.passwordRequired
  return errors
}

/** Create account (frame 33). Same as sign-in plus the password rule, since
 *  this is where a password is chosen rather than recalled. */
export function validateSignUp(values: { email: string; password: string }): SignInErrors {
  const errors: SignInErrors = {}
  const email = validateEmail(values.email)
  if (email) errors.email = email
  if (!values.password) {
    errors.password = MSG.passwordRequired
  } else {
    // Names the missing requirement rather than restating the whole rule.
    // Assigned only when there is one: `isClean` counts keys, so setting
    // `password: undefined` would block the form with nothing to show.
    const problem = passwordProblem(values.password)
    if (problem) errors.password = problem
  }
  return errors
}

/** Reset request (frame 37). */
export function validateResetRequest(email: string): ResetRequestErrors {
  const message = validateEmail(email)
  return message ? { email: message } : {}
}

/** Set new password (frame 38). The rule text is the same constant printed
 *  under the field, so the stated rule and the enforced rule cannot diverge. */
export function validateNewPassword(values: {
  password: string
  confirm: string
}): NewPasswordErrors {
  const errors: NewPasswordErrors = {}
  if (!values.password) errors.password = MSG.passwordRequired
  else {
    const problem = passwordProblem(values.password)
    if (problem) errors.password = problem
  }

  if (!values.confirm) errors.confirm = MSG.confirmRequired
  else if (values.password && values.confirm !== values.password) {
    errors.confirm = MSG.confirmMismatch
  }
  return errors
}

/** True when a structured error object carries nothing. */
export function isClean(errors: object): boolean {
  return Object.keys(errors).length === 0
}
