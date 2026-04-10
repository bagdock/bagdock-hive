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

function isProduction(): boolean {
  try {
    const g = globalThis as any
    return g?.process?.env?.NODE_ENV === 'production'
  } catch {
    return false
  }
}

function resolveBaseUrl(explicit?: string): string {
  if (explicit) {
    const url = explicit.replace(/\/$/, '')
    if (isProduction() && !url.startsWith('https://')) {
      throw new BagdockHiveError(
        '[@bagdock/hive] Non-HTTPS base URL is not allowed in production.',
        0,
        'CONFIGURATION_ERROR',
      )
    }
    if (url.startsWith('http://')) {
      console.warn('[@bagdock/hive] WARNING: Using insecure HTTP connection. Use HTTPS in production.')
    }
    return url
  }
  if (typeof globalThis !== 'undefined' && typeof (globalThis as any).process !== 'undefined') {
    const envUrl = (globalThis as any).process?.env?.BAGDOCK_API_URL
    if (envUrl) {
      if (isProduction() && !envUrl.startsWith('https://')) {
        throw new BagdockHiveError(
          '[@bagdock/hive] Non-HTTPS BAGDOCK_API_URL is not allowed in production.',
          0,
          'CONFIGURATION_ERROR',
        )
      }
      if (envUrl !== DEFAULT_BASE_URL) {
        console.warn(`[@bagdock/hive] Using non-production API URL: ${envUrl}`)
      }
      return envUrl.replace(/\/$/, '')
    }
  }
  return DEFAULT_BASE_URL
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

export class HttpClient {
  readonly config: ClientConfig

  constructor(config: Partial<ClientConfig> & { apiKey: string }) {
    this.config = {
      apiKey: config.apiKey,
      baseUrl: resolveBaseUrl(config.baseUrl),
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      timeoutMs: config.timeoutMs ?? DEFAULT_TIMEOUT,
      operatorId: config.operatorId,
      authAdapter: config.authAdapter,
    }
  }

  get baseUrl(): string {
    return this.config.baseUrl
  }

  withOperatorId(operatorId: string): HttpClient {
    return new HttpClient({ ...this.config, operatorId })
  }

  withAuth(authAdapter: AuthAdapter): HttpClient {
    return new HttpClient({ ...this.config, authAdapter })
  }

  private async buildHeaders(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${this.config.apiKey}`,
      'User-Agent': '@bagdock/hive/0.2.0',
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

    return headers
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
        const headers = await this.buildHeaders()

        const res = await fetch(url.toString(), {
          method,
          headers,
          body: body ? JSON.stringify(body) : undefined,
          signal: controller.signal,
        })

        clearTimeout(timer)

        if (!res.ok) {
          const errorBody = (await res.json().catch(() => ({}))) as Record<string, any>
          const requestId = res.headers.get('x-request-id') || undefined
          const errorMessage = errorBody?.error?.message || errorBody?.message || `HTTP ${res.status}`
          const errorCode = errorBody?.error?.code || errorBody?.code || 'request_failed'

          if (res.status >= 500 && attempt < maxAttempts - 1) {
            lastError = new BagdockHiveError(errorMessage, res.status, errorCode, requestId)
            continue
          }

          throw new BagdockHiveError(errorMessage, res.status, errorCode, requestId)
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

  /**
   * Make a raw fetch request with proper auth headers. Used for streaming
   * endpoints where we need the raw Response object.
   */
  async rawRequest(
    method: string,
    path: string,
    body?: unknown,
    extraHeaders?: Record<string, string>,
  ): Promise<Response> {
    const url = new URL(path, this.config.baseUrl)
    const headers = await this.buildHeaders()

    if (extraHeaders) {
      Object.assign(headers, extraHeaders)
    }

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), this.config.timeoutMs)

    try {
      const res = await fetch(url.toString(), {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      })

      clearTimeout(timer)

      if (!res.ok) {
        const errorBody = (await res.json().catch(() => ({}))) as Record<string, any>
        const requestId = res.headers.get('x-request-id') || undefined
        throw new BagdockHiveError(
          errorBody?.error?.message || errorBody?.message || `HTTP ${res.status}`,
          res.status,
          errorBody?.error?.code || errorBody?.code || 'request_failed',
          requestId,
        )
      }

      return res
    } catch (err) {
      clearTimeout(timer)
      if (err instanceof BagdockHiveError) throw err
      throw new BagdockHiveError(
        err instanceof Error ? err.message : 'Request failed',
        0,
        'network_error',
      )
    }
  }
}
