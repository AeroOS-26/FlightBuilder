/** Dev-only: renders one unrouted M2 screen with mock data. */

import { notFound } from 'next/navigation'
import Link from 'next/link'
import { PREVIEW_SCREENS } from '@/features/public-flight/preview/screens'
import { PreviewScreen } from '@/features/public-flight/preview/PreviewScreens'

export default async function PreviewScreenPage({
  params,
}: {
  params: Promise<{ screen: string }>
}) {
  if (process.env.NODE_ENV !== 'development') notFound()

  const { screen } = await params
  const entry = PREVIEW_SCREENS.find((s) => s.slug === screen)
  if (!entry) notFound()

  return (
    <div className="min-h-svh bg-[#F8F8F8]">
      {/* Slim dev bar so it is never mistaken for the real screen chrome. */}
      <div className="flex items-center gap-3 bg-[#112D7C] px-4 py-2 font-sans text-[12px] text-white">
        <Link href="/preview" className="underline">
          ← All screens
        </Link>
        <span className="opacity-80">
          Frame {entry.frame} · {entry.label} · mock data
        </span>
      </div>
      <PreviewScreen slug={screen} />
    </div>
  )
}
