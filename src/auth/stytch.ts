import type { AuthAdapter, AuthSession, AuthUser, AuthAdapterConfig } from '../types'

/**
 * Stytch B2B auth adapter.
 * Reads the session from the Stytch JS SDK's session manager.
 */
export class StytchAdapter implements AuthAdapter {
  readonly provider = 'stytch' as const
  private stytchClient: any

  constructor(_config: AuthAdapterConfig, stytchClient?: any) {
    this.stytchClient = stytchClient
  }

  async getSession(): Promise<AuthSession | null> {
    if (!this.stytchClient) return null
    try {
      const session = this.stytchClient.session.getSync()
      if (!session) return null
      const member = this.stytchClient.member.getSync?.()
      const user: AuthUser = {
        id: session.member_id || member?.member_id || '',
        email: member?.email_address,
        name: member?.name,
      }
      return {
        user,
        accessToken: session.session_token || session.session_jwt || '',
        expiresAt: session.expires_at,
      }
    } catch {
      return null
    }
  }

  async getToken(): Promise<string | null> {
    const session = await this.getSession()
    return session?.accessToken || null
  }
}
