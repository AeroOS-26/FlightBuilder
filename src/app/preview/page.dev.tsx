/**
 * Dev-only index of the public screens no route renders. See
 * `features/public-flight/preview/PreviewScreens.tsx` for why they exist.
 */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PREVIEW_SCREENS } from '@/features/public-flight/preview/screens'

export default function PreviewIndex() {
  if (process.env.NODE_ENV !== 'development') notFound()

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-[760px] flex-col gap-6 px-6 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="font-heading text-[24px] font-semibold text-[#000000]">
          Screen preview
        </h1>
        <p className="font-sans text-[14px] leading-[1.5] text-[#000000]/70">
          The M2 public screens that exist as components but are not wired to a route.
          Development only. Every screen below renders with mock data.
        </p>
      </header>

      <ul className="flex flex-col gap-2">
        {PREVIEW_SCREENS.map((s) => (
          <li key={s.slug}>
            <Link
              href={`/preview/${s.slug}`}
              className="flex items-center gap-4 rounded-[12px] border border-[#A8A8A8]/25 bg-white px-4 py-3 transition-colors hover:bg-[#CFE3F1]/20 focus-ring"
            >
              <span className="w-12 shrink-0 font-sans text-[13px] font-semibold text-[#112D7C]">
                {s.frame}
              </span>
              <span className="font-sans text-[14px] text-[#000000]">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-2 rounded-[12px] bg-[#CFE3F1]/30 p-4">
        <p className="font-sans text-[13px] font-semibold uppercase text-[#112D7C]">
          Already routed
        </p>
        <p className="font-sans text-[14px] leading-[1.5] text-[#112D7C]">
          Forming, Filling, Group Full and Not-found are live at{' '}
          <code>/share/M2-FORMING-001</code>, <code>M2-FILLING-001</code>,{' '}
          <code>M2-FULL-001</code> and any unknown token. The six group-detail screens are
          at <code>/group/202609-SFO-LAX-ABC123?as=organizer|joiner&amp;state=forming|filling|filled</code>.
        </p>
      </section>
    </main>
  )
}
