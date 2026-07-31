/**
 * Centralized TanStack Query keys.
 *
 * Keeping keys in one place prevents typos and makes cache invalidation
 * explicit and greppable.
 */

export const queryKeys = {
  locations: {
    all: ['locations'] as const,
    search: (query: string) => ['locations', 'search', query] as const,
  },
  flight: {
    all: ['flight'] as const,
    detail: (id: string) => ['flight', 'detail', id] as const,
  },
  publicFlight: {
    all: ['public-flight'] as const,
    byToken: (token: string) => ['public-flight', token] as const,
  },
} as const
