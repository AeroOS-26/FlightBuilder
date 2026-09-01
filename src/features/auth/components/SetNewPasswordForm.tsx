'use client'

/**
 * Set your new password — frame 38.
 *
 * Two differences from the other form screens, both taken from the frame rather
 * than assumed:
 *  - the form sits in a real white card (fill #FFFFFF, 10% black hairline,
 *    radius 20). Frames 30 and 33 have no fill on the same container.
 *  - the primary carries a trailing arrow, which "Sign In" does not.
 *
 * The password rule under the first field is rendered from PASSWORD_RULE_TEXT
 * and enforced by isValidPassword, so the stated rule and the checked rule are
 * the same constant.
 */

import { useState } from 'react'
import type { FormEvent } from 'react'
import { Icon } from '@/components/common'
import { Form } from '@/components/ui'
import { FieldError } from '@/components/ui/FormField'
import { PasswordInput } from './PasswordInput'
import { AuthNotice } from './AuthNotice'
import { PASSWORD_RULE_TEXT } from '../config/authConfig'
import { setNewPassword, generalMessage } from '../data/authService'
import { validateNewPassword, isClean, type NewPasswordErrors } from '../validation'

interface SetNewPasswordFormProps {
  /** Shown in the subtitle; the frame addresses the account being reset. */
  email?: string
  /** Single-use reset token from the emailed link. */
  token?: string
}

function FieldLabel({ htmlFor, children }: { htmlFor: string; children: string }) {
  return (
    <label
      htmlFor={htmlFor}
      className="font-sans text-[12px] font-medium leading-[1.21] text-black/90"
    >
      {children}
    </label>
  )
}

export function SetNewPasswordForm({
  email = 'margot@example.com',
  token,
}: SetNewPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [errors, setErrors] = useState<NewPasswordErrors>({})
  const [notice, setNotice] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (pending) return

    setNotice(null)
    // Client-side rules are a courtesy; the server re-checks on consume.
    const found = validateNewPassword({ password, confirm })
    setErrors(found)
    if (!isClean(found)) return

    setPending(true)
    const result = await setNewPassword({ token, email, password, confirm })
    setPending(false)

    if (result.ok) {
      // Frame 38B — the password is already saved by the time it renders.
      window.location.href = `/reset-password/done?email=${encodeURIComponent(email)}`
      return
    }
    setNotice(generalMessage(result.failure))
  }

  function edit(setter: (v: string) => void, key: keyof NewPasswordErrors) {
    return (value: string) => {
      setter(value)
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }))
    }
  }

  return (
    <Form
      onSubmit={handleSubmit}
      className="flex w-full flex-col gap-6 rounded-[20px] border border-black/10 bg-white p-6"
    >
      <div className="flex flex-col gap-6">
        <header className="flex flex-col gap-[6px]">
          <h1 className="font-heading text-[24px] font-medium leading-[1.21] text-black">
            Set your new password
          </h1>
          <p className="font-sans text-[14px] font-normal leading-[1.3] text-black">
            Set new password for {email}.
          </p>
        </header>

        {notice && <AuthNotice>{notice}</AuthNotice>}

        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-[6px]">
            <div className="flex flex-col gap-[6px]">
              <FieldLabel htmlFor="new-password">New Password</FieldLabel>
              <PasswordInput
                id="new-password"
                name="password"
                autoComplete="new-password"
                value={password}
                onChange={(e) => edit(setPassword, 'password')(e.target.value)}
                invalid={Boolean(errors.password)}
                aria-describedby="new-password-rule"
              />
            </div>
            {/* The rule doubles as the error message, so it turns red in place
                rather than adding a second line under the field. */}
            <p
              id="new-password-rule"
              className={
                errors.password
                  ? 'font-sans text-[12px] font-medium leading-[1.21] text-danger-text'
                  : 'font-sans text-[12px] font-medium leading-[1.21] text-black'
              }
            >
              {errors.password ?? PASSWORD_RULE_TEXT}
            </p>
          </div>

          <div className="flex flex-col gap-[6px]">
            <FieldLabel htmlFor="confirm-password">Confirm New Password</FieldLabel>
            <PasswordInput
              id="confirm-password"
              name="confirmPassword"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => edit(setConfirm, 'confirm')(e.target.value)}
              invalid={Boolean(errors.confirm)}
              aria-describedby={errors.confirm ? 'confirm-password-error' : undefined}
            />
            {errors.confirm && (
              <FieldError id="confirm-password-error" className="items-start">
                {errors.confirm}
              </FieldError>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-col items-center gap-[18px]">
        <button
          type="submit"
          disabled={pending}
          className="flex h-10 w-full items-center justify-center gap-2 rounded-[12px] bg-black px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-white transition-colors hover:bg-[#101114] disabled:opacity-60"
        >
          {pending ? 'Updating…' : 'Update password'}
          {!pending && <Icon name="arrow-right" size={18} />}
        </button>
        <p className="font-sans text-[14px] font-normal leading-[1.14] text-[#7D7B7B]">
          {/* Frame 38. Charles's exact string, 29 Aug — it replaces "Your other
              devices stay signed in", which described the behaviour before
              instant revocation and is now the opposite of what happens. */}
          Setting a new password signs you out on all your other devices.
        </p>
      </div>
    </Form>
  )
}
