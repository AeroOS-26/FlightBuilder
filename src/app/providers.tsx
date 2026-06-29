'use client'

/**
 * App-wide client providers.
 *
 * Composes the data-fetching layer (TanStack Query). The QueryClient is created
 * once per browser session via useState so it is not shared across requests on
 * the server.
 *
 * The active brand is applied server-side on <html> in the root layout (no
 * flash); this also re-asserts it on mount as a safety net and as the seam for
 * runtime brand switching later.
 */

import { useEffect, useState, type ReactNode } from 'react'
import { QueryClientProvider } from '@tanstack/react-query'
import { createQueryClient } from '@/api/queryClient'
import { applyBrand, defaultBrand } from '@/theme/brand'

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => createQueryClient())

  useEffect(() => {
    applyBrand(defaultBrand)
  }, [])

  return (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
}
