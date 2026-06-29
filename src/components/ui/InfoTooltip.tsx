'use client'

/**
 * Info icon with a hover/focus tooltip (Figma dark navy popover).
 */

import { useId, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface InfoTooltipProps {
  children: ReactNode
  className?: string
}

const panelClass =
  'rounded-[8px] bg-[#000000] px-3 py-2 font-sans text-[12px] font-medium leading-4 text-white shadow-pop md:px-4 md:py-3 md:text-[14px] md:leading-[18px]'

/** Nudge arrow right so it sits under the icon center (Figma). */
const ARROW_OFFSET_X = 6

function TooltipArrow({ left }: { left: number }) {
  return (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-[5px] h-0 w-0 border-x-[7px] border-b-[7px] border-x-transparent border-b-[#000000]"
      style={{ left, transform: 'translateX(-50%)' }}
    />
  )
}

function TooltipTrigger({
  id,
  open,
  iconRef,
  show,
  hide,
}: {
  id: string
  open: boolean
  iconRef: React.RefObject<HTMLButtonElement | null>
  show: () => void
  hide: () => void
}) {
  return (
    <button
      ref={iconRef}
      type="button"
      aria-describedby={open ? id : undefined}
      className="inline-flex shrink-0 rounded-full focus-ring"
      onFocus={show}
      onBlur={hide}
    >
      <img src="/svg/infogrey.svg" alt="" aria-hidden="true" className="size-[18px]" />
      <span className="sr-only">More information</span>
    </button>
  )
}

function useIconAnchoredTooltip(columnRef: React.RefObject<HTMLElement | null>) {
  const [open, setOpen] = useState(false)
  const id = useId()
  const iconRef = useRef<HTMLButtonElement>(null)
  const iconWrapRef = useRef<HTMLSpanElement>(null)
  const [layout, setLayout] = useState({ panelWidth: 0, arrowLeft: 9 })

  function updateLayout() {
    if (!iconWrapRef.current) return
    const iconWrap = iconWrapRef.current.getBoundingClientRect()
    const column = columnRef.current?.getBoundingClientRect()
    const columnRight = column?.right ?? iconWrap.right
    const viewportRight = window.innerWidth - 24
    const maxRight = Math.min(columnRight, viewportRight)
    const icon = iconRef.current?.getBoundingClientRect()
    const iconCenter = icon
      ? icon.left - iconWrap.left + icon.width / 2
      : iconWrap.width / 2
    setLayout({
      panelWidth: Math.max(0, maxRight - iconWrap.left),
      arrowLeft: iconCenter + ARROW_OFFSET_X,
    })
  }

  function show() {
    setOpen(true)
  }

  function hide() {
    setOpen(false)
  }

  useLayoutEffect(() => {
    if (!open) return
    updateLayout()
    window.addEventListener('resize', updateLayout)
    return () => window.removeEventListener('resize', updateLayout)
  }, [open])

  return { open, id, iconRef, iconWrapRef, layout, show, hide }
}

function IconAnchoredTooltipPanel({
  id,
  open,
  iconRef,
  iconWrapRef,
  layout,
  show,
  hide,
  children,
}: {
  id: string
  open: boolean
  iconRef: React.RefObject<HTMLButtonElement | null>
  iconWrapRef: React.RefObject<HTMLSpanElement | null>
  layout: { panelWidth: number; arrowLeft: number }
  show: () => void
  hide: () => void
  children: ReactNode
}) {
  return (
    <span
      ref={iconWrapRef}
      className="relative inline-flex shrink-0 align-middle"
      onMouseEnter={show}
      onMouseLeave={hide}
    >
      <TooltipTrigger id={id} open={open} iconRef={iconRef} show={show} hide={hide} />
      {open && layout.panelWidth > 0 && (
        <div className="absolute left-0 top-full z-30 pt-2" style={{ width: layout.panelWidth }}>
          <span id={id} role="tooltip" className={cn('relative block', panelClass)}>
            <TooltipArrow left={layout.arrowLeft} />
            <span className="relative block text-left">{children}</span>
          </span>
        </div>
      )}
    </span>
  )
}

/** Tooltip below the info icon; panel extends right within the heading column. */
export function SubHeadingInfoTooltip({
  title,
  tooltip,
  description,
}: {
  title: ReactNode
  tooltip: ReactNode
  description?: ReactNode
}) {
  const columnRef = useRef<HTMLDivElement>(null)
  const { open, id, iconRef, iconWrapRef, layout, show, hide } =
    useIconAnchoredTooltip(columnRef)

  return (
    <div ref={columnRef} className="relative min-w-0 flex-1">
      <div className="flex items-center gap-1.5">
        {title}
        <IconAnchoredTooltipPanel
          id={id}
          open={open}
          iconRef={iconRef}
          iconWrapRef={iconWrapRef}
          layout={layout}
          show={show}
          hide={hide}
        >
          {tooltip}
        </IconAnchoredTooltipPanel>
      </div>
      {description && (
        <p className="mt-1.5 font-sans text-[12px] font-medium leading-[18px] text-[#000000]/70 md:text-[14px] md:leading-4">
          {description}
        </p>
      )}
    </div>
  )
}

/** Inline tooltip anchored below the icon. */
export function InfoTooltip({ children, className }: InfoTooltipProps) {
  const columnRef = useRef<HTMLSpanElement>(null)
  const { open, id, iconRef, iconWrapRef, layout, show, hide } =
    useIconAnchoredTooltip(columnRef)

  return (
    <span ref={columnRef} className={cn('relative inline-flex align-middle', className)}>
      <IconAnchoredTooltipPanel
        id={id}
        open={open}
        iconRef={iconRef}
        iconWrapRef={iconWrapRef}
        layout={layout}
        show={show}
        hide={hide}
      >
        {children}
      </IconAnchoredTooltipPanel>
    </span>
  )
}