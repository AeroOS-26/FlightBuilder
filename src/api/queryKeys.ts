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
} as const
