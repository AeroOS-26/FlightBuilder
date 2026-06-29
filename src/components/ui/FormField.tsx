'use client'

/**
 * Form field scaffolding: a small label above a control, with an optional
 * inline error message (red text + alert icon) below it.
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'

interface FieldErrorProps {
  children: ReactNode
  id?: string
  className?: string
}

export function FieldError({ children, id, className }: FieldErrorProps) {
  return (
    <p
      id={id}
      className={cn(
        'flex items-center gap-1 font-sans text-[12px] font-medium leading-4 tracking-normal text-danger-text',
        className,
      )}
    >
      <Icon name="alert" size={12} className="shrink-0 text-danger-text" strokeWidth={2} />
      {children}
    </p>
  )
}

interface FormFieldProps {
  label?: string
  htmlFor?: string
  error?: string
  /** Slot rendered on the right of the label row (e.g. an action). */
  labelAction?: ReactNode
  labelClassName?: string
  className?: string
  children: ReactNode
}

export function FormField({
  label,
  htmlFor,
  error,
  labelAction,
  labelClassName,
  className,
  children,
}: FormFieldProps) {
  return (
    <div className={cn('flex flex-col', className)}>
      {(label || labelAction) && (
        <div className="mb-[8px] flex items-center justify-between gap-2">
          {label && (
            <label
              htmlFor={htmlFor}
              className={cn(
                'font-sans text-[12px] font-medium leading-[15px] text-[#000000] lg:leading-[18px]',
                labelClassName,
              )}
            >
              {label}
            </label>
          )}
          {labelAction}
        </div>
      )}
      {children}
      {error && (
        <FieldError
          id={htmlFor ? `${htmlFor}-error` : undefined}
          className="mt-[8.5px]"
        >
          {error}
        </FieldError>
      )}
    </div>
  )
}