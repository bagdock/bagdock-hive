import { HttpClient } from './client'
import { createAuthAdapter } from './auth'
import { Chat } from './resources/chat'
import { Units } from './resources/units'
import { Access } from './resources/access'
import { EmbedTokens } from './resources/embed-tokens'
import type { BagdockHiveConfig, AuthAdapter } from './types'

/**
 * Bagdock Hive SDK
 *
 * Embeddable AI-powered storage management platform with pluggable auth.
 * Supports embed keys (ek_*), restricted keys (rk_*), and legacy operator keys.
 *
 * @example
 * ```ts
 * // With an embed key (client-side)
 * const hive = new BagdockHive({
 *   apiKey: 'ek_live_...',
 * })
 *
 * // With Clerk auth
 * const hive = new BagdockHive({
 *   apiKey: 'ek_live_...',
 *   auth: { provider: 'clerk', getToken: () => getToken() },
 * })
 *
 * // Scoped to a specific operator
 * const ops = hive.forOperator('opreg_abc123')
 * const units = await ops.units.list({ status: 'available' })
 *
 * // Local dev with ngrok
 * const hive = new BagdockHive({
 *   apiKey: 'ek_test_...',
 *   baseUrl: 'https://abc123.ngrok.io',
 * })
 * ```
 */
export class BagdockHive {
  readonly chat: Chat
  readonly units: Units
  readonly access: Access
  readonly embedTokens: EmbedTokens

  private readonly _client: HttpClient
  private readonly _config: BagdockHiveConfig

  constructor(config: BagdockHiveConfig) {
    this._config = config

    let authAdapter: AuthAdapter | undefined
    if (config.auth) {
      authAdapter = createAuthAdapter(config.auth)
    }

    this._client = new HttpClient({
      apiKey: config.apiKey,
      baseUrl: config.baseUrl,
      maxRetries: config.maxRetries,
      timeoutMs: config.timeoutMs,
      authAdapter,
    })

    this.chat = new Chat(this._client)
    this.units = new Units(this._client)
    this.access = new Access(this._client)
    this.embedTokens = new EmbedTokens(this._client)
  }

  /** The resolved base URL the SDK is connecting to */
  get baseUrl(): string {
    return this._client.baseUrl
  }

  /**
   * Returns a scoped client for a specific operator.
   * All requests will include the X-Bagdock-Operator-Id header.
   */
  forOperator(operatorId: string): BagdockHive {
    const scopedClient = this._client.withOperatorId(operatorId)
    const instance = Object.create(BagdockHive.prototype) as BagdockHive
    ;(instance as any)._config = this._config
    ;(instance as any)._client = scopedClient
    ;(instance as any).chat = new Chat(scopedClient)
    ;(instance as any).units = new Units(scopedClient)
    ;(instance as any).access = new Access(scopedClient)
    ;(instance as any).embedTokens = new EmbedTokens(scopedClient)
    return instance
  }

  /**
   * Returns a client with a custom auth adapter attached.
   * Used when auth needs to be set after construction.
   */
  withAuth(authAdapter: AuthAdapter): BagdockHive {
    const authedClient = this._client.withAuth(authAdapter)
    const instance = Object.create(BagdockHive.prototype) as BagdockHive
    ;(instance as any)._config = this._config
    ;(instance as any)._client = authedClient
    ;(instance as any).chat = new Chat(authedClient)
    ;(instance as any).units = new Units(authedClient)
    ;(instance as any).access = new Access(authedClient)
    ;(instance as any).embedTokens = new EmbedTokens(authedClient)
    return instance
  }
}

// Transport for AI SDK useChat integration
export { HiveChatTransport } from './transport'
export type { HiveChatTransportConfig } from './transport'

// Re-export types
export { BagdockHiveError, detectKeyType, isTestKey, isLiveKey } from './types'
export type {
  BagdockHiveConfig,
  AuthProvider,
  AuthAdapterConfig,
  AuthAdapter,
  AuthUser,
  AuthSession,
  EmbedToken,
  EmbedScope,
  CreateEmbedTokenParams,
  ValidateTokenResult,
  ChatMessage,
  ChatMessagePart,
  ChatSession,
  HiveUnit,
  RentalParams,
  RentalResult,
  BookingParams,
  BookingResult,
  AccessCode,
  ListResponse,
  ListParams,
  HiveKeyType,
  HiveErrorCode,
} from './types'

// Re-export auth adapters
export { createAuthAdapter, StytchAdapter, ClerkAdapter, Auth0Adapter, CustomAuthAdapter } from './auth'

// Re-export PII scrubbing from @bagdock/pii-patterns for consumer convenience
export { scrubPii, scrubPiiDeep, scrubMessagesForModel } from '@bagdock/pii-patterns'
