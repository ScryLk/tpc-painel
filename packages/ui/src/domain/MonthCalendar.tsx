'use client'

import { useMemo } from 'react'

import { cn } from '../lib/cn'

interface MonthCalendarProps {
  // Mês atualmente em foco (qualquer Date dentro dele).
  focused: Date
  // Data selecionada (uma só). Null = nada selecionado.
  selected: Date | null
  // Date "today" pra destacar com border.
  today?: Date
  // Datas a destacar como segundo dia de multi-dia (border tracejada).
  spanDays?: ReadonlyArray<Date>
  // Função que decide se um dia é selecionável. Retorna 'past' | 'closed' | 'ok'.
  dayState?: (date: Date) => 'past' | 'closed' | 'ok'
  // Callback ao escolher um dia ok.
  onSelect: (date: Date) => void
  // Navegação mês.
  onPrev: () => void
  onNext: () => void
  // Bloqueia navegação pra trás.
  minMonth?: Date
  // Bloqueia navegação pra frente.
  maxMonth?: Date
}

const monthName = (date: Date): string =>
  date
    .toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    .replace(/^./, (c) => c.toUpperCase())

const sameDay = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() &&
  a.getMonth() === b.getMonth() &&
  a.getDate() === b.getDate()

const sameMonth = (a: Date, b: Date): boolean =>
  a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()

const isBeforeMonth = (a: Date, b: Date): boolean => {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() < b.getFullYear()
  return a.getMonth() < b.getMonth()
}

const isAfterMonth = (a: Date, b: Date): boolean => {
  if (a.getFullYear() !== b.getFullYear()) return a.getFullYear() > b.getFullYear()
  return a.getMonth() > b.getMonth()
}

const DAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'] as const

export const MonthCalendar = ({
  focused,
  selected,
  today,
  spanDays,
  dayState,
  onSelect,
  onPrev,
  onNext,
  minMonth,
  maxMonth,
}: MonthCalendarProps) => {
  const cells = useMemo(() => {
    const year = focused.getFullYear()
    const month = focused.getMonth()
    const firstOfMonth = new Date(year, month, 1)
    const startCol = firstOfMonth.getDay() // 0=domingo
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const out: Array<{ date: Date | null }> = []
    for (let i = 0; i < startCol; i++) out.push({ date: null })
    for (let d = 1; d <= daysInMonth; d++) out.push({ date: new Date(year, month, d) })
    while (out.length % 7 !== 0) out.push({ date: null })
    return out
  }, [focused])

  const canPrev = !minMonth || !sameMonth(focused, minMonth) ? true : false
  const canNext = !maxMonth || !sameMonth(focused, maxMonth) ? true : false
  const canGoPrev = canPrev && (!minMonth || isAfterMonth(focused, minMonth))
  const canGoNext = canNext && (!maxMonth || isBeforeMonth(focused, maxMonth))

  return (
    <div className="select-none">
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={onPrev}
          disabled={!canGoPrev}
          aria-label="Mês anterior"
          className="flex h-8 w-8 items-center justify-center rounded-full text-tpc-text-secondary transition hover:bg-tpc-elevated disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <div className="text-sm font-semibold capitalize tracking-tight">{monthName(focused)}</div>
        <button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          aria-label="Próximo mês"
          className="flex h-8 w-8 items-center justify-center rounded-full text-tpc-text-secondary transition hover:bg-tpc-elevated disabled:opacity-30"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
      </div>

      <div className="mb-1.5 grid grid-cols-7 gap-1">
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="text-center font-mono text-[9px] uppercase tracking-[0.16em] text-tpc-text-tertiary"
          >
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, i) => {
          if (!cell.date) return <div key={i} className="aspect-square" />
          const day = cell.date
          const state = dayState ? dayState(day) : 'ok'
          const isSelected = selected && sameDay(day, selected)
          const isToday = today && sameDay(day, today)
          const isSpan = spanDays?.some((d) => sameDay(d, day))
          const clickable = state === 'ok'

          return (
            <button
              key={i}
              type="button"
              onClick={() => clickable && onSelect(day)}
              disabled={!clickable}
              className={cn(
                'tpc-num relative flex aspect-square items-center justify-center rounded-lg text-sm font-medium transition',
                isSelected && 'bg-tpc-red text-tpc-text shadow-[0_0_0_2px_rgba(225,38,28,0.3)]',
                !isSelected && isSpan && 'border border-dashed border-tpc-red/70 text-tpc-text',
                !isSelected && !isSpan && isToday && state === 'ok' && 'bg-tpc-red/10 text-tpc-text ring-1 ring-tpc-red/40',
                !isSelected && !isSpan && !isToday && state === 'ok' && 'text-tpc-text hover:bg-tpc-elevated',
                state === 'past' && 'text-tpc-text-tertiary opacity-50',
                state === 'closed' && 'text-tpc-text-tertiary',
                state !== 'ok' && 'cursor-not-allowed',
              )}
              style={
                state === 'closed' && !isSelected
                  ? {
                      backgroundImage:
                        'repeating-linear-gradient(-45deg, rgba(255,255,255,0.04) 0 2px, transparent 2px 5px)',
                    }
                  : undefined
              }
            >
              {day.getDate()}
              {isToday && state === 'ok' && !isSelected && !isSpan && (
                <span className="absolute bottom-1 h-1 w-1 rounded-full bg-tpc-red" />
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
