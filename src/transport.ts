/**
 * HiveChatTransport — AI SDK compatible ChatTransport
 *
 * Plugs into the Vercel AI SDK's `useChat` hook via the `transport` option.
 * Routes all chat requests through the Bagdock marketplace API's centralised
 * agent brain (/api/v1/hive/chat/stream), authenticated via embed or
 * restricted key.
 *
 * @example
 * ```tsx
 * import { useChat } from 'ai/react'
 * import { HiveChatTransport } from '@bagdock/hive'
 *
 * const transport = new HiveChatTransport({
 *   apiKey: 'ek_live_...',
 *   baseUrl: 'https://api.bagdock.com', // or ngrok URL for local dev
 * })
 *
 * function Chat() {
 *   const { messages, input, handleSubmit } = useChat({ transport })
 *   // ...
 * }
 * ```
 */

import type { AuthAdapter } from './types'
import { scrubMessagesForModel } from '@bagdock/pii-patterns'

export interface HiveChatTransportConfig {
  apiKey: string
  baseUrl?: string
  operatorId?: string
  authAdapter?: AuthAdapter
  /** Extra headers to send with every request */
  headers?: Record<string, string>
  /** Contact ID for authenticated users */
  contactId?: string
  /** User display name (passed to agent for personalisation) */
  userName?: string
  /** Page context for search awareness (city, coordinates, filters, etc.) */
  searchContext?: Record<string, unknown>
  /** Custom fetch function (for testing or polyfills) */
  fetch?: typeof globalThis.fetch
}

const DEFAULT_BASE_URL = 'https://api.bagdock.com'

function resolveBaseUrl(explicit?: string): string {
  if (explicit) return explicit.replace(/\/$/, '')
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).process !== 'undefined') {
    const envUrl = (globalThis as any).process?.env?.BAGDOCK_API_URL
    if (envUrl) return envUrl.replace(/\/$/, '')
  }
  return DEFAULT_BASE_URL
}

export class HiveChatTransport {
  private config: Required<Pick<HiveChatTransportConfig, 'apiKey'>> & HiveChatTransportConfig
  private baseUrl: string
  private sessionId: string | undefined
  private currentAgent: string | undefined
  private fetchFn: typeof globalThis.fetch

  constructor(config: HiveChatTransportConfig) {
    this.config = config
    this.baseUrl = resolveBaseUrl(config.baseUrl)
    this.fetchFn = config.fetch || globalThis.fetch.bind(globalThis)
  }

  /** The current session ID, set after the first streamed response */
  getSessionId(): string | undefined {
    return this.sessionId
  }

  /** The specialist agent handling the current session */
  getCurrentAgent(): string | undefined {
    return this.currentAgent
  }

  /**
   * Called by the AI SDK's useChat hook for each chat round.
   * Sends messages to the Hive Chat endpoint and returns the streaming response.
   */
  async submitMessages({
    messages,
    headers: userHeaders,
    body: userBody,
    signal,
  }: {
    chatId: string
    messages: Array<{ id: string; role: string; content: string; parts?: unknown[]; createdAt?: Date; [key: string]: unknown }>
    headers?: Record<string, string>
    body?: Record<string, unknown>
    signal?: AbortSignal
  }): Promise<Response> {
    const url = `${this.baseUrl}/api/v1/hive/chat/stream`

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'User-Agent': '@bagdock/hive/0.3.0',
      ...this.config.headers,
      ...userHeaders,
    }

    if (this.config.operatorId) {
      headers['X-Bagdock-Operator-Id'] = this.config.operatorId
    }

    if (this.config.contactId) {
      headers['X-Bagdock-Contact-Id'] = this.config.contactId
    }

    if (this.config.userName) {
      headers['X-Bagdock-User-Name'] = this.config.userName
    }

    if (this.config.authAdapter) {
      try {
        const userToken = await this.config.authAdapter.getToken()
        if (userToken) {
          headers['X-Bagdock-User-Token'] = userToken
        }
      } catch {
        // Auth adapter failed — continue without user token
      }
    }

    const scrubbedMessages = scrubMessagesForModel(messages)
    const { messages: _, ...safeUserBody } = userBody ?? {}

    const requestBody = {
      ...safeUserBody,
      messages: scrubbedMessages,
      sessionId: this.sessionId,
      currentAgent: this.currentAgent,
      searchContext: this.config.searchContext,
    }

    const response = await this.fetchFn(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(requestBody),
      signal,
    })

    if (!response.ok) {
      const errorBody = await response.json().catch(() => ({})) as Record<string, any>
      throw new Error(
        errorBody?.error?.message || `Hive Chat returned ${response.status}`,
      )
    }

    // Extract metadata from the stream to track session/agent state.
    // We wrap the response to intercept metadata lines without consuming the stream.
    const originalBody = response.body
    if (!originalBody) return response

    const self = this
    const reader = originalBody.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    const transformed = new ReadableStream({
      async pull(controller) {
        const { done, value } = await reader.read()
        if (done) {
          controller.close()
          return
        }

        const chunk = decoder.decode(value, { stream: true })
        buffer += chunk

        // Scan for metadata in the stream (AI SDK messageMetadata format)
        // Pattern: f:{"messageMetadata":{"sessionId":"...","agent":"..."}}
        const metaMatch = buffer.match(/f:\{[^}]*"sessionId"\s*:\s*"([^"]+)"/)
        if (metaMatch?.[1]) {
          self.sessionId = metaMatch[1]
        }
        const agentMatch = buffer.match(/f:\{[^}]*"agent"\s*:\s*"([^"]+)"/)
        if (agentMatch?.[1]) {
          self.currentAgent = agentMatch[1]
        }

        // Keep buffer small — only retain last 500 chars for pattern matching
        if (buffer.length > 1000) {
          buffer = buffer.slice(-500)
        }

        controller.enqueue(value)
      },
      cancel() {
        reader.cancel()
      },
    })

    return new Response(transformed, {
      status: response.status,
      statusText: response.statusText,
      headers: response.headers,
    })
  }
}
