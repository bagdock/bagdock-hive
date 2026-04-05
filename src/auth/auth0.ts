import type { AuthAdapter, AuthSession, AuthUser, AuthAdapterConfig } from '../types'

/**
 * Auth0 auth adapter.
 * Pass a getToken function that returns the Auth0 access token.
 */
export class Auth0Adapter implements AuthAdapter {
  readonly provider = 'auth0' as const
  private getTokenFn: (() => Promise<string | null>) | null
  private domain: string | undefined

  constructor(config: AuthAdapterConfig) {
    this.getTokenFn = config.getToken || null
    this.domain = config.domain
  }

  async getSession(): Promise<AuthSession | null> {
    const token = await this.getToken()
    if (!token) return null

    try {
      const payload = JSON.parse(atob(token.split('.')[1]))
      const user: AuthUser = {
        id: payload.sub || '',
        email: payload.email,
        name: payload.name || payload.nickname,
        metadata: payload['https://bagdock.com/metadata'],
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
