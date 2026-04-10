import type { HttpClient } from '../client'
import type { ChatSession, ChatMessage, ListResponse } from '../types'

export class Chat {
  constructor(private client: HttpClient) {}

  async create(initialMessage?: string): Promise<ChatSession> {
    return this.client.request('POST', '/api/v1/hive/chat/sessions', {
      message: initialMessage,
    })
  }

  async get(sessionId: string): Promise<ChatSession> {
    return this.client.request('GET', `/api/v1/hive/chat/sessions/${sessionId}`)
  }

  async send(sessionId: string, message: string): Promise<ChatMessage> {
    return this.client.request('POST', `/api/v1/hive/chat/sessions/${sessionId}/messages`, {
      content: message,
    })
  }

  async list(params?: { limit?: number; after?: string }): Promise<ListResponse<ChatSession>> {
    return this.client.request('GET', '/api/v1/hive/chat/sessions', undefined, {
      limit: params?.limit,
      after: params?.after,
    })
  }

  /**
   * Stream a chat response. Returns a raw Response with proper auth headers.
   * The response body is an AI SDK–compatible UI message stream.
   *
   * @example
   * ```ts
   * const response = await hive.chat.stream(sessionId, messages)
   * // response.body is a ReadableStream of server-sent events
   * ```
   */
  async stream(
    messages: Array<{ role: string; content: string; [key: string]: unknown }>,
    options?: {
      sessionId?: string
      currentAgent?: string
      sessionCost?: number
      searchContext?: Record<string, unknown>
    },
  ): Promise<Response> {
    return this.client.rawRequest('POST', '/api/v1/hive/chat/stream', {
      messages,
      sessionId: options?.sessionId,
      currentAgent: options?.currentAgent,
      sessionCost: options?.sessionCost,
      searchContext: options?.searchContext,
    })
  }
}
