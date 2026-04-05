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
   * Stream a chat response. Returns a ReadableStream of server-sent events.
   * Use this for real-time AI responses.
   */
  async stream(sessionId: string, message: string): Promise<Response> {
    const url = new URL(
      `/api/v1/hive/chat/sessions/${sessionId}/stream`,
      (this.client as any).config?.baseUrl || 'https://api.bagdock.com',
    )

    return fetch(url.toString(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ content: message }),
    })
  }
}
