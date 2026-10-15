import { toast } from 'sonner'
import { useAuthStore } from './auth-store'

export class ApiError extends Error {
  status: number
  detail: string

  constructor(status: number, message: string, detail: string = '') {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.detail = detail
  }
}

export interface RequestOptions extends Omit<RequestInit, 'body'> {
  body?: unknown
  params?: Record<string, string | number | boolean | undefined>
  responseType?: 'json' | 'text' | 'blob'
}

/**
 * Central HTTP client with typed responses, automatic auth header injection and standardized errors.
 */
class ApiClient {
  private getBaseUrl(): string {
    return '' // Empty string relies on Vite reverse proxy in dev and origin in prod
  }

  private buildUrl(path: string, params?: Record<string, string | number | boolean | undefined>): string {
    const base = this.getBaseUrl()
    const cleanPath = path.startsWith('/') ? path : `/${path}`
    const url = new URL(`${base}${cleanPath}`, window.location.origin)

    if (params) {
      Object.entries(params).forEach(([key, val]) => {
        if (val !== undefined && val !== null && val !== '') {
          url.searchParams.append(key, String(val))
        }
      })
    }

    return url.pathname + url.search
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { body, params, headers: customHeaders, responseType = 'json', ...init } = options
    const url = this.buildUrl(path, params)

    const headers = new Headers(customHeaders)

    // Inject active API Key if present
    const apiKey = useAuthStore.getState().apiKey
    if (apiKey && !headers.has('X-API-Key') && !headers.has('Authorization')) {
      if (apiKey.startsWith('Bearer ') || apiKey.startsWith('ey')) {
        headers.set('Authorization', apiKey.startsWith('Bearer ') ? apiKey : `Bearer ${apiKey}`)
      } else {
        headers.set('X-API-Key', apiKey)
      }
    }

    if (body !== undefined && !(body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json')
    }

    const payload: BodyInit | null | undefined =
      body instanceof FormData ? body : body !== undefined ? JSON.stringify(body) : undefined

    try {
      const response = await fetch(url, {
        ...init,
        headers,
        body: payload,
      })

      if (!response.ok) {
        let errorDetail = response.statusText
        try {
          const jsonErr = (await response.json()) as { detail?: string; error?: string; message?: string }
          errorDetail = jsonErr.detail || jsonErr.error || jsonErr.message || response.statusText
        } catch {
          try {
            errorDetail = await response.text()
          } catch {
            // fallback to statusText
          }
        }

        // Automatic 401/403 session expiration handler
        if (response.status === 401 || response.status === 403) {
          const auth = useAuthStore.getState()
          if (auth.apiKey) {
            auth.logout()
            toast.error('Sessão expirada ou token inválido. Acesso revogado.', {
              id: 'auth-session-expired',
            })
          }
        }

        throw new ApiError(response.status, `HTTP ${response.status}: ${errorDetail}`, errorDetail)
      }

      if (responseType === 'text') {
        const text = await response.text()
        return text as unknown as T
      }

      if (responseType === 'blob') {
        const blob = await response.blob()
        return blob as unknown as T
      }

      if (response.status === 204) {
        return {} as T
      }

      const json = await response.json()
      return json as T
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        throw err
      }
      const message = err instanceof Error ? err.message : 'Unknown network failure'
      throw new ApiError(0, message, 'Network error')
    }
  }

  get<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' })
  }

  post<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'POST', body })
  }

  put<T>(path: string, body?: unknown, options?: Omit<RequestOptions, 'method' | 'body'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'PUT', body })
  }

  delete<T>(path: string, options?: Omit<RequestOptions, 'method'>): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' })
  }
}

export const apiClient = new ApiClient()
