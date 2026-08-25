'use client'

/**
 * Form primitive. Every `<form>` in the app goes through this one.
 *
 * It exists for a single reason: **`noValidate` is always on.**
 *
 * Without it the browser runs its own constraint validation first — a
 * `type="email"` field with a malformed value pops the native bubble
 * ("Please include an '@' in the email address"), which is worded by the
 * browser, styled by the browser, positioned over the next field, and differs
 * on every browser. Worse, it *cancels submit*: our `onSubmit` never runs, so
 * the messages this app is supposed to show never render at all.
 *
 * This app validates in the feature's `validation.ts` and renders the result
 * under the field through `FormField` / `FieldError` — red, 12px, alert icon.
 * The native layer can only contradict that, never add to it.
 *
 * `noValidate` used to be set per form, which meant it could be forgotten — and
 * on two of six forms it was. Routing every form through this component removes
 * the flag from the call sites, so there is nothing left to forget. Note it is
 * applied *after* `{...props}`: it is deliberately not overridable.
 *
 * Input `type` attributes stay as they are — `type="email"` and `type="tel"`
 * still earn the right mobile keyboard. Only the browser's *validation* is off.
 */

import { forwardRef } from 'react'
import type { FormHTMLAttributes } from 'react'

export const Form = forwardRef<HTMLFormElement, FormHTMLAttributes<HTMLFormElement>>(
  function Form({ children, ...props }, ref) {
    return (
      <form ref={ref} {...props} noValidate>
        {children}
      </form>
    )
  },
)
