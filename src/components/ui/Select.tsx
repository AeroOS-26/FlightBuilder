'use client'

/**
 * Select primitive — custom dropdown styled to match TextInput.
 *
 * Native <select> is avoided so the list opens with consistent styling and
 * scroll behavior. The menu flips above the field when there isn't room below.
 */

const DROPDOWN_MAX_HEIGHT = 240
const DROPDOWN_GAP = 8

/**
 * How long a run of keystrokes counts as one search before it starts again.
 *
 * Matches what a native <select> does, which is the behaviour this control
 * threw away by not being one: with 250 nationalities on frame 42 there is no
 * other way to reach "Switzerland" than scrolling to it.
 */
const TYPEAHEAD_RESET_MS = 700

import {
  forwardRef,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  // Aliased: the bare name would shadow the DOM KeyboardEvent, which the
  // document-level Escape listener below is typed against.
  type KeyboardEvent as ReactKeyboardEvent,
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
  const listRef = useRef<HTMLUListElement>(null)
  const listId = useId()

  /** Keystrokes typed inside the reset window, lower-cased. */
  const typeahead = useRef('')
  const typeaheadTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

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

  // Clear the pending reset if the field unmounts mid-search.
  useEffect(
    () => () => {
      if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current)
    },
    [],
  )

  /**
   * Keep the chosen option in view while the list is open.
   *
   * Typing jumps the value, and without this the selection moves somewhere
   * below the fold and the list looks like it did nothing.
   */
  useEffect(() => {
    if (!open) return
    const host = listRef.current
    if (!host) return
    host
      .querySelector<HTMLElement>(`[data-value="${CSS.escape(String(value))}"]`)
      ?.scrollIntoView({ block: 'nearest' })
  }, [open, value])

  /**
   * The option a run of keystrokes points at.
   *
   * Prefix match on the label, so "ind" reaches India. One letter pressed
   * repeatedly steps through everything starting with it instead of sticking
   * on the first — again, what the native control did.
   */
  function optionForKeystrokes(buffer: string): SelectOption | undefined {
    const repeated = buffer.length > 1 && new Set(buffer).size === 1
    const needle = repeated ? buffer.slice(0, 1) : buffer
    const matches = options.filter((opt) => opt.label.toLowerCase().startsWith(needle))
    if (matches.length === 0) return undefined
    if (!repeated) return matches[0]
    const current = matches.findIndex((opt) => opt.value === value)
    return matches[(current + 1) % matches.length]
  }

  function handleTypeahead(event: ReactKeyboardEvent<HTMLButtonElement>) {
    // Printable characters only. Tab, Enter, Escape, the arrows and every
    // browser shortcut pass through untouched.
    if (event.key.length !== 1 || event.metaKey || event.ctrlKey || event.altKey) return
    // Space still opens and closes the field, unless a search is already under
    // way — "united k" needs it, an idle field does not.
    if (event.key === ' ' && typeahead.current === '') return

    event.preventDefault()

    if (typeaheadTimer.current) clearTimeout(typeaheadTimer.current)
    typeaheadTimer.current = setTimeout(() => {
      typeahead.current = ''
    }, TYPEAHEAD_RESET_MS)

    typeahead.current += event.key.toLowerCase()
    const match = optionForKeystrokes(typeahead.current)
    // No match leaves the field alone rather than clearing it: a digit typed
    // into a list of countries should do nothing, not undo the answer.
    if (!match) return

    // The list stays open so the search can be refined; a closed field takes
    // the value without opening, which is how a native select behaves.
    selectValue(match.value, { keepOpen: open })
  }

  function selectValue(next: string, { keepOpen = false }: { keepOpen?: boolean } = {}) {
    if (!keepOpen) setOpen(false)
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
        // After the spread deliberately: typing must not be overridden by a
        // caller's own handler, and no caller passes one today.
        onKeyDown={handleTypeahead}
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
          ref={listRef}
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
                  data-value={opt.value}
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
