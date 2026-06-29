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

export const metadata: Metadata = {
  title: 'Perro Air · Create a Shared Flight',
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
