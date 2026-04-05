import { BagdockHiveError } from './types'
import type { AuthAdapter } from './types'

const DEFAULT_BASE_URL = 'https://api.bagdock.com'
const DEFAULT_TIMEOUT = 30_000
const DEFAULT_MAX_RETRIES = 3

export interface ClientConfig {
  apiKey: string
  baseUrl: string
  maxRetries: number
  timeoutMs: number
  operatorId?: string
  authAdapter?: AuthAdapter
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class HttpClient {
  private config: ClientConfig

  constructor(config: Partial<ClientConfig> & { apiKey: string }) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: (config.baseUrl || DEFAULT_BASE_URL).replace(/\/$/, ''),
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT,
      operatorId: config.operatorId,
      authAdapter: config.authAdapter,
    }
  }

  withOperatorId(operatorId: string): HttpClient {
    return new HttpClient({ ...this.config, operatorId })
  }

  withAuth(authAdapter: AuthAdapter): HttpClient {
    return new HttpClient({ ...this.config, authAdapter })
  }

  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const url = new URL(path, this.config.baseUrl)
    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined) url.searchParams.set(k, String(v))
      }
    }

    let lastError: Error | null = null
    const maxAttempts = method === 'GET' ? this.config.maxRetries : 1

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (attempt > 0) await sleep(Math.min(1000 * 2 ** attempt, 8000))

      const controller = new AbortController()
      const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

      try {
        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.config.apiKey}`,
          'User-Agent': '@bagdock/hive/0.1.0',
        }

        if (this.config.operatorId) {
          headers['X-Bagdock-Operator-Id'] = this.config.operatorId
        }

        if (this.config.authAdapter) {
          const userToken = await this.config.authAdapter.getToken()
          if (userToken) {
            headers['X-Bagdock-User-Token'] = userToken
          }
        }

        const res = await fetch(url.toString(), {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timer)

        if (!res.ok) {
          const errorBody = (await res.json().catch(() => ({}))) as Record<string, string>
          const requestId = res.headers.get('x-request-id') || undefined

          if (res.status >= 500 && attempt < maxAttempts - 1) {
            lastError = new BagdockHiveError(
              errorBody.message || `HTTP ${res.status}`,
              res.status,
              errorBody.code || 'server_error',
              requestId,
            )
            continue
          }

          throw new BagdockHiveError(
            errorBody.message || `HTTP ${res.status}`,
            res.status,
            errorBody.code || 'request_failed',
            requestId,
          )
        }

        return (await res.json()) as T
      } catch (err) {
        clearTimeout(timer)
        if (err instanceof BagdockHiveError) throw err
        lastError = err instanceof Error ? err : new Error(String(err))
        if (attempt >= maxAttempts - 1) break
      }
    }

    throw lastError || new BagdockHiveError('Request failed', 0, 'unknown_error')
  }
}
