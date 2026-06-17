'use client'

import { useAuth } from '@clerk/nextjs'
import { useCallback, useEffect, useState } from 'react'

import { cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

interface DataExportModalProps {
  open: boolean
  onClose: () => void
}

interface ExportOptions {
  includeTransactions: boolean
  includeOrders: boolean
  includeFiles: boolean
  includeMessages: boolean
}

interface LatestExport {
  id: string
  status: 'PROCESSING' | 'READY' | 'FAILED' | 'EXPIRED'
  ready: boolean
  downloadPath: string | null
  expiresAt: string | null
  createdAt: string
}

const initial: ExportOptions = {
  includeTransactions: true,
  includeOrders: true,
  includeFiles: true,
  includeMessages: false,
}

type Stage = 'form' | 'submitting' | 'success' | 'error'

const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001'

export const DataExportModal = ({ open, onClose }: DataExportModalProps) => {
  const api = useApi()
  const { getToken } = useAuth()
  const [options, setOptions] = useState<ExportOptions>(initial)
  const [stage, setStage] = useState<Stage>('form')
  const [error, setError] = useState<string | null>(null)
  const [latest, setLatest] = useState<LatestExport | null | undefined>(undefined)
  const [downloading, setDownloading] = useState(false)

  const loadLatest = useCallback(async () => {
    try {
      const res = await api.get<{ export: LatestExport | null }>(
        '/me/data-export/latest',
      )
      setLatest(res.export)
    } catch {
      setLatest(null)
    }
  }, [api])

  useEffect(() => {
    if (!open) return
    setOptions(initial)
    setStage('form')
    setError(null)
    setLatest(undefined)
    void loadLatest()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prev
    }
  }, [open, onClose, loadLatest])

  if (!open) return null

  const submit = async () => {
    setStage('submitting')
    setError(null)
    try {
      await api.post('/me/data-export', options)
      setStage('success')
      void loadLatest()
    } catch (err) {
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Falha ao solicitar export'
      setError(message)
      setStage('error')
    }
  }

  // Download exige Authorization header — fetch manual e converte em Blob.
  // useApi não dá conta porque sempre parseia como JSON.
  const download = async () => {
    if (!latest?.downloadPath) return
    setDownloading(true)
    setError(null)
    try {
      const token = await getToken()
      const res = await fetch(`${apiBase}${latest.downloadPath}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })
      if (!res.ok) throw new Error(`Falha ao baixar (${res.status})`)
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `tpc-export-${latest.id}.json`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao baixar')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[8vh] sm:items-center sm:pt-0">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      <div
        role="dialog"
        aria-label="Solicitar minhas informações"
        className="relative z-10 flex w-full max-w-[520px] flex-col gap-4 rounded-2xl border border-tpc-border bg-tpc-bg p-6 shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold tracking-tight text-tpc-text">
              Solicitar minhas informações
            </h2>
            <p className="mt-1 text-xs text-tpc-text-tertiary">
              Direito de portabilidade (LGPD). Vamos gerar um ZIP com tudo que
              tu pediu e te mandar por email quando estiver pronto.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-7 w-7 cursor-pointer items-center justify-center rounded-md text-tpc-text-tertiary hover:bg-tpc-surface hover:text-tpc-text"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {latest?.status === 'READY' && latest.downloadPath && (
          <div className="rounded-xl border border-tpc-green/40 bg-tpc-green/5 p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full border border-tpc-green/40 bg-tpc-green/10 text-tpc-green">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                  <path d="M5 12l5 5L20 7" />
                </svg>
              </div>
              <div className="flex-1">
                <div className="text-[13px] font-semibold text-tpc-text">
                  Pacote anterior pronto pra baixar
                </div>
                <div className="mt-0.5 text-[11.5px] text-tpc-text-tertiary">
                  Expira em{' '}
                  {latest.expiresAt
                    ? new Date(latest.expiresAt).toLocaleDateString('pt-BR')
                    : '—'}
                </div>
              </div>
              <button
                type="button"
                onClick={download}
                disabled={downloading}
                className={cn(
                  'rounded-lg bg-tpc-green px-3 py-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-tpc-text transition',
                  downloading
                    ? 'cursor-not-allowed opacity-50'
                    : 'cursor-pointer hover:bg-tpc-green/80',
                )}
              >
                {downloading ? 'Baixando…' : 'Baixar'}
              </button>
            </div>
          </div>
        )}

        {latest?.status === 'PROCESSING' && (
          <div className="rounded-xl border border-tpc-yellow/40 bg-tpc-yellow/5 px-4 py-3 text-[12.5px] text-tpc-text-secondary">
            <strong className="text-tpc-text">Em processamento.</strong> Já temos
            um pedido teu rodando. Te avisamos por email quando estiver pronto.
          </div>
        )}

        {latest?.status === 'FAILED' && (
          <div className="rounded-xl border border-tpc-red/40 bg-tpc-red/5 px-4 py-3 text-[12.5px] text-tpc-text-secondary">
            <strong className="text-tpc-red">Falhou.</strong> O último pedido não
            conseguiu gerar o pacote. Pode tentar de novo abaixo.
          </div>
        )}

        {stage === 'success' ? (
          <SuccessPanel onClose={onClose} />
        ) : (
          <>
            <div className="rounded-xl border border-tpc-border bg-tpc-surface/40 p-4">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary">
                Sempre incluído
              </div>
              <ul className="flex flex-col gap-2 text-[12.5px] text-tpc-text-secondary">
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  Dados pessoais (nome, email, CPF/CNPJ, telefone)
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  Endereço cadastrado
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  Carros da garagem
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  Consentimentos atuais
                </li>
              </ul>
            </div>

            <div className="rounded-xl border border-tpc-border bg-tpc-surface/40 p-4">
              <div className="mb-3 font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary">
                Opcionais
              </div>
              <div className="flex flex-col gap-3">
                <ToggleRow
                  label="Histórico de transações"
                  hint="Todos os créditos, débitos e reservas de pontos"
                  checked={options.includeTransactions}
                  onChange={(v) =>
                    setOptions((o) => ({ ...o, includeTransactions: v }))
                  }
                />
                <ToggleRow
                  label="Pedidos (presencial + por arquivo)"
                  hint="Solicitações e remap orders, com status"
                  checked={options.includeOrders}
                  onChange={(v) => setOptions((o) => ({ ...o, includeOrders: v }))}
                />
                <ToggleRow
                  label="Arquivos enviados e modificados"
                  hint="Links pra download dos .bin/.ori (sem expiração)"
                  checked={options.includeFiles}
                  onChange={(v) => setOptions((o) => ({ ...o, includeFiles: v }))}
                />
                <ToggleRow
                  label="Mensagens do chat"
                  hint="Conversas com TPC nos pedidos por arquivo"
                  checked={options.includeMessages}
                  onChange={(v) =>
                    setOptions((o) => ({ ...o, includeMessages: v }))
                  }
                />
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] text-tpc-red">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={onClose}
                disabled={stage === 'submitting'}
                className="rounded-lg border border-tpc-border bg-tpc-surface px-4 py-2 text-[13px] font-medium text-tpc-text-secondary transition hover:bg-tpc-elevated disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={stage === 'submitting' || latest?.status === 'PROCESSING'}
                className={cn(
                  'rounded-lg px-4 py-2 text-[13px] font-semibold text-tpc-text transition',
                  stage === 'submitting' || latest?.status === 'PROCESSING'
                    ? 'cursor-not-allowed bg-tpc-elevated text-tpc-text-tertiary'
                    : 'cursor-pointer bg-tpc-red hover:bg-tpc-red-dark',
                )}
              >
                {stage === 'submitting'
                  ? 'Solicitando…'
                  : latest?.status === 'PROCESSING'
                    ? 'Pedido em andamento'
                    : latest?.status === 'READY'
                      ? 'Solicitar novo pacote'
                      : 'Solicitar export'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const ToggleRow = ({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string
  hint: string
  checked: boolean
  onChange: (v: boolean) => void
}) => (
  <label className="flex cursor-pointer items-start gap-3">
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onChange(e.target.checked)}
      className="mt-0.5 h-4 w-4 cursor-pointer accent-tpc-red"
    />
    <div className="flex-1">
      <div className="text-[13px] font-medium text-tpc-text">{label}</div>
      <div className="text-[11px] text-tpc-text-tertiary">{hint}</div>
    </div>
  </label>
)

const CheckIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="flex-shrink-0 text-tpc-green"
    aria-hidden
  >
    <path d="M5 12l5 5L20 7" />
  </svg>
)

const SuccessPanel = ({ onClose }: { onClose: () => void }) => (
  <div className="flex flex-col items-center gap-3 py-6 text-center">
    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-tpc-green/40 bg-tpc-green/10 text-tpc-green">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M5 12l5 5L20 7" />
      </svg>
    </div>
    <div>
      <h3 className="text-[15px] font-semibold text-tpc-text">
        Solicitação recebida
      </h3>
      <p className="mt-1 text-[12.5px] text-tpc-text-tertiary">
        Vamos preparar teu pacote e te avisar por email quando estiver pronto.
        Costuma levar até 24h.
      </p>
    </div>
    <button
      type="button"
      onClick={onClose}
      className="mt-2 rounded-lg bg-tpc-red px-4 py-2 text-[13px] font-semibold text-tpc-text transition hover:bg-tpc-red-dark"
    >
      Fechar
    </button>
  </div>
)
