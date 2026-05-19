import { auth } from '@clerk/nextjs/server'

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ApiOptions {
  cache?: RequestCache
  next?: { revalidate?: number; tags?: string[] }
  requireAuth?: boolean
}

const buildHeaders = async (requireAuth: boolean): Promise<HeadersInit> => {
  const headers: Record<string, string> = { Accept: 'application/json' }
  if (requireAuth) {
    const { getToken } = await auth()
    const token = await getToken()
    if (token) headers.Authorization = `Bearer ${token}`
  }
  return headers
}

export const apiGet = async <T>(path: string, opts: ApiOptions = {}): Promise<T> => {
  const headers = await buildHeaders(opts.requireAuth ?? true)
  const res = await fetch(`${apiBase}${path}`, {
    headers,
    cache: opts.cache ?? 'no-store',
    next: opts.next,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${path} returned ${res.status}: ${body}`)
  }
  return res.json() as Promise<T>
}
