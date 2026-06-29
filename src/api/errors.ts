/**
 * Error normalization for the API layer.
 *
 * Every failure that leaves the API layer is shaped into `ApiError`, so the
 * UI can render failure/retry states without inspecting Axios internals.
 */

import axios, { type AxiosError } from 'axios'
import type { ApiError } from '@/types'

/** HTTP statuses worth offering a retry for (transient / server-side). */
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504])

interface BackendErrorBody {
  message?: string
  code?: string
}

export function normalizeError(error: unknown): ApiError {
  if (axios.isAxiosError(error)) {
    return fromAxiosError(error)
  }

  if (error instanceof Error) {
    return { status: 0, message: error.message, retryable: false }
  }

  return {
    status: 0,
    message: 'Something went wrong. Please try again.',
    retryable: false,
  }
}

function fromAxiosError(error: AxiosError<BackendErrorBody>): ApiError {
  // No response => network error, timeout, or request canceled.
  if (!error.response) {
    const isTimeout = error.code === 'ECONNABORTED'
    return {
      status: 0,
      message: isTimeout
        ? 'The request timed out. Please try again.'
        : 'Network error. Check your connection and try again.',
      code: error.code,
      retryable: true,
    }
  }

  const { status, data } = error.response
  return {
    status,
    message: data?.message ?? defaultMessageForStatus(status),
    code: data?.code,
    retryable: RETRYABLE_STATUSES.has(status),
  }
}

function defaultMessageForStatus(status: number): string {
  if (status >= 500) return 'The server ran into a problem. Please try again.'
  if (status === 404) return 'We could not find what you were looking for.'
  if (status === 401 || status === 403) {
    return 'You are not allowed to do that.'
  }
  return 'Something went wrong. Please try again.'
}
