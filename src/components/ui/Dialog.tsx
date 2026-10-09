'use client'

/**
 * A modal dialog — the project's first, added for the decline confirmation
 * (frame 48B).
 *
 * Built on the native `<dialog>` element rather than a div with a high z-index.
 * `showModal()` gives the things a hand-rolled modal usually gets wrong for
 * free: the rest of the page becomes inert, focus moves into the dialog and is
 * trapped there, Escape closes it, and the backdrop is a real pseudo-element
 * rather than a sibling that has to be kept in sync.
 *
 * Escape is deliberately *not* suppressed. A confirmation whose only exits are
 * its own two buttons is a trap, and the cancelling action here — keeping the
 * request — is the safe one, so dismissing lands on the harmless outcome.
 */

import { useEffect, useRef, type ReactNode } from 'react'
import { Icon } from '@/components/common'

interface DialogProps {
  open: boolean
  /** Called on Escape, on a backdrop click, and by the cancelling button. */
  onClose: () => void
  /** Labels the dialog for assistive tech; rendered as the heading. */
  title: string
  children: ReactNode
  /** The two actions, laid out by the caller so the order stays theirs. */
  actions: ReactNode
}

export function Dialog({ open, onClose, title, children, actions }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)
  const titleId = `${title.replace(/\W+/g, '-').toLowerCase()}-title`

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Guarded both ways: calling showModal on an open dialog throws, and
    // close() on a closed one fires a spurious `close` event.
    if (open && !el.open) el.showModal()
    if (!open && el.open) el.close()
  }, [open])

  if (!open) return null

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onClose={onClose}
      // The backdrop is part of the element, so a click lands on the dialog
      // itself; anything inside stops at the panel below.
      onClick={(event) => {
        if (event.target === ref.current) onClose()
      }}
      className="m-auto w-[min(92vw,698px)] rounded-[20px] border-0 bg-white p-0 backdrop:bg-black/50"
    >
      <div className="flex flex-col gap-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-heading text-[20px] font-semibold text-[#000000]">
            {title}
          </h2>
          {/* The frame gives the dialog its own close control rather than
              relying on Escape and the backdrop alone. */}
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex size-10 shrink-0 items-center justify-center rounded-[12px] border border-[#D0D0D0] bg-[#F5F5F5] text-[#000000] transition-colors hover:bg-[#EDEDED] focus-ring"
          >
            <Icon name="close" className="size-[18px]" />
          </button>
        </div>
        <div className="font-sans text-[14px] font-medium leading-[1.5] text-[#000000]">
          {children}
        </div>
        <div className="flex gap-4">{actions}</div>
      </div>
    </dialog>
  )
}
