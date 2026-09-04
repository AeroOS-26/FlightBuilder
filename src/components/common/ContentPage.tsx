/**
 * Shared shell for the public content pages — terms, privacy, support, and the
 * 404.
 *
 * These are linked from sign-up, reset and the auth shell footer, and none of
 * them existed — every link bounced to /signin, which meant sign-up asked
 * people to agree to two documents they could not open.
 *
 * The pages are deliberately honest about their state. Inventing terms or a
 * privacy policy would be worse than an empty route: a plausible-looking
 * document that nobody has approved is a liability, and on a charter product
 * the wording is the client's attorney's to write, not ours. So the routes
 * resolve, the layout is real, and the body says plainly that the text is
 * pending and gives a way to ask for it.
 *
 * Replace the `children` of each page with the supplied copy when it arrives.
 * Nothing else needs to change.
 */

// Imported by file rather than through the barrel: this component lives in the
// barrel too, and going through it would be a cycle.
import { BrokerDisclosureFooter } from './BrokerDisclosureFooter'
import { Logo } from './Logo'
import { env } from '@/config/env'
import type { ReactNode } from 'react'

export function ContentPage({
  title,
  intro,
  children,
}: {
  title: string
  intro: string
  children?: ReactNode
}) {
  return (
    <div className="flex min-h-svh flex-col bg-[#F8F8F8]">
      <header className="border-b border-[#EDEDED] bg-white">
        <div className="mx-auto flex h-16 w-full max-w-[1440px] items-center px-4 sm:px-6 lg:px-[50px]">
          <a
            href={env.marketingSiteUrl}
            aria-label="Perro Air home"
            className="focus-ring rounded-md"
          >
            <Logo />
          </a>
        </div>
      </header>

      <main className="flex-1 px-4 py-10 sm:px-6 lg:px-[50px] lg:py-16">
        <article className="mx-auto flex w-full max-w-[720px] flex-col gap-5">
          <h1 className="font-heading text-[28px] font-medium leading-[1.2] text-black">
            {title}
          </h1>
          <p className="font-sans text-[15px] leading-[1.6] text-black/70">{intro}</p>
          {children}
          <p className="mt-2 font-sans text-[14px] leading-[1.6] text-black/60">
            Questions in the meantime? Email{' '}
            <a
              href="mailto:hello@perroair.com"
              className="font-medium text-black underline underline-offset-2"
            >
              hello@perroair.com
            </a>
            .
          </p>
          <p>
            <a
              href="/signin"
              className="font-sans text-[14px] font-medium text-[#0A1B49] underline underline-offset-2"
            >
              Back to sign in
            </a>
          </p>
        </article>
      </main>

      <BrokerDisclosureFooter />
    </div>
  )
}
