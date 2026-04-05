import type { HttpClient } from '../client'
import type { AccessCode, ListResponse } from '../types'

export class Access {
  constructor(private client: HttpClient) {}

  async getCodes(unitId: string): Promise<ListResponse<AccessCode>> {
    return this.client.request('GET', `/api/v1/hive/access/units/${unitId}/codes`)
  }

  async unlock(accessPointId: string): Promise<{ success: boolean; message?: string }> {
    return this.client.request('POST', `/api/v1/hive/access/points/${accessPointId}/unlock`)
  }

  async getHistory(unitId: string, params?: { limit?: number }): Promise<ListResponse<{
    id: string
    eventType: string
    accessPointName: string
    status: 'granted' | 'denied' | 'error'
    timestamp: string
  }>> {
    return this.client.request('GET', `/api/v1/hive/access/units/${unitId}/history`, undefined, {
      limit: params?.limit,
    })
  }
}
