/**
 * Central Axios instance for the Flight Builder.
 *
 * This is the single transport boundary between the app and the backend.
 * Interceptors handle cross-cutting concerns (auth headers, error
 * normalization) so individual services and components stay thin.
 *
 * Nothing in this file knows about the UI. Keep it that way.
 */

import axios, {
  AxiosError,
  type AxiosInstance,
  type InternalAxiosRequestConfig,
} from 'axios'
import { env } from '@/config/env'
import { normalizeError } from './errors'

export const apiClient: AxiosInstance = axios.create({
  baseURL: env.apiBaseUrl,
  timeout: env.apiTimeoutMs,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
})

/**
 * Request interceptor.
 * Attach auth / correlation headers here. Auth is out of scope for the
 * Flight Builder itself, so this is a seam the next module can fill in.
 */
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Placeholder for auth token injection once auth lands:
    // const token = getAuthToken()
    // if (token) config.headers.Authorization = `Bearer ${token}`
    return config
  },
  (error: unknown) => Promise.reject(normalizeError(error)),
)

/**
 * Response interceptor.
 * Pass successful responses through untouched; normalize every failure into
 * a single `ApiError` shape so the UI never has to branch on Axios internals.
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => Promise.reject(normalizeError(error)),
)
