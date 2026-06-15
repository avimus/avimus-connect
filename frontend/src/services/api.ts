const API_URL = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3001/api/v1'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('avimus_token')
}

export function clearToken(): void {
  localStorage.removeItem('avimus_token')
  document.cookie = 'avimus_token=; path=/; max-age=0; SameSite=Lax'
}

export function setToken(token: string): void {
  localStorage.setItem('avimus_token', token)
  document.cookie = `avimus_token=${token}; path=/; max-age=86400; SameSite=Lax`
}

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE'

async function request<T>(method: HttpMethod, path: string, body?: unknown): Promise<T> {
  const token = getToken()
  const headers: HeadersInit = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  })

  if (res.status === 401) {
    if (!path.startsWith('/auth/')) {
      clearToken()
      window.location.href = '/login'
      throw new Error('Sessão expirada')
    }
    // rotas /auth/*: deixa cair no !res.ok para propagar a mensagem real da API
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const api = {
  get: <T>(path: string) => request<T>('GET', path),
  post: <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch: <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  put: <T>(path: string, body: unknown) => request<T>('PUT', path, body),
  delete: <T>(path: string) => request<T>('DELETE', path),
}
