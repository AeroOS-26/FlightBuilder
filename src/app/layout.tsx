/**
 * Root layout.
 *
 * Server component that renders the <html>/<body> shell, loads the global
 * stylesheet and fonts, applies the active brand via the `data-brand`
 * attribute (so the brand palette is in place on first paint, no flash), and
 * wraps the tree in the app-wide providers.
 *
 * Fonts are loaded with the same Google Fonts link the previous build used, so
 * typography renders identically.
 */

import type { Metadata } from 'next'
import './globals.css'
import { Providers } from './providers'
import { defaultBrand } from '@/theme/brand'
import { SEARCH_INDEXING_ENABLED } from '@/config/features'

export const metadata: Metadata = {
  title: 'Perro Air · Create a Shared Flight',
  /*
   * Set here so it reaches every page without being remembered per route.
   * Next merges metadata field by field down the tree, and no segment sets
   * `robots` — the other exports carry a title and nothing else — so this is
   * the directive on all of them, including the not-found pages that already
   * carry Next's own.
   *
   * See SEARCH_INDEXING_ENABLED for why there is a noindex as well as a
   * robots.txt. Undefined rather than `index: true` when indexing is on: the
   * absence of a directive is what the default is, and asserting it would be a
   * claim about intent on every page.
   */
  robots: SEARCH_INDEXING_ENABLED ? undefined : { index: false, follow: false },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" data-brand={defaultBrand}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter+Tight:ital,wght@0,400;0,500;0,600;0,700&family=Inter:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
