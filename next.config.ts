import type { NextConfig } from 'next'

/**
 * Dev-only routes are named `page.dev.tsx` and only recognised as pages in
 * development.
 *
 * A `NODE_ENV` check inside the route is not enough: the folder existing makes
 * it a route, so Next still bundles everything it imports. The screen preview
 * pulls in every unrouted M2 screen, which added ~170 kB of first-load JS to a
 * production route that could only ever 404. Leaving the extension out of the
 * production list means those files are not pages at all, and nothing they
 * import reaches the client bundle.
 */
const devPageExtensions = ['dev.tsx', 'dev.ts']
const basePageExtensions = ['tsx', 'ts', 'jsx', 'js']

const nextConfig: NextConfig = {
  reactStrictMode: true,
  pageExtensions:
    process.env.NODE_ENV === 'development'
      ? [...basePageExtensions, ...devPageExtensions]
      : basePageExtensions,
}

export default nextConfig
