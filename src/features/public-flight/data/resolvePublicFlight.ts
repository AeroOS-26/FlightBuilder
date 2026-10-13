/**
 * Share token -> public-safe view. Server-only.
 *
 * The single source of truth for the public read, used by BOTH the read-relay
 * (GET /api/public-flight/[token]) and the server render of /share/[token].
 * Sharing one resolver is what lets the page answer an unknown token with a real
 * 404 status — for link checkers and crawlers — while the relay keeps its
 * existing contract, without the two drifting apart or reading twice.
 *
 * Live Zoho read when ZOHO_PUBLIC_VIEW_URL is configured; otherwise the sample
 * fixture, so local dev and previews work without the endpoint. Either way the
 * result is already public-safe: the live read consumes Zoho's public_view, and
 * the sample path passes through `toPublicView`.
 */

import { isPublicViewConfigured } from '@/config/serverEnv'
import { isDelinked } from './delinkedGroups'
import { fetchGroupPublicView } from './fetchPublicView'
import { resolveGroupByToken } from './sampleGroups'
import { toPublicView } from './toPublicView'
import { groupIdFromSlug } from '../format'
import type { PublicView } from '@/types'

export type ResolvedPublicFlight =
  | { status: 'ok'; flight: PublicView }
  | { status: 'not_found' }
  /** Upstream failed (network, timeout, bad shape) — distinct from not-found. */
  | { status: 'error' }

export async function resolvePublicFlight(
  token: string,
): Promise<ResolvedPublicFlight> {
  /*
   * Test groups taken off their public links, before any read.
   *
   * Answered as not-found rather than with a status of its own: the caller
   * already turns that into the "This flight link isn't available" page with a
   * real 404, which is exactly what Chuck asked these to return.
   *
   * Ahead of the fetch deliberately, so a de-linked group is not read from Zoho
   * at all — nothing about it reaches the public, including the tab title and
   * the link preview, which resolve through this same function.
   *
   * Nothing is deleted and nothing in Zoho is touched. See `delinkedGroups`.
   */
  if (isDelinked(token)) return { status: 'not_found' }

  // Live read when the endpoint is configured. The URL carries the share slug;
  // the endpoint keys on group_id, so we derive one from the other here.
  if (isPublicViewConfigured()) {
    const result = await fetchGroupPublicView(groupIdFromSlug(token))
    if (result.status === 'ok') return { status: 'ok', flight: result.flight }
    if (result.status === 'not_found') return { status: 'not_found' }
    return { status: 'error' }
  }

  // Fallback: sample data behind the same public-safe filter.
  const group = resolveGroupByToken(token)
  if (!group) return { status: 'not_found' }
  return { status: 'ok', flight: toPublicView(group) }
}
