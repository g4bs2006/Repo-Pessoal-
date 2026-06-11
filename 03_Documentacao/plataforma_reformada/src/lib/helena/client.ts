const BASE = '/api/helena'

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}/${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.error ?? `Erro ${res.status}`)
  }
  return res.json()
}

export const api = {
  get: <T>(path: string, params?: Record<string, string | number | boolean | string[]>) => {
    const url = buildUrl(path, params)
    return request<T>(url)
  },
  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PATCH', body: JSON.stringify(body) }),
  delete: <T>(path: string) =>
    request<T>(path, { method: 'DELETE' }),
}

function buildUrl(path: string, params?: Record<string, string | number | boolean | string[]>): string {
  if (!params) return path
  const qs = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue
    if (Array.isArray(value)) {
      value.forEach((v) => qs.append(key, String(v)))
    } else {
      qs.set(key, String(value))
    }
  }
  const str = qs.toString()
  return str ? `${path}?${str}` : path
}
