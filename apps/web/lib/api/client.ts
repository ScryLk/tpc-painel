'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback } from 'react'

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ApiError extends Error {
  status: number
  code?: string
}

const buildError = (message: string, status: number, code?: string): ApiError => {
  const err = new Error(message) as ApiError
  err.status = status
  if (code) err.code = code
  return err
}

export const useApi = () => {
  const { getToken } = useAuth()

  const request = useCallback(
    async <T>(method: string, path: string, body?: unknown): Promise<T> => {
      const token = await getToken()
      const res = await fetch(`${apiBase}${path}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body === undefined ? undefined : JSON.stringify(body),
      })

      if (!res.ok) {
        let code: string | undefined
        let message = `Request failed (${res.status})`
        try {
          const parsed = (await res.json()) as { error?: { code?: string; message?: string } }
          if (parsed.error?.message) message = parsed.error.message
          if (parsed.error?.code) code = parsed.error.code
        } catch {
          /* body wasn't JSON */
        }
        throw buildError(message, res.status, code)
      }

      if (res.status === 204) return undefined as T
      return (await res.json()) as T
    },
    [getToken],
  )

  return {
    get: useCallback(<T>(path: string) => request<T>('GET', path), [request]),
    post: useCallback(<T>(path: string, body?: unknown) => request<T>('POST', path, body), [request]),
    del: useCallback(<T>(path: string) => request<T>('DELETE', path), [request]),
  }
}
