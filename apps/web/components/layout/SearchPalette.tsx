'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
} from 'react'

import { cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

interface ServicePresencial {
  id: string
  slug: string
  name: string
  category: string
  pts: number
}

interface ServiceArquivo {
  id: string
  slug: string
  name: string
  category: string
  pts: number
  isCustom: boolean
}

interface CarItem {
  id: string
  brand: string
  model: string
  year: number | null
  plate: string | null
  motorType: string | null
}

interface OrderItem {
  id: string
  protocol: string
  status: string
  remapService: { name: string } | null
  car: { brand: string; model: string; plate: string | null } | null
}

interface SolicitacaoItem {
  id: string
  protocol: string
  status: string
  service: { name: string; category: string | null } | null
  car: { brand: string; model: string; plate: string | null } | null
}

interface PackageItem {
  id: string
  name: string
  points: number
  bonusPoints: number
  priceCents: number
  popular: boolean
}

interface PaletteData {
  servicosPresencial: ServicePresencial[]
  servicosArquivo: ServiceArquivo[]
  cars: CarItem[]
  orders: OrderItem[]
  solicitacoes: SolicitacaoItem[]
  packages: PackageItem[]
}

type ResultKind =
  | 'action'
  | 'service-presencial'
  | 'service-arquivo'
  | 'car'
  | 'order'
  | 'package'

interface ResultItem {
  key: string
  kind: ResultKind
  title: string
  subtitle: string
  href: string
}

const KIND_LABEL: Record<ResultKind, string> = {
  action: 'Atalhos',
  order: 'Pedidos',
  car: 'Garagem',
  package: 'Pacotes de pontos',
  'service-presencial': 'Serviços presencial',
  'service-arquivo': 'Serviços por arquivo',
}

const KIND_ORDER: ResultKind[] = [
  'action',
  'order',
  'car',
  'package',
  'service-presencial',
  'service-arquivo',
]

// Atalhos estáticos. Sempre disponíveis (não dependem de fetch). No estado
// vazio aparecem todos; com query, filtram por label + keywords.
interface QuickAction {
  id: string
  label: string
  keywords: string
  href: string
  hint: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'recharge',
    label: 'Recarregar pontos',
    keywords: 'recarregar comprar pontos pacote saldo',
    href: '/pontos/comprar',
    hint: 'Compra um pacote de pontos',
  },
  {
    id: 'add-car',
    label: 'Adicionar carro',
    keywords: 'adicionar novo carro garagem cadastrar veiculo',
    href: '/garagem',
    hint: 'Abre garagem · clica no + pra adicionar',
  },
  {
    id: 'new-remap',
    label: 'Novo pedido por arquivo',
    keywords: 'remap arquivo file service bin novo pedido',
    href: '/catalogo/arquivo',
    hint: 'Catálogo de serviços por arquivo',
  },
  {
    id: 'new-presencial',
    label: 'Agendar serviço presencial',
    keywords: 'agendar presencial oficina stage panambi novo',
    href: '/catalogo/presencial',
    hint: 'Catálogo de serviços presencial',
  },
  {
    id: 'open-orders',
    label: 'Ver pedidos em aberto',
    keywords: 'pedidos abertos chat conversa em andamento',
    href: '/pedidos',
    hint: 'Lista de pedidos ativos',
  },
  {
    id: 'history',
    label: 'Ver histórico',
    keywords: 'historico transacoes movimentacao saldo extrato',
    href: '/historico',
    hint: 'Transações e movimentações',
  },
  {
    id: 'profile',
    label: 'Editar perfil',
    keywords: 'perfil editar dados conta endereco cpf',
    href: '/perfil',
    hint: 'Dados pessoais e notificações',
  },
]

const matches = (query: string, ...fields: (string | null | undefined)[]): boolean => {
  if (!query) return true
  const q = query.toLowerCase().trim()
  if (!q) return true
  return fields.some((f) => f && f.toLowerCase().includes(q))
}

const formatBRL = (cents: number): string =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
    cents / 100,
  )

const buildResults = (data: PaletteData | null, query: string): ResultItem[] => {
  const results: ResultItem[] = []

  // Atalhos: sempre disponíveis, filtram por label/keywords quando há query.
  for (const a of QUICK_ACTIONS) {
    if (!matches(query, a.label, a.keywords)) continue
    results.push({
      key: `action:${a.id}`,
      kind: 'action',
      title: a.label,
      subtitle: a.hint,
      href: a.href,
    })
  }

  if (!data) return results

  // Pedidos remap (file service)
  for (const o of data.orders) {
    const serviceName = o.remapService?.name ?? 'Pedido por arquivo'
    const carLabel = o.car ? `${o.car.brand} ${o.car.model}` : null
    if (!matches(query, o.protocol, serviceName, carLabel, o.car?.plate, o.status))
      continue
    results.push({
      key: `order:${o.id}`,
      kind: 'order',
      title: `#${o.protocol} · ${serviceName}`,
      subtitle: carLabel
        ? `Arquivo · ${carLabel}${o.car?.plate ? ` · ${o.car.plate}` : ''}`
        : `Arquivo · ${o.status.toLowerCase()}`,
      href: `/pedido/${o.id}`,
    })
  }

  // Pedidos presencial (Solicitacao)
  for (const s of data.solicitacoes) {
    const serviceName = s.service?.name ?? 'Serviço presencial'
    const carLabel = s.car ? `${s.car.brand} ${s.car.model}` : null
    if (!matches(query, s.protocol, serviceName, carLabel, s.car?.plate, s.status))
      continue
    results.push({
      key: `solicitacao:${s.id}`,
      kind: 'order',
      title: `#${s.protocol} · ${serviceName}`,
      subtitle: carLabel
        ? `Presencial · ${carLabel}${s.car?.plate ? ` · ${s.car.plate}` : ''}`
        : `Presencial · ${s.status.toLowerCase()}`,
      href: `/agendamento/${s.id}`,
    })
  }

  for (const c of data.cars) {
    const carLabel = `${c.brand} ${c.model}${c.year ? ` ${c.year}` : ''}`
    if (!matches(query, c.brand, c.model, c.plate, c.motorType)) continue
    results.push({
      key: `car:${c.id}`,
      kind: 'car',
      title: carLabel,
      subtitle: [c.plate, c.motorType].filter(Boolean).join(' · ') || 'Sem placa',
      href: `/garagem`,
    })
  }

  // Pacotes de pontos
  for (const p of data.packages) {
    if (!matches(query, p.name, 'pacote pontos recarga')) continue
    const totalPts = p.points + p.bonusPoints
    results.push({
      key: `package:${p.id}`,
      kind: 'package',
      title: `${p.name}${p.popular ? ' · popular' : ''}`,
      subtitle: `${totalPts} pts por ${formatBRL(p.priceCents)}`,
      href: `/pontos/comprar`,
    })
  }

  for (const s of data.servicosPresencial) {
    if (!matches(query, s.name, s.category)) continue
    results.push({
      key: `srv-p:${s.id}`,
      kind: 'service-presencial',
      title: s.name,
      subtitle: `${s.category} · ${s.pts} pts`,
      href: `/servico/${s.id}`,
    })
  }

  for (const s of data.servicosArquivo) {
    if (!matches(query, s.name, s.category)) continue
    results.push({
      key: `srv-a:${s.id}`,
      kind: 'service-arquivo',
      title: s.name,
      subtitle: s.isCustom ? `${s.category} · personalizado` : `${s.category} · ${s.pts} pts`,
      href: `/servico/${s.id}`,
    })
  }

  return results
}

const groupResults = (results: ResultItem[]) => {
  const byKind = new Map<ResultKind, ResultItem[]>()
  for (const r of results) {
    const arr = byKind.get(r.kind) ?? []
    arr.push(r)
    byKind.set(r.kind, arr)
  }
  return KIND_ORDER.map((kind) => ({ kind, items: byKind.get(kind) ?? [] })).filter(
    (g) => g.items.length > 0,
  )
}

interface SearchPaletteProps {
  open: boolean
  onClose: () => void
}

export const SearchPalette = ({ open, onClose }: SearchPaletteProps) => {
  const api = useApi()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [query, setQuery] = useState('')
  const [data, setData] = useState<PaletteData | null>(null)
  const [loading, setLoading] = useState(false)
  const [activeIndex, setActiveIndex] = useState(0)

  // Refetcha uma vez por abertura (stale-while-revalidate): mantém o `data`
  // anterior visível enquanto a nova lista chega, evitando piscar resultados
  // vazios. Sem isso, criar/editar um serviço no admin não aparecia no
  // palette até dar reload no app. fetchedForThisOpen evita disparar o
  // fetch novamente nos re-renders enquanto está aberto.
  const fetchedForThisOpen = useRef(false)
  useEffect(() => {
    if (!open) {
      fetchedForThisOpen.current = false
      return
    }
    if (fetchedForThisOpen.current) return
    fetchedForThisOpen.current = true
    let alive = true
    setLoading(true)
    const safe = <T,>(p: Promise<T>, fallback: T): Promise<T> =>
      p.catch(() => fallback)
    Promise.allSettled([
      safe(api.get<{ servicos: ServicePresencial[] }>('/servicos'), { servicos: [] }),
      safe(api.get<{ services: ServiceArquivo[] }>('/remap-services'), { services: [] }),
      safe(api.get<{ cars: CarItem[] }>('/me/cars'), { cars: [] }),
      safe(api.get<{ items: OrderItem[] }>('/me/remap-orders?limit=20'), { items: [] }),
      safe(api.get<{ items: SolicitacaoItem[] }>('/me/solicitacoes?limit=20'), {
        items: [],
      }),
      safe(api.get<{ pacotes: PackageItem[] }>('/pacotes'), { pacotes: [] }),
    ]).then((settled) => {
      if (!alive) return
      const [sp, sa, cars, orders, solicitacoes, packages] = settled.map((r) =>
        r.status === 'fulfilled' ? r.value : null,
      )
      setData({
        servicosPresencial:
          (sp as { servicos: ServicePresencial[] } | null)?.servicos ?? [],
        servicosArquivo:
          (sa as { services: ServiceArquivo[] } | null)?.services ?? [],
        cars: (cars as { cars: CarItem[] } | null)?.cars ?? [],
        orders: (orders as { items: OrderItem[] } | null)?.items ?? [],
        solicitacoes:
          (solicitacoes as { items: SolicitacaoItem[] } | null)?.items ?? [],
        packages: (packages as { pacotes: PackageItem[] } | null)?.pacotes ?? [],
      })
      setLoading(false)
    })
    return () => {
      alive = false
    }
  }, [open, api])

  // Foca o input toda vez que abre, e reseta cursor.
  useEffect(() => {
    if (!open) return
    setActiveIndex(0)
    const t = setTimeout(() => inputRef.current?.focus(), 10)
    return () => clearTimeout(t)
  }, [open])

  // Fecha em Esc + bloqueia scroll do body enquanto aberto.
  useEffect(() => {
    if (!open) return
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
  }, [open, onClose])

  const results = useMemo(() => buildResults(data, query), [data, query])
  const grouped = useMemo(() => groupResults(results), [results])
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped])

  // Mantem activeIndex valido quando os resultados mudam.
  useEffect(() => {
    if (activeIndex >= flat.length) setActiveIndex(0)
  }, [flat.length, activeIndex])

  const onInputKey = useCallback(
    (e: ReactKeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((i) => (flat.length === 0 ? 0 : (i + 1) % flat.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((i) => (flat.length === 0 ? 0 : (i - 1 + flat.length) % flat.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        const target = flat[activeIndex]
        if (target) {
          router.push(target.href)
          onClose()
          setQuery('')
        }
      }
    },
    [flat, activeIndex, router, onClose],
  )

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center px-4 pt-[10vh]">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Fechar busca"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/70 backdrop-blur-sm"
      />

      {/* Painel */}
      <div
        role="dialog"
        aria-label="Busca rápida"
        className="relative flex w-full max-w-[640px] flex-col overflow-hidden rounded-2xl border border-tpc-border bg-tpc-bg shadow-[0_30px_80px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center gap-3 border-b border-tpc-border px-4 py-3">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-tpc-text-tertiary"
            aria-hidden
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.3-4.3" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Buscar serviços, carros, pedidos, atalhos..."
            className="flex-1 bg-transparent text-[14px] text-tpc-text placeholder:text-tpc-text-tertiary focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          <kbd className="rounded-[3px] border border-tpc-border px-1.5 py-0.5 font-mono text-[9px] tracking-wider text-tpc-text-tertiary">
            esc
          </kbd>
        </div>

        <div className="tpc-scroll max-h-[60vh] min-h-[120px] overflow-y-auto">
          {grouped.length === 0 ? (
            query.trim() ? (
              <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl border border-tpc-border bg-tpc-surface text-tpc-text-tertiary">
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
                    <circle cx="11" cy="11" r="8" />
                    <path d="M21 21l-4.3-4.3" />
                    <path d="M8 11h6" />
                  </svg>
                </div>
                <p className="text-[13px] font-medium text-tpc-text">
                  Nada encontrado
                </p>
                <p className="text-[11px] text-tpc-text-tertiary">
                  Sem resultados pra &quot;{query}&quot;
                </p>
                {loading && !data && (
                  <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary">
                    Ainda buscando…
                  </p>
                )}
              </div>
            ) : loading && !data ? (
              <div className="flex items-center justify-center py-10 text-[12px] text-tpc-text-tertiary">
                Carregando…
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1 px-6 py-10 text-center">
                <p className="text-[13px] font-medium text-tpc-text">
                  Nada por aqui ainda
                </p>
                <p className="text-[11px] text-tpc-text-tertiary">
                  Comece digitando pra buscar
                </p>
              </div>
            )
          ) : (
            <div className="py-2">
              {loading && !data && (
                <div className="px-4 pb-2 text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary">
                  Carregando outros resultados…
                </div>
              )}
              {grouped.map((group) => (
                <div key={group.kind} className="px-2 pb-2">
                  <div className="px-2 py-1 font-mono text-[10px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
                    {KIND_LABEL[group.kind]}
                  </div>
                  {group.items.map((item) => {
                    const flatIdx = flat.findIndex((f) => f.key === item.key)
                    const isActive = flatIdx === activeIndex
                    return (
                      <Link
                        key={item.key}
                        href={item.href}
                        onClick={() => {
                          onClose()
                          setQuery('')
                        }}
                        onMouseEnter={() => setActiveIndex(flatIdx)}
                        className={cn(
                          'flex items-center gap-3 rounded-lg px-2.5 py-2.5 transition',
                          isActive
                            ? 'bg-tpc-red/10 text-tpc-text'
                            : 'text-tpc-text-secondary hover:bg-tpc-surface',
                        )}
                      >
                        <KindIcon kind={item.kind} active={isActive} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[13px] font-medium text-tpc-text">
                            {item.title}
                          </span>
                          <span className="block truncate text-[11.5px] text-tpc-text-tertiary">
                            {item.subtitle}
                          </span>
                        </span>
                        {isActive && (
                          <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-tpc-red">
                            ↵
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-tpc-border px-4 py-2">
          <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-tpc-border px-1 py-0.5">↑↓</kbd>
              navegar
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-tpc-border px-1 py-0.5">↵</kbd>
              abrir
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-tpc-border px-1 py-0.5">esc</kbd>
              fechar
            </span>
          </div>
          {flat.length > 0 && (
            <span className="font-mono text-[10px] text-tpc-text-tertiary">
              {flat.length} {flat.length === 1 ? 'resultado' : 'resultados'}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}

const KindIcon = ({ kind, active }: { kind: ResultKind; active: boolean }) => {
  const common = {
    width: 14,
    height: 14,
    viewBox: '0 0 24 24',
    fill: 'none' as const,
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  const wrapper = cn(
    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md border',
    active
      ? 'border-tpc-red/30 bg-tpc-red/10 text-tpc-red'
      : 'border-tpc-border bg-tpc-surface text-tpc-text-secondary',
  )
  if (kind === 'action')
    return (
      <span className={wrapper}>
        <svg {...common}>
          <path d="M13 2L4 14h8l-1 8 9-12h-8l1-8z" />
        </svg>
      </span>
    )
  if (kind === 'order')
    return (
      <span className={wrapper}>
        <svg {...common}>
          <path d="M21 11.5a8.4 8.4 0 0 1-9 8.5 8.4 8.4 0 0 1-3.7-.8L3 21l1.5-4.7A8.4 8.4 0 0 1 12 3a8.4 8.4 0 0 1 9 8.5z" />
        </svg>
      </span>
    )
  if (kind === 'car')
    return (
      <span className={wrapper}>
        <svg {...common}>
          <path d="M2 10l10-7 10 7v11H2z" />
          <path d="M8 21v-8h8v8" />
        </svg>
      </span>
    )
  if (kind === 'package')
    return (
      <span className={wrapper}>
        <svg {...common}>
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <path d="M3.27 6.96L12 12.01l8.73-5.05M12 22.08V12" />
        </svg>
      </span>
    )
  // service-presencial / service-arquivo
  return (
    <span className={wrapper}>
      <svg {...common}>
        <rect x="3" y="3" width="7" height="7" />
        <rect x="14" y="3" width="7" height="7" />
        <rect x="14" y="14" width="7" height="7" />
        <rect x="3" y="14" width="7" height="7" />
      </svg>
    </span>
  )
}
