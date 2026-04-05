import type { HttpClient } from '../client'
import type { EmbedToken, CreateEmbedTokenParams, ValidateTokenResult, ListResponse } from '../types'

export class EmbedTokens {
  constructor(private client: HttpClient) {}

  async create(params: CreateEmbedTokenParams): Promise<EmbedToken> {
    return this.client.request('POST', '/api/v1/operator/hive/embed-tokens', params)
  }

  async validate(token: string): Promise<ValidateTokenResult> {
    return this.client.request('POST', '/api/v1/operator/hive/embed-tokens/validate', { token })
  }

  async revoke(tokenId: string): Promise<{ success: boolean }> {
    return this.client.request('DELETE', `/api/v1/operator/hive/embed-tokens/${tokenId}`)
  }

  async list(params?: { limit?: number }): Promise<ListResponse<EmbedToken>> {
    return this.client.request('GET', '/api/v1/operator/hive/embed-tokens', undefined, {
      limit: params?.limit,
    })
  }
}
