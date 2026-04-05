import type { HttpClient } from '../client'
import type { HiveUnit, BookingParams, BookingResult, ListResponse, ListParams } from '../types'

export class Units {
  constructor(private client: HttpClient) {}

  async list(params?: ListParams & { status?: string; facilityId?: string }): Promise<ListResponse<HiveUnit>> {
    return this.client.request('GET', '/api/v1/hive/units', undefined, {
      limit: params?.limit,
      after: params?.after,
      status: params?.status,
      facility_id: params?.facilityId,
    })
  }

  async get(unitId: string): Promise<HiveUnit> {
    return this.client.request('GET', `/api/v1/hive/units/${unitId}`)
  }

  async book(params: BookingParams): Promise<BookingResult> {
    return this.client.request('POST', '/api/v1/hive/bookings', params)
  }
}
