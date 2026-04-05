// ============================================================================
// CONFIGURATION
// ============================================================================

export interface BagdockHiveConfig {
  apiKey: string
  baseUrl?: string
  maxRetries?: number
  timeoutMs?: number
  auth?: AuthAdapterConfig
}

export type AuthProvider = 'stytch' | 'clerk' | 'auth0' | 'custom'

export interface AuthAdapterConfig {
  provider: AuthProvider
  /** For Clerk: publishable key; for Auth0: client ID; for custom: JWKS URI */
  clientId?: string
  /** For Auth0: domain (e.g., my-app.us.auth0.com) */
  domain?: string
  /** For custom JWKS auth: the JWKS endpoint URL */
  jwksUri?: string
  /** For custom auth: function that returns the current access token */
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
// EMBED TOKENS
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
  | 'booking'
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
  createdAt: string
  updatedAt: string
}

// ============================================================================
// UNITS & BOOKING
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

export interface BookingParams {
  unitId: string
  moveInDate: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  addOns?: string[]
}

export interface BookingResult {
  id: string
  status: 'confirmed' | 'pending' | 'failed'
  checkoutUrl?: string
  subscriptionId?: string
}

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

export class BagdockHiveError extends Error {
  readonly status: number
  readonly code: string
  readonly requestId?: string

  constructor(message: string, status: number, code: string, requestId?: string) {
    super(message)
    this.name = 'BagdockHiveError'
    this.status = status
    this.code = code
    this.requestId = requestId
  }
}
