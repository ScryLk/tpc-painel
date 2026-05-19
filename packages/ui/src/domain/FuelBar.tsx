import { cn } from '../lib/cn.js'

interface FuelBarProps {
  pct: number
  segments?: number
  height?: number
  className?: string
}

// Barra segmentada estilo painel automotivo. pct entre 0 e 1.
export const FuelBar = ({ pct, segments = 18, height = 6, className }: FuelBarProps) => {
  const clamped = Math.max(0, Math.min(1, pct))
  const filledCount = Math.round(segments * clamped)

  return (
    <div className={cn('flex w-full items-center gap-[2px]', className)} style={{ height }}>
      {Array.from({ length: segments }).map((_, i) => {
        const filled = i < filledCount
        return (
          <span
            key={i}
            className={cn(
              'block h-full flex-1 rounded-[1px]',
              filled
                ? i >= segments - 3
                  ? 'bg-tpc-red shadow-[0_0_6px_rgba(225,38,28,0.6)]'
                  : 'bg-tpc-red'
                : 'bg-tpc-elevated-2',
            )}
          />
        )
      })}
    </div>
  )
}
