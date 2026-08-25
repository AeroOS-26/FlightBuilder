/**
 * The result card — frames 34, 35, 36 and 37B.
 *
 * All four are the same object with different contents, so it is built once:
 * a 44px badge over a title and body, an optional bordered help box, and a
 * stack of actions. From frame 36 (1612:28898) and confirmed against the others:
 *   card        rgba(255,255,255,0.6), radius 20, padding 50, gap 16
 *   badge       44 square, radius 12, white, shadow 0 16px 40px -8px rgba(16,154,81,.2)
 *   title       Inter Display 500 / 24 · body Inter Tight 400 / 14 at 70%
 *   help box    white on rgba(168,168,168,0.2), radius 12, padding 16
 *   secondary   rgba(207,227,241,0.2) on #98C3E1, radius 12
 *
 * The badge glyph differs: a green tick on the confirmation screens (35, 36,
 * 37B) and an envelope on the magic link (34).
 */

import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'
import { Icon } from '@/components/common'

interface AuthResultCardProps {
  title: string
  /** Body copy — a node so the address can be emphasised. */
  body: ReactNode
  badge?: 'check' | 'mail'
  /** The "Didn't get the email?" checklist. Omit to drop the box entirely. */
  helpTitle?: string
  helpItems?: ReactNode[]
  /** Primary action — pass a <ResendAction /> where the frame resends. */
  primary?: ReactNode
  /** Text link directly under the primary, inside the help box (frame 34). */
  primaryLink?: { label: string; href: string }
  /** Secondary buttons. Two share a row, as on frame 34. */
  secondary?: Array<{ label: string; href: string }>
  /** Small print under the actions (frames 34 and 35). */
  footnote?: ReactNode
  /** Sits between the primary and the secondary — the "or" on frame 35. */
  actionsDivider?: ReactNode
}

export function AuthResultCard({
  title,
  body,
  badge = 'check',
  helpTitle,
  helpItems,
  primary,
  primaryLink,
  secondary,
  footnote,
  actionsDivider,
}: AuthResultCardProps) {
  const hasHelp = Boolean(helpTitle && helpItems?.length)

  return (
    <div className="flex w-full flex-col gap-4 rounded-[20px] bg-white/60 p-6 sm:p-[50px]">
      <header className="flex flex-col items-center gap-[30px]">
        <span
          className={cn(
            'flex size-11 items-center justify-center rounded-[12px] bg-white',
            badge === 'check' ? 'text-[#109A51]' : 'text-[#0A1B49]',
          )}
          style={{ boxShadow: '0px 16px 40px -8px rgba(16, 154, 81, 0.2)' }}
        >
          <Icon name={badge === 'check' ? 'check' : 'mail'} size={24} strokeWidth={2.5} />
        </span>
        <div className="flex flex-col items-center gap-[6px]">
          <h1 className="text-center font-heading text-[24px] font-medium leading-[1.21] text-black">
            {title}
          </h1>
          <p className="max-w-[399px] text-center font-sans text-[14px] font-normal leading-[1.3] text-black/70">
            {body}
          </p>
        </div>
      </header>

      {hasHelp && (
        <div className="flex flex-col gap-4 rounded-[12px] border border-[#A8A8A8]/20 bg-white p-4">
          <div className="flex flex-col gap-[10px]">
            <p className="font-heading text-[16px] font-medium leading-[1.5] text-black">
              {helpTitle}
            </p>
            <ul className="flex flex-col gap-1">
              {helpItems!.map((item, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="my-1 size-[6px] shrink-0 rounded-full bg-black/70"
                  />
                  <span className="font-sans text-[14px] font-medium leading-[1.43] text-black/70">
                    {item}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <div className="flex flex-col items-center gap-[10px]">
            {primary}
            {primaryLink && (
              <a
                href={primaryLink.href}
                className="font-sans text-[14px] font-semibold leading-[1.14] text-[#0A1B49]"
              >
                {primaryLink.label}
              </a>
            )}
          </div>
        </div>
      )}

      {/* When there is no help box the primary stands on its own. */}
      {!hasHelp && primary}

      {(secondary?.length || footnote || actionsDivider) && (
        <div className="flex flex-col items-center gap-5">
          {actionsDivider}
          {secondary && secondary.length > 0 && (
            <div className="flex w-full flex-col gap-4 sm:flex-row">
              {secondary.map((s) => (
                <a
                  key={s.label}
                  href={s.href}
                  className="flex h-10 flex-1 items-center justify-center gap-2 rounded-[12px] border border-[#98C3E1] bg-[#CFE3F1]/20 px-[14px] py-[10px] font-sans text-[14px] font-medium leading-[1.4] text-black transition-colors hover:bg-[#CFE3F1]/40"
                >
                  {s.label}
                  <Icon name="arrow-right" size={18} />
                </a>
              ))}
            </div>
          )}
          {footnote}
        </div>
      )}
    </div>
  )
}
