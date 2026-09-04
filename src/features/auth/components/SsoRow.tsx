'use client'

/**
 * The third-party sign-in row from frames 30 and 32.
 *
 * The design draws three buttons — Google · Apple · Email Link — but Google and
 * Apple are out of Phase One and the client asked for them **hidden**, not
 * greyed (29 Aug). Only Email Link remains, and it is the magic-link flow,
 * which IS in Milestone 1. See `SSO_PROVIDERS` for the distinction between
 * `visible` and `enabled`.
 *
 * Two consequences of hiding rather than disabling, both handled here:
 *
 *  - **The grid can no longer be `grid-cols-3`.** One button in a three-column
 *    grid renders at a third of the width with two empty cells beside it,
 *    which looks like a layout fault rather than a deliberate omission. The
 *    column count follows the number actually rendered.
 *  - **With none visible the whole block goes**, divider included. "or continue
 *    with" above an empty space is worse than no divider at all.
 */

import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'
import { VISIBLE_SSO_PROVIDERS, type SsoProvider } from '../config/authConfig'

interface SsoRowProps {
  /**
   * Offer the sign-in link.
   *
   * False on sign-up, and deliberately. The flow signs you into an account
   * that already exists — frame 34's own copy is "The link signs you straight
   * in" — so on the account-creation screen it has nothing to sign you into.
   * Someone with no account clicked it, was told to check their inbox, and
   * waited for a mail that is never sent, because answering differently for an
   * unknown address would reveal which addresses are registered.
   *
   * Sign-up already has a complete email-and-password path, so nothing is lost.
   * A registered member who lands on the wrong screen has "Sign In" beneath the
   * form. Reverse this only alongside passwordless sign-up, which needs a
   * `created_via` value the payload contract does not yet define.
   */
  showEmailLink?: boolean
  /**
   * Where "Email Link" goes. Renders as a real anchor rather than a button.
   *
   * This is the fix for a defect the client measured at 4 working clicks in 11.
   * The control was a `type="button"` with only an `onClick`, which is inert
   * until React hydrates — a click in that window did nothing at all, silently.
   *
   * Making it a submit button with `formAction` was not enough: with scripts
   * disabled the native post works, but once React's runtime has loaded its root
   * listener catches the submit, calls preventDefault, and never replays it if
   * the component is not yet interactive. Measured 4 in 25 with real clicks.
   *
   * An anchor sidesteps the race rather than trying to win it. Navigation is the
   * browser's job and React does not intercept it, so the control works before
   * scripts load, during hydration, and after. It always did for the "Trouble
   * signing in?" link in the footer, which points at the same screen.
   */
  emailLinkHref?: string
  /** The link request is in flight: spinner on that button, the row inert. */
  emailLinkPending?: boolean
  /**
   * Something else on the screen is submitting — the password sign-in, usually.
   * The row goes inert without claiming the work is happening here.
   */
  busy?: boolean
}

export function SsoRow({
  showEmailLink = true,
  emailLinkHref,
  emailLinkPending = false,
  busy = false,
}: SsoRowProps) {
  const providers = VISIBLE_SSO_PROVIDERS.filter(
    (p) => p.id !== 'email-link' || showEmailLink,
  )
  // With nothing left to show, the divider would introduce an empty space.
  if (providers.length === 0) return null

  return (
    <div className="flex w-full flex-col gap-6">
      <div
        className="grid gap-[10px]"
        style={{ gridTemplateColumns: `repeat(${providers.length}, minmax(0, 1fr))` }}
      >
        {providers.map((p) => (
          <SsoButton
            key={p.id}
            provider={p}
            href={p.id === 'email-link' ? emailLinkHref : undefined}
            loading={p.id === 'email-link' && emailLinkPending}
            busy={busy || emailLinkPending}
          />
        ))}
      </div>
      <div className="flex items-center gap-[15.75px]">
        <span className="h-px flex-1 bg-[#EAEAEA]" />
        <span className="whitespace-nowrap font-sans text-[12px] font-medium leading-[1.33] text-black/50">
          {/*
            Was "or continue with", which made sense when Google and Apple sat
            above it. With those gone the only thing above is the sign-in link
            and the only thing below is the password form, so the old wording
            introduced the wrong half of the screen.
          */}
          or sign in with your password
        </span>
        <span className="h-px flex-1 bg-[#EAEAEA]" />
      </div>
    </div>
  )
}

function SsoButton({
  provider,
  href,
  loading = false,
  busy = false,
}: {
  provider: SsoProvider
  href?: string
  loading?: boolean
  busy?: boolean
}) {
  const disabled = !provider.enabled || busy

  // 40 tall, #98C3E1 hairline on a 20%-opacity wash, radius 12 — per the frame.
  // The frame's 14/18 padding overflows the 376-wide mobile card and wraps
  // "Email Link" onto two lines; the artboard keeps all three on one line.
  const shell = cn(
    'flex h-10 items-center justify-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20',
    'py-[10px] font-sans text-[14px] font-medium leading-[1.14] text-black transition-colors',
    'px-2 lg:pl-[14px] lg:pr-[18px]',
    'whitespace-nowrap relative no-underline',
    disabled ? 'cursor-not-allowed' : 'hover:bg-[#CFE3F1]/40',
    disabled && !loading && 'opacity-45',
  )

  const inner = (
    <>
      {loading && (
        <span
          className="absolute h-4 w-4 animate-spin rounded-full border-2 border-current/30 border-t-current"
          aria-hidden="true"
        />
      )}
      <span className={cn('inline-flex items-center gap-2', loading && 'opacity-0')}>
        <ProviderMark id={provider.id} />
        <span>{provider.label}</span>
      </span>
    </>
  )

  /*
    An anchor when it has somewhere to go. Navigation is the browser's job, so
    this works before scripts load, during hydration and after — which a button
    with an onClick does not. See `emailLinkHref` for the measurements.

    `aria-disabled` rather than `disabled`, which anchors do not support; the
    click is also stopped so a busy row cannot be navigated out of.
  */
  if (href) {
    return (
      <a
        href={href}
        aria-disabled={disabled || undefined}
        onClick={disabled ? (e) => e.preventDefault() : undefined}
        className={cn(shell, 'focus-ring')}
      >
        {inner}
      </a>
    )
  }

  return (
    <button
      type="button"
      disabled={disabled}
      // "Coming soon" belongs only to a provider that is genuinely out of
      // scope, never to one that is merely busy.
      title={!provider.enabled ? 'Coming soon' : undefined}
      className={shell}
    >
      {inner}
    </button>
  )
}

/** Brand marks are drawn inline so the page stays self-contained. */
function ProviderMark({ id }: { id: SsoProvider['id'] }) {
  if (id === 'email-link') return <Icon name="mail" size={16} />
  if (id === 'apple') {
    return (
      <svg viewBox="0 0 24 24" width={16} height={16} fill="currentColor" aria-hidden="true">
        <path d="M16.4 12.8c0-2.2 1.8-3.3 1.9-3.4-1-1.5-2.6-1.7-3.2-1.7-1.4-.1-2.7.8-3.3.8-.7 0-1.7-.8-2.8-.8-1.5 0-2.8.8-3.6 2.1-1.5 2.6-.4 6.5 1.1 8.7.7 1 1.6 2.2 2.7 2.2 1.1 0 1.5-.7 2.8-.7 1.3 0 1.6.7 2.8.7 1.2 0 1.9-1.1 2.6-2.1.8-1.2 1.2-2.4 1.2-2.4s-2.2-.9-2.2-3.4ZM14.3 6.3c.6-.7 1-1.7.9-2.7-.9 0-2 .6-2.6 1.3-.6.6-1.1 1.7-.9 2.6 1 .1 2-.5 2.6-1.2Z" />
      </svg>
    )
  }
  // Google's four-colour mark.
  return (
    <svg viewBox="0 0 24 24" width={16} height={16} aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.2a5.3 5.3 0 0 1-2.3 3.5v2.9h3.7c2.2-2 3.4-5 3.4-8.6Z"
      />
      <path
        fill="#34A853"
        d="M12 23.5c3.1 0 5.7-1 7.6-2.8l-3.7-2.9c-1 .7-2.3 1.1-3.9 1.1-3 0-5.5-2-6.4-4.7H1.8v3A11.5 11.5 0 0 0 12 23.5Z"
      />
      <path
        fill="#FBBC05"
        d="M5.6 14.2a6.9 6.9 0 0 1 0-4.4v-3H1.8a11.5 11.5 0 0 0 0 10.4l3.8-3Z"
      />
      <path
        fill="#EA4335"
        d="M12 5.1c1.7 0 3.2.6 4.4 1.7l3.3-3.3A11.5 11.5 0 0 0 1.8 6.8l3.8 3c.9-2.7 3.4-4.7 6.4-4.7Z"
      />
    </svg>
  )
}
