// ============================================================================
// CONFIGURATION
// ============================================================================

export interface BagdockHiveConfig {
  /** API key: embed key (ek_*), restricted key (rk_*), or legacy operator key (hk_*) */
  apiKey: string
  /** API base URL. Falls back to BAGDOCK_API_URL env var, then https://api.bagdock.com */
  baseUrl?: string
  maxRetries?: number
  timeoutMs?: number
  auth?: AuthAdapterConfig
}

export type AuthProvider = 'stytch' | 'clerk' | 'auth0' | 'custom'

export interface AuthAdapterConfig {
  provider: AuthProvider
  clientId?: string
  domain?: string
  jwksUri?: string
  getToken?: () => Promise<string | null>
}

// ============================================================================
// AUTH
// ============================================================================

export interface AuthUser {
  id: string
  email?: string
  name?: string
  metadata?: Record<string, unknown>
}

export interface AuthSession {
  user: AuthUser
  accessToken: string
  expiresAt?: string
}

export interface AuthAdapter {
  readonly provider: AuthProvider
  getSession(): Promise<AuthSession | null>
  getToken(): Promise<string | null>
  onSessionChange?(callback: (session: AuthSession | null) => void): () => void
}

// ============================================================================
// EMBED TOKENS (legacy — use unified keys for new integrations)
// ============================================================================

export interface EmbedToken {
  id: string
  operatorId: string
  token: string
  scopes: EmbedScope[]
  expiresAt: string
  createdAt: string
}

export type EmbedScope =
  | 'chat'
  | 'rental'
  | 'access'
  | 'billing'
  | 'units'
  | 'profile'
  | 'loyalty'

export interface CreateEmbedTokenParams {
  scopes: EmbedScope[]
  expiresInSeconds?: number
  metadata?: Record<string, unknown>
}

export interface ValidateTokenResult {
  valid: boolean
  operatorId?: string
  scopes?: EmbedScope[]
  expiresAt?: string
}

// ============================================================================
// CHAT
// ============================================================================

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: string
  parts?: ChatMessagePart[]
  metadata?: Record<string, unknown>
}

export interface ChatMessagePart {
  type: string
  text?: string
  toolName?: string
  toolCallId?: string
  state?: string
  input?: unknown
  output?: unknown
}

export interface ChatSession {
  id: string
  messages: ChatMessage[]
  agentRole?: string
  status?: string
  createdAt: string
  updatedAt: string
}

// ============================================================================
// UNITS & RENTAL
// ============================================================================

export interface HiveUnit {
  id: string
  name: string
  type: string
  width: number
  depth: number
  height?: number
  pricePerMonth: number
  currency: string
  status: 'available' | 'occupied' | 'reserved' | 'maintenance'
  features?: string[]
}

export interface RentalParams {
  unitId: string
  moveInDate: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  addOns?: string[]
}

export interface RentalResult {
  id: string
  status: 'confirmed' | 'pending' | 'failed'
  checkoutUrl?: string
  subscriptionId?: string
}

/** @deprecated Use RentalParams instead */
export type BookingParams = RentalParams
/** @deprecated Use RentalResult instead */
export type BookingResult = RentalResult

// ============================================================================
// ACCESS
// ============================================================================

export interface AccessCode {
  id: string
  code: string
  unitId: string
  validFrom: string
  validUntil?: string
  type: 'pin' | 'qr' | 'nfc'
}

// ============================================================================
// SDK RESPONSE
// ============================================================================

export interface ListResponse<T> {
  data: T[]
  hasMore: boolean
  total?: number
}

export interface ListParams {
  limit?: number
  after?: string
  before?: string
}

// ============================================================================
// ERRORS
// ============================================================================

export type HiveErrorCode =
  | 'request_failed'
  | 'server_error'
  | 'network_error'
  | 'timeout'
  | 'unknown_error'
  // Auth errors
  | 'unauthorized'
  | 'key_expired'
  | 'key_revoked'
  | 'scope_insufficient'
  | 'origin_not_allowed'
  | 'rate_limited'
  // Request errors
  | 'invalid_request'
  | 'not_found'
  | 'conflict'

export class BagdockHiveError extends Error {
  readonly status: number
  readonly code: HiveErrorCode | string
  readonly requestId?: string

  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message)
    this.name = 'BagdockHiveError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }

  get isAuthError(): boolean {
    return this.status === 401 || this.status === 403
  }

  get isRateLimited(): boolean {
    return this.status === 429 || this.code === 'rate_limited'
  }

  get isRetryable(): boolean {
    return this.status >= 500 || this.code === 'network_error' || this.code === 'timeout'
  }
}

// ============================================================================
// KEY HELPERS
// ============================================================================

export type HiveKeyType = 'embed' | 'restricted' | 'legacy' | 'unknown'

/** Detect key type from prefix: ek_* → embed, rk_* → restricted, hk_* → legacy */
export function detectKeyType(key: string): HiveKeyType {
  if (key.startsWith('ek_')) return 'embed'
  if (key.startsWith('rk_')) return 'restricted'
  if (key.startsWith('hk_')) return 'legacy'
  return 'unknown'
}

/** Check if the key is a test/sandbox key */
export function isTestKey(key: string): boolean {
  return key.startsWith('ek_test_') || key.startsWith('rk_test_')
}

/** Check if the key is a live/production key */
export function isLiveKey(key: string): boolean {
  return key.startsWith('ek_live_') || key.startsWith('rk_live_')
}
