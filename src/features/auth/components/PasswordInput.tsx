'use client'

/**
 * Password field with the reveal toggle shown on frames 30, 32, 38 and 38B.
 *
 * Wraps the shared TextInput rather than restyling one, so the auth screens
 * inherit the same border, focus and invalid treatment as the rest of the app.
 * The toggle is a real button: it is reachable by keyboard and announces which
 * state it will switch to, which a bare icon would not.
 */

import { forwardRef, useId, useState } from 'react'
import type { InputHTMLAttributes } from 'react'
import { TextInput } from '@/components/ui'
import { Icon } from '@/components/common'

interface PasswordInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  invalid?: boolean
}

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ invalid, ...props }, ref) {
    const [visible, setVisible] = useState(false)
    const labelId = useId()

    return (
      <TextInput
        ref={ref}
        type={visible ? 'text' : 'password'}
        invalid={invalid}
        autoComplete="current-password"
        endAdornment={
          <button
            type="button"
            id={labelId}
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? 'Hide password' : 'Show password'}
            aria-pressed={visible}
            className="pointer-events-auto text-[#000000]/45 transition-colors hover:text-[#000000]/70"
          >
            <Icon name={visible ? 'eye-off' : 'eye'} size={18} />
          </button>
        }
        {...props}
      />
    )
  },
)
