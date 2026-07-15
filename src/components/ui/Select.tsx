'use client'

/**
 * Select primitive — custom dropdown styled to match TextInput.
 *
 * Native <select> is avoided so the list opens with consistent styling and
 * scroll behavior. The menu flips above the field when there isn't room below.
 */

const DROPDOWN_MAX_HEIGHT = 240
const DROPDOWN_GAP = 8

import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type SelectHTMLAttributes,
} from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'

export interface SelectOption {
  value: string
  label: string
}

interface SelectProps extends Omit<SelectHTMLAttributes<HTMLSelectElement>, 'onChange'> {
  options: SelectOption[]
  placeholder?: string
  invalid?: boolean
  onChange?: (event: ChangeEvent<HTMLSelectElement>) => void
}

export const Select = forwardRef<HTMLButtonElement, SelectProps>(function Select(
  {
    options,
    placeholder,
    invalid,
    className,
    value = '',
    id,
    name,
    disabled,
    onChange,
    ...props
  },
  ref,
) {
  const [open, setOpen] = useState(false)
  const [placement, setPlacement] = useState<'bottom' | 'top'>('bottom')
  const [listMaxHeight, setListMaxHeight] = useState(DROPDOWN_MAX_HEIGHT)
  const containerRef = useRef<HTMLDivElement>(null)
  const listId = useId()

  const selected = options.find((opt) => opt.value === value)
  const isPlaceholder = value === '' || value === undefined
  const displayLabel = selected?.label ?? placeholder ?? ''

  useLayoutEffect(() => {
    if (!open) {
      setPlacement('bottom')
      setListMaxHeight(DROPDOWN_MAX_HEIGHT)
      return
    }

    function updatePlacement() {
      const host = containerRef.current
      if (!host) return

      const rect = host.getBoundingClientRect()
      const spaceBelow = window.innerHeight - rect.bottom
      const spaceAbove = rect.top
      const openAbove = spaceBelow < DROPDOWN_MAX_HEIGHT + DROPDOWN_GAP && spaceAbove > spaceBelow

      setPlacement(openAbove ? 'top' : 'bottom')
      const available = (openAbove ? spaceAbove : spaceBelow) - DROPDOWN_GAP
      setListMaxHeight(Math.min(DROPDOWN_MAX_HEIGHT, Math.max(120, available)))
    }

    updatePlacement()
    window.addEventListener('resize', updatePlacement)
    window.addEventListener('scroll', updatePlacement, true)
    return () => {
      window.removeEventListener('resize', updatePlacement)
      window.removeEventListener('scroll', updatePlacement, true)
    }
  }, [open, options.length])

  useEffect(() => {
    if (!open) return

    function handlePointerDown(event: MouseEvent) {
      if (containerRef.current?.contains(event.target as Node)) return
      setOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  function selectValue(next: string) {
    setOpen(false)
    onChange?.({
      target: { value: next, name },
    } as ChangeEvent<HTMLSelectElement>)
  }

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={ref}
        id={id}
        type="button"
        disabled={disabled}
        aria-invalid={invalid || undefined}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          'flex min-h-[40px] w-full items-center justify-between gap-2 rounded-[12px] border py-3 pl-[14px] pr-[14px] text-left font-sans text-[12px] font-medium leading-[18px] transition-colors lg:text-[14px] lg:leading-4',
          'focus:border-accent focus-visible:border-accent focus-visible:outline-none',
          isPlaceholder ? 'text-placeholder' : 'text-[#000000]',
          invalid
            ? 'border-danger-text bg-error-input-bg focus:outline-none focus:ring-0'
            : // Light blue when empty; dark blue once open or a value is chosen.
              cn(
                'bg-white focus:border-accent',
                open || !isPlaceholder ? 'border-accent' : 'border-[#98C3E1]',
              ),
          disabled && 'cursor-not-allowed opacity-60',
          className,
        )}
        {...(props as object)}
      >
        <span className="min-w-0 truncate">{displayLabel}</span>
        <Icon
          name="chevron-down"
          size={18}
          className={cn('shrink-0 text-[#000000]/70 transition-transform', open && 'rotate-180')}
        />
      </button>

      {open && (
        <ul
          id={listId}
          role="listbox"
          aria-labelledby={id}
          style={{ maxHeight: listMaxHeight }}
          className={cn(
            'absolute left-0 right-0 z-50 overflow-y-auto rounded-[12px] bg-white py-1 shadow-[0_8px_24px_rgba(20,22,29,0.12)] scrollbar-none',
            placement === 'bottom' ? 'top-full mt-2' : 'bottom-full mb-2',
          )}
        >
          {options.map((opt) => {
            const active = opt.value === value
            return (
              <li key={opt.value} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => selectValue(opt.value)}
                  className={cn(
                    'flex w-full items-center px-[14px] py-2.5 text-left font-sans text-[14px] font-medium leading-4 text-[#000000] transition-colors hover:bg-[#F7F8FB]',
                    active && 'bg-[#D9E9F7]',
                  )}
                >
                  {opt.label}
                </button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
})
