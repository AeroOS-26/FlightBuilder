'use client'

/**
 * Button primitive.
 *
 * Variants map to semantic tokens so buttons re-theme automatically:
 *   - primary   → the dark, filled CTA ("Continue To Dates")
 *   - secondary → white with a hairline border ("Back to …", "Save & Exit")
 *   - ghost     → text-only
 *
 * Supports a leading/trailing icon and a loading state (spinner + disabled).
 */

import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'
import type { IconName } from '@/components/common'

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  leadingIcon?: IconName
  trailingIcon?: IconName
  /** Custom trailing node (overrides trailingIcon). */
  trailingAdornment?: ReactNode
  loading?: boolean
  fullWidth?: boolean
  children?: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary:
    'bg-[#000000] font-sans text-[14px] font-medium leading-4 tracking-normal text-white hover:bg-[#101114] focus-outline-none',
  secondary:
    'bg-[#F5F5F5] font-sans text-[14px] font-medium leading-4 tracking-normal text-[#000000] border border-[#D0D0D0] hover:bg-[#EFEFEF] focus-outline-none',
  ghost: 'bg-transparent text-muted hover:text-text hover:bg-surface-muted focus-outline-none',
  danger: 'bg-danger text-white hover:bg-danger-hover focus-outline-none',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-[13px] gap-1.5 rounded-[12px]',
  md: 'h-10 min-h-[40px] gap-2 rounded-[12px] px-[14px] py-[10px] font-sans text-[14px] font-medium leading-4',
  lg: 'h-12 px-6 text-[15px] gap-2 rounded-[12px]',
}

export function Button({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  trailingAdornment,
  loading = false,
  fullWidth = false,
  className,
  type = 'button',
  disabled,
  children,
  ...props
}: ButtonProps) {
  const isDisabled = disabled || loading
  return (
    <button
      type={type}
      disabled={isDisabled}
      aria-busy={loading || undefined}
      className={cn(
        'relative inline-flex select-none items-center justify-center font-medium transition-colors duration-150 cursor-pointer',
        'disabled:cursor-not-allowed disabled:opacity-55',
        sizeClasses[size],
        variantClasses[variant],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading && (
        <span
          className="absolute h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          'inline-flex items-center justify-center gap-2',
          loading && 'opacity-0',
        )}
      >
        {leadingIcon && <Icon name={leadingIcon} size={16} />}
        {children}
        {trailingAdornment ??
          (trailingIcon && <Icon name={trailingIcon} size={16} />)}
      </span>
    </button>
  )
}