import type { AuthAdapter, AuthSession, AuthUser, AuthAdapterConfig } from '../types'

/**
 * Clerk auth adapter.
 * Uses Clerk's `useAuth()` / `getToken()` pattern for session management.
 * Pass the Clerk instance or a getToken function.
 */
export class ClerkAdapter implements AuthAdapter {
  readonly provider = 'clerk' as const
  private getTokenFn: (() => Promise<string | null>) | null

  constructor(config: AuthAdapterConfig) {
    this.getTokenFn = config.getToken || null
  }

  async getSession(): Promise<AuthSession | null> {
    const token = await this.getToken()
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const user: AuthUser = {
        id: payload.sub || '',
        email: payload.email,
        name: payload.name,
        metadata: payload.metadata,
      }
      return {
        user,
        accessToken: token,
        expiresAt: payload.exp ? new Date(payload.exp * 1000).toISOString() : undefined,
      }
    } catch {
      return { user: { id: '' }, accessToken: token }
    }
  }

  async getToken(): Promise<string | null> {
    if (this.getTokenFn) return this.getTokenFn()
    return null
  }
}
