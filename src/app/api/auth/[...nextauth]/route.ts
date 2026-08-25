/**
 * Auth.js route handler — /api/auth/*
 *
 * Sign-in, sign-out, callback and session all pass through here. Nothing
 * AeroOS-specific lives in this file; the configuration is in
 * `features/auth/server/auth.ts`.
 */

import { handlers } from '@/features/auth/server/auth'

export const { GET, POST } = handlers
