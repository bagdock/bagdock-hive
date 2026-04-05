import type { AuthAdapter, AuthAdapterConfig, AuthProvider } from '../types'
import { StytchAdapter } from './stytch'
import { ClerkAdapter } from './clerk'
import { Auth0Adapter } from './auth0'
import { CustomAuthAdapter } from './custom'

export function createAuthAdapter(config: AuthAdapterConfig): AuthAdapter {
  switch (config.provider) {
    case 'stytch':
      return new StytchAdapter(config)
    case 'clerk':
      return new ClerkAdapter(config)
    case 'auth0':
      return new Auth0Adapter(config)
    case 'custom':
      return new CustomAuthAdapter(config)
    default:
      throw new Error(`Unsupported auth provider: ${(config as any).provider}`)
  }
}

export { StytchAdapter } from './stytch'
export { ClerkAdapter } from './clerk'
export { Auth0Adapter } from './auth0'
export { CustomAuthAdapter } from './custom'
