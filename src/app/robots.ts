import type { MetadataRoute } from 'next'
import { SEARCH_INDEXING_ENABLED } from '@/config/features'

/**
 * robots.txt — the file §36 settled on.
 *
 * Chuck, 2026-10-23: *"keep the Flight Builder out of search engines until we
 * open."* There was no robots.txt before this; `/robots.txt` answered 404,
 * which a crawler reads as permission to fetch everything.
 *
 * A route rather than a file in `public/`, so the one switch that opens the
 * application — `SEARCH_INDEXING_ENABLED` — governs this and the noindex in the
 * root layout together. A static file would have to be remembered separately,
 * on a day when the thing being remembered is a legal commitment.
 *
 * `disallow: '/'` covers the whole surface rather than naming the Flight
 * Builder's six steps. The reachable set is small today only because every
 * share page answers not-found while the cleared list is empty (§26, §36) — a
 * list of paths would go stale the first time a group is cleared for public
 * use, and would go stale silently.
 *
 * The API routes are inside that block too. They were never going to be
 * indexed, but they are also not worth a crawl budget or a request from a bot.
 */
export default function robots(): MetadataRoute.Robots {
  if (SEARCH_INDEXING_ENABLED) {
    // The day they open. Allow, rather than remove the file: `/robots.txt`
    // returning 404 again would be a deployment that looks like a mistake.
    return { rules: { userAgent: '*', allow: '/' } }
  }

  return { rules: { userAgent: '*', disallow: '/' } }
}
