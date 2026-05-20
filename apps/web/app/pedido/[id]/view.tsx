'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState, useTransition } from 'react'

import { formatPoints } from '@tpc/lib/formatters'
import { Button, Card, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'
import { ClientShell } from '@/components/layout/ClientShell'

type OrderStatus =
  | 'AWAITING_QUOTE'
  | 'QUOTE_SENT'
  | 'ANALYZING'
  | 'MAPPING'
  | 'AWAITING_REVIEW'
  | 'APPROVED'
  | 'NEEDS_REVISION'
  | 'CANCELLED'

interface RemapOrder {
  id: string
  protocol: string
  status: OrderStatus
  isCustomQuote: boolean
  ecuModel: string | null
  hardwareUsed: string | null
  readMode: string | null
  vehicleVin: string | null
  mileage: number | null
  description: string | null
  quotePoints: number | null
  pointsReserved: number
  pointsDebited: number
  createdAt: string
  approvedAt: string | null
  remapService: { name: string; category: string; pts: number; supports: string[] } | null
  car: { brand: string; model: string; year: number; plate: string; motorType: string } | null
  reservationExpiresAt: string | null
}

interface Message {
  id: string
  senderType: 'CUSTOMER' | 'TPC_STAFF' | 'SYSTEM'
  body: string
  createdAt: string
  file: {
    id: string
    fileName: string
    fileSize: number
    kind: 'ORIGINAL' | 'MODIFIED' | 'ATTACHMENT' | 'REPORT'
  } | null
}

interface Saldo {
  available: number
  reserved: number
  total: number
}

interface Props {
  order: RemapOrder
  saldo: Saldo
}

const POLL_MS = 3000

export const PedidoView = ({ order: initialOrder, saldo: initialSaldo }: Props) => {
  const api = useApi()
  const router = useRouter()
  const [order, setOrder] = useState(initialOrder)
  const [saldo, setSaldo] = useState(initialSaldo)
  const [messages, setMessages] = useState<Message[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [sending, sendingTransition] = useTransition()
  const [approving, approveTransition] = useTransition()
  const [simulating, simulateTransition] = useTransition()
  const scrollRef = useRef<HTMLDivElement>(null)

  // Initial load + polling
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const res = await api.get<{ messages: Message[] }>(
          `/remap-orders/${order.id}/messages`,
        )
        if (alive) setMessages(res.messages)
      } catch {
        /* polling falha não bloqueia UX */
      }
    }
    load()
    const id = setInterval(load, POLL_MS)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [api, order.id])

  // Poll order status separately (cheap, captures status changes)
  useEffect(() => {
    let alive = true
    const load = async () => {
      try {
        const fresh = await api.get<RemapOrder>(`/remap-orders/${order.id}`)
        if (alive) setOrder(fresh)
      } catch {
        /* swallow */
      }
    }
    const id = setInterval(load, POLL_MS * 2)
    return () => {
      alive = false
      clearInterval(id)
    }
  }, [api, order.id])

  // Auto-scroll to bottom when new messages
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages.length])

  const sendMessage = () => {
    const text = draft.trim()
    if (!text) return
    setError(null)
    sendingTransition(async () => {
      try {
        const res = await api.post<{ message: Message }>(
          `/remap-orders/${order.id}/messages`,
          { body: text },
        )
        setMessages((prev) => [...prev, res.message])
        setDraft('')
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao enviar.')
      }
    })
  }

  const approveOrder = () => {
    setError(null)
    approveTransition(async () => {
      try {
        await api.post(`/remap-orders/${order.id}/approve`, {})
        // Reload order + messages + saldo
        const [fresh, msgs, sal] = await Promise.all([
          api.get<RemapOrder>(`/remap-orders/${order.id}`),
          api.get<{ messages: Message[] }>(`/remap-orders/${order.id}/messages`),
          api.get<Saldo>('/me/saldo'),
        ])
        setOrder(fresh)
        setMessages(msgs.messages)
        setSaldo(sal)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao aprovar.')
      }
    })
  }

  const simulateTpc = () => {
    setError(null)
    simulateTransition(async () => {
      try {
        await api.post(`/remap-orders/${order.id}/dev/simulate-tpc-reply`, {})
        const [fresh, msgs] = await Promise.all([
          api.get<RemapOrder>(`/remap-orders/${order.id}`),
          api.get<{ messages: Message[] }>(`/remap-orders/${order.id}/messages`),
        ])
        setOrder(fresh)
        setMessages(msgs.messages)
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao simular.')
      }
    })
  }

  const fileUnlocked = order.status === 'APPROVED'
  const awaitingApproval = order.status === 'AWAITING_REVIEW'
  const isDev = process.env.NODE_ENV !== 'production'

  return (
    <ClientShell
      breadcrumbs={['Pedidos', `#${order.protocol}`]}
      saldoAvailable={saldo.available}
    >
      <div className="mx-auto flex h-full max-w-[1280px] flex-col px-6 py-5 md:px-10">
        <PedidoHeader order={order} />

        <div className="mt-5 grid min-h-0 flex-1 gap-4 lg:grid-cols-[1fr_320px]">
          <Card className="flex min-h-[500px] min-w-0 flex-col overflow-hidden p-0">
            <div
              ref={scrollRef}
              className="tpc-scroll flex-1 space-y-3 overflow-y-auto p-5"
            >
              {messages.length === 0 && (
                <div className="text-center text-sm text-tpc-text-tertiary">
                  Carregando mensagens...
                </div>
              )}
              {messages.map((m) => (
                <MessageBubble
                  key={m.id}
                  message={m}
                  fileUnlocked={fileUnlocked}
                  awaitingApproval={awaitingApproval}
                  onApprove={approveOrder}
                  approving={approving}
                  approvalCost={order.pointsReserved || order.quotePoints || 0}
                  userBalance={saldo.available}
                />
              ))}
            </div>

            {order.status !== 'CANCELLED' && order.status !== 'APPROVED' && (
              <ComposeBar
                draft={draft}
                setDraft={setDraft}
                sending={sending}
                onSend={sendMessage}
              />
            )}

            {error && (
              <div className="border-t border-tpc-red/40 bg-tpc-red/10 px-4 py-2 text-xs text-tpc-red">
                {error}
              </div>
            )}
          </Card>

          <aside className="space-y-4">
            <OrderSidebar order={order} saldo={saldo} />
            {isDev && order.status !== 'APPROVED' && order.status !== 'CANCELLED' && (
              <DevSimulator
                status={order.status}
                onSimulate={simulateTpc}
                simulating={simulating}
              />
            )}
          </aside>
        </div>
      </div>
    </ClientShell>
  )
}

const PedidoHeader = ({ order }: { order: RemapOrder }) => {
  return (
    <div className="flex flex-col items-start justify-between gap-2 md:flex-row md:items-center">
      <div>
        <h1 className="text-[22px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
          {order.remapService?.name ?? 'Pedido personalizado'}
        </h1>
        <p className="mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[11px] text-tpc-text-tertiary">
          <span>#{order.protocol}</span>
          <span>·</span>
          <span>Criado em {formatDate(order.createdAt)}</span>
          {order.car && (
            <>
              <span>·</span>
              <span className="text-tpc-text-secondary">
                {order.car.brand} {order.car.model}
              </span>
            </>
          )}
        </p>
      </div>
      <StatusPill status={order.status} />
    </div>
  )
}

const StatusPill = ({ status }: { status: OrderStatus }) => {
  const map: Record<
    OrderStatus,
    { label: string; classes: string; pulse: boolean; dot: string }
  > = {
    AWAITING_QUOTE: {
      label: 'Aguardando orçamento',
      classes: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
      pulse: true,
      dot: 'bg-tpc-yellow',
    },
    QUOTE_SENT: {
      label: 'Orçamento enviado',
      classes: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
      pulse: true,
      dot: 'bg-tpc-yellow',
    },
    ANALYZING: {
      label: 'Em análise',
      classes: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
      pulse: true,
      dot: 'bg-tpc-red',
    },
    MAPPING: {
      label: 'Em mapeamento',
      classes: 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red',
      pulse: true,
      dot: 'bg-tpc-red',
    },
    AWAITING_REVIEW: {
      label: 'Aguardando aprovação',
      classes: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
      pulse: true,
      dot: 'bg-tpc-green',
    },
    APPROVED: {
      label: 'Concluído',
      classes: 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
      pulse: false,
      dot: 'bg-tpc-green',
    },
    NEEDS_REVISION: {
      label: 'Precisa revisão',
      classes: 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow',
      pulse: false,
      dot: 'bg-tpc-yellow',
    },
    CANCELLED: {
      label: 'Cancelado',
      classes: 'border-tpc-border bg-tpc-elevated-2 text-tpc-text-tertiary',
      pulse: false,
      dot: 'bg-tpc-text-tertiary',
    },
  }
  const cfg = map[status]
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[9px] font-bold uppercase tracking-[0.14em]',
        cfg.classes,
      )}
    >
      {cfg.pulse && (
        <span
          className={cn(
            'inline-block h-1.5 w-1.5 animate-[tpc-pulse_1.8s_ease-in-out_infinite] rounded-full shadow-[0_0_5px_currentColor]',
            cfg.dot,
          )}
        />
      )}
      {cfg.label}
    </span>
  )
}

const MessageBubble = ({
  message,
  fileUnlocked,
  awaitingApproval,
  onApprove,
  approving,
  approvalCost,
  userBalance,
}: {
  message: Message
  fileUnlocked: boolean
  awaitingApproval: boolean
  onApprove: () => void
  approving: boolean
  approvalCost: number
  userBalance: number
}) => {
  if (message.senderType === 'SYSTEM') {
    return (
      <div className="flex justify-center">
        <div className="rounded-full border border-tpc-border bg-tpc-elevated-2 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.06em] text-tpc-text-tertiary">
          {message.body}
        </div>
      </div>
    )
  }

  const isCustomer = message.senderType === 'CUSTOMER'

  return (
    <div className={cn('flex', isCustomer ? 'justify-end' : 'justify-start')}>
      <div className={cn('max-w-[80%] space-y-1.5')}>
        {!isCustomer && (
          <div className="ml-1 font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
            TPC
          </div>
        )}
        <div
          className={cn(
            'rounded-2xl px-3.5 py-2.5 text-[13px] leading-snug',
            isCustomer
              ? 'rounded-br-sm bg-tpc-red text-tpc-text'
              : 'rounded-bl-sm border border-tpc-border bg-tpc-elevated-2 text-tpc-text',
          )}
        >
          {message.body}
        </div>
        {message.file && (
          <FileAttachment
            file={message.file}
            locked={message.file.kind === 'MODIFIED' && !fileUnlocked}
            awaitingApproval={awaitingApproval && message.file.kind === 'MODIFIED'}
            onApprove={onApprove}
            approving={approving}
            approvalCost={approvalCost}
            userBalance={userBalance}
          />
        )}
        <div
          className={cn(
            'font-mono text-[9px] text-tpc-text-tertiary',
            isCustomer ? 'text-right' : 'ml-1',
          )}
        >
          {formatTime(message.createdAt)}
        </div>
      </div>
    </div>
  )
}

const FileAttachment = ({
  file,
  locked,
  awaitingApproval,
  onApprove,
  approving,
  approvalCost,
  userBalance,
}: {
  file: NonNullable<Message['file']>
  locked: boolean
  awaitingApproval: boolean
  onApprove: () => void
  approving: boolean
  approvalCost: number
  userBalance: number
}) => {
  const isModified = file.kind === 'MODIFIED'
  const fitsBalance = userBalance >= approvalCost

  return (
    <Card
      className={cn(
        'overflow-hidden p-0',
        locked && 'border-tpc-yellow/40 bg-tpc-yellow/[0.04]',
        isModified && !locked && 'border-tpc-green/40 bg-tpc-green/[0.04]',
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div
          className={cn(
            'flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-[10px] border',
            locked
              ? 'border-tpc-yellow/40 bg-tpc-yellow/10 text-tpc-yellow'
              : 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
          )}
        >
          {locked ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <rect x="3" y="11" width="18" height="11" rx="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          ) : (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <path d="M14 2v6h6M9 13l2 2 4-4" />
            </svg>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate font-mono text-[12px] font-semibold tracking-wide text-tpc-text">
            {file.fileName}
          </div>
          <div className="mt-0.5 font-mono text-[10px] text-tpc-text-tertiary">
            {formatBytes(file.fileSize)} · {file.kind.toLowerCase()}
          </div>
        </div>
      </div>

      {locked && awaitingApproval && (
        <div className="border-t border-tpc-yellow/30 p-3">
          <div className="mb-2 text-[11px] leading-snug text-tpc-text-secondary">
            Aprova pra debitar{' '}
            <span className="font-semibold text-tpc-text">
              {formatPoints(approvalCost)} pts
            </span>{' '}
            e liberar download permanente.
          </div>
          <Button
            fullWidth
            onClick={onApprove}
            disabled={approving || !fitsBalance}
            className="text-[12px]"
          >
            {approving
              ? 'Aprovando…'
              : !fitsBalance
                ? 'Saldo insuficiente'
                : `Aprovar e pagar ${formatPoints(approvalCost)} pts`}
          </Button>
        </div>
      )}

      {!locked && isModified && (
        <div className="border-t border-tpc-green/30 p-3">
          <button
            type="button"
            disabled
            className="inline-flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-lg border border-tpc-green/40 bg-tpc-green/10 px-3 py-2 text-[12px] font-semibold text-tpc-green opacity-60"
            title="Download via R2 será wired no próximo passo"
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
            </svg>
            Baixar arquivo
          </button>
          <p className="mt-2 text-center font-mono text-[9px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
            Disponível pra sempre via Histórico
          </p>
        </div>
      )}
    </Card>
  )
}

const ComposeBar = ({
  draft,
  setDraft,
  sending,
  onSend,
}: {
  draft: string
  setDraft: (v: string) => void
  sending: boolean
  onSend: () => void
}) => {
  return (
    <div className="border-t border-tpc-border p-3">
      <div className="flex items-center gap-2 rounded-xl border border-tpc-border bg-tpc-surface px-3 py-2 focus-within:border-tpc-red focus-within:ring-2 focus-within:ring-tpc-red/30">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              onSend()
            }
          }}
          placeholder="Mensagem pra TPC. Enter envia, Shift+Enter quebra linha."
          rows={2}
          className="max-h-[120px] min-h-[36px] flex-1 resize-none bg-transparent text-[13px] text-tpc-text outline-none placeholder:text-tpc-text-tertiary"
        />
        <button
          type="button"
          onClick={onSend}
          disabled={sending || !draft.trim()}
          className="flex h-8 w-8 flex-shrink-0 cursor-pointer items-center justify-center rounded-lg bg-tpc-red text-tpc-text disabled:cursor-not-allowed disabled:opacity-50"
          aria-label="Enviar"
        >
          {sending ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[tpc-spin_1s_linear_infinite]"
            >
              <path d="M21 12a9 9 0 1 1-6.2-8.6" />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
            </svg>
          )}
        </button>
      </div>
    </div>
  )
}

const OrderSidebar = ({ order, saldo }: { order: RemapOrder; saldo: Saldo }) => {
  return (
    <Card className="space-y-4 p-4">
      <div>
        <div className="tpc-eyebrow mb-1.5">Pedido</div>
        <div className="font-mono text-[13px] font-semibold text-tpc-text">
          #{order.protocol}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 border-t border-tpc-border pt-3">
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
            Reservado
          </div>
          <div className="tpc-num mt-0.5 text-[16px] font-semibold tracking-tight text-tpc-yellow">
            {formatPoints(order.pointsReserved)}
          </div>
        </div>
        <div>
          <div className="font-mono text-[8px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
            Debitado
          </div>
          <div className="tpc-num mt-0.5 text-[16px] font-semibold tracking-tight text-tpc-text">
            {formatPoints(order.pointsDebited)}
          </div>
        </div>
      </div>

      <div className="space-y-1.5 border-t border-tpc-border pt-3 text-[12px]">
        <SidebarRow label="Saldo disponível" value={`${formatPoints(saldo.available)} pts`} />
        {order.remapService && (
          <SidebarRow label="Serviço" value={order.remapService.name} />
        )}
        {order.car && (
          <SidebarRow label="Carro" value={`${order.car.brand} ${order.car.model}`} />
        )}
        {order.ecuModel && <SidebarRow label="ECU" value={order.ecuModel} />}
        {order.hardwareUsed && (
          <SidebarRow label="Hardware" value={order.hardwareUsed} />
        )}
        {order.readMode && <SidebarRow label="Modo de leitura" value={order.readMode} />}
        {order.vehicleVin && <SidebarRow label="Chassi" value={order.vehicleVin} />}
        {order.mileage && (
          <SidebarRow label="KM" value={order.mileage.toLocaleString('pt-BR')} />
        )}
      </div>

      {order.description && (
        <div className="border-t border-tpc-border pt-3">
          <div className="tpc-eyebrow mb-1.5">Descrição</div>
          <p className="text-[12px] leading-snug text-tpc-text-secondary">
            {order.description}
          </p>
        </div>
      )}
    </Card>
  )
}

const SidebarRow = ({ label, value }: { label: string; value: string }) => (
  <div className="flex items-center justify-between gap-3">
    <span className="text-tpc-text-secondary">{label}</span>
    <span className="truncate text-right font-medium text-tpc-text">{value}</span>
  </div>
)

const DevSimulator = ({
  status,
  onSimulate,
  simulating,
}: {
  status: OrderStatus
  onSimulate: () => void
  simulating: boolean
}) => {
  const label = (() => {
    if (status === 'AWAITING_QUOTE') return 'Simular orçamento TPC (600 pts)'
    if (status === 'ANALYZING' || status === 'MAPPING')
      return 'Simular TPC entregar arquivo'
    return 'Simular próxima ação TPC'
  })()
  const disabled =
    simulating ||
    (status !== 'AWAITING_QUOTE' && status !== 'ANALYZING' && status !== 'MAPPING')
  return (
    <Card className="border-dashed p-3">
      <div className="tpc-eyebrow mb-2 !text-tpc-yellow">Dev only</div>
      <button
        type="button"
        onClick={onSimulate}
        disabled={disabled}
        className="w-full cursor-pointer rounded-lg border border-tpc-yellow/40 bg-tpc-yellow/10 px-3 py-2 text-[12px] font-semibold text-tpc-yellow transition hover:bg-tpc-yellow/15 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {simulating ? 'Simulando…' : label}
      </button>
      <p className="mt-2 text-[10px] leading-snug text-tpc-text-tertiary">
        Só aparece em dev. Em prod, TPC responde via painel admin.
      </p>
    </Card>
  )
}

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
