/**
 * Form-level notice — network failure, an expired link, or "not wired yet".
 *
 * CONFIRM: the frames draw field-level errors (32, 33) and the lock card
 * (32 V3), but no general form-level error state. This is the minimum honest
 * treatment in the existing error language — the same `#D00416` and
 * `rgba(233,106,111,0.1)` the input error state uses — so a failed submit is
 * never silent. Swap it for a designed state if one is added.
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'

interface AuthNoticeProps {
  children: ReactNode
  tone?: 'error' | 'success'
}

export function AuthNotice({ children, tone = 'error' }: AuthNoticeProps) {
  const isError = tone === 'error'
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn(
        'flex w-full items-start gap-2 rounded-[12px] border px-3 py-2.5',
        isError
          ? 'border-danger-text/40 bg-error-input-bg text-danger-text'
          : 'border-[#109A51]/30 bg-[#109A51]/10 text-[#0B6B39]',
      )}
    >
      <Icon
        name={isError ? 'alert' : 'check'}
        size={14}
        strokeWidth={2}
        className="mt-[2px] shrink-0"
      />
      <p className="font-sans text-[12px] font-medium leading-4">{children}</p>
    </div>
  )
}
