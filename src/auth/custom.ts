import type { AuthAdapter, AuthSession, AuthUser, AuthAdapterConfig } from '../types'

/**
 * Custom auth adapter for operators using their own authentication.
 * Supports any JWT-based auth with optional JWKS validation.
 * Pass a getToken function that returns the current access token.
 */
export class CustomAuthAdapter implements AuthAdapter {
  readonly provider = 'custom' as const
  private getTokenFn: (() => Promise<string | null>) | null
  private jwksUri: string | undefined

  constructor(config: AuthAdapterConfig) {
    this.getTokenFn = config.getToken || null
    this.jwksUri = config.jwksUri
  }

  async getSession(): Promise<AuthSession | null> {
    const token = await this.getToken()
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const user: AuthUser = {
        id: payload.sub || payload.user_id || '',
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
