'use client'

import { useAuth, useClerk } from '@clerk/nextjs'
import { useCallback, useMemo } from 'react'

import { friendlyMessage } from './errors'

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

interface ApiError extends Error {
  status: number
  code?: string
  // Mensagem original da API antes da tradução, útil pra debug em dev.
  rawMessage?: string
}

const buildError = (
  rawMessage: string,
  status: number,
  code?: string,
): ApiError => {
  // err.message já vai saneado: códigos conhecidos viram texto amigável,
  // 5xx genéricos não vazam detalhe técnico, mensagens com stack trace
  // são substituídas por fallback. Componentes podem fazer
  // setError(err.message) sem se preocupar com vazamento.
  const friendly = friendlyMessage({ status, code, message: rawMessage })
  const err = new Error(friendly) as ApiError
  err.status = status
  if (code) err.code = code
  err.rawMessage = rawMessage
  return err
}

// Flag global pra evitar que múltiplas requests concorrentes que falham com
// 401 disparem signOut N vezes ao mesmo tempo (geraria N redirects, race
// no router). Reseta naturalmente quando a página recarrega.
let signOutInFlight = false

export const useApi = () => {
  const { getToken } = useAuth()
  const clerk = useClerk()

  const request = useCallback(
    async <T>(method: string, path: string, body?: unknown): Promise<T> => {
      const token = await getToken()
      // Content-Type só quando há body: Fastify rejeita request com
      // Content-Type: application/json mas body vazio (acontecia em DELETEs
      // e POSTs sem payload, dando 400 "Body cannot be empty").
      const hasBody = body !== undefined
      const headers: Record<string, string> = {
        Accept: 'application/json',
        ...(hasBody ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      }
      const res = await fetch(`${apiBase}${path}`, {
        method,
        headers,
        body: hasBody ? JSON.stringify(body) : undefined,
      })

      if (!res.ok) {
        // Sessão revogada server-side (ex: admin forçou logout / reset de
        // senha) faz a próxima request retornar 401. Disparamos signOut do
        // Clerk pra limpar estado local e redirecionar pro sign-in.
        // O JWT atual pode ainda estar válido por alguns segundos, então
        // o gatilho aqui é o backend rejeitando o token (rota 401), não o
        // JWT expirando.
        if (res.status === 401 && !signOutInFlight) {
          signOutInFlight = true
          void clerk.signOut({ redirectUrl: '/sign-in' })
        }

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
    [getToken, clerk],
  )

  // Memoiza o objeto retornado pra ter referência estável entre renders.
  // Sem isso, `const api = useApi()` muda toda vez que ClientShell re-renderiza,
  // e qualquer useEffect que depende de `api` entra em loop infinito (vimos
  // 312 req/s antes do fix). request só muda quando getToken muda (estável
  // dentro de uma sessão Clerk), então o objeto fica estável tb.
  return useMemo(
    () => ({
      get: <T,>(path: string) => request<T>('GET', path),
      post: <T,>(path: string, body?: unknown) => request<T>('POST', path, body),
      put: <T,>(path: string, body?: unknown) => request<T>('PUT', path, body),
      patch: <T,>(path: string, body?: unknown) => request<T>('PATCH', path, body),
      del: <T,>(path: string) => request<T>('DELETE', path),
    }),
    [request],
  )
}
