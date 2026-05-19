import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'

interface TPCHeaderProps {
  title: string
  subtitle?: string
  back?: ReactNode
  right?: ReactNode
  className?: string
}

export const TPCHeader = ({ title, subtitle, back, right, className }: TPCHeaderProps) => {
  return (
    <header
      className={cn(
        'flex items-center gap-3 border-b border-tpc-border bg-tpc-bg px-5 py-4',
        className,
      )}
    >
      {back && <div className="shrink-0">{back}</div>}
      <div className="min-w-0 flex-1">
        <h1 className="truncate text-base font-semibold tracking-tight">{title}</h1>
        {subtitle && (
          <p className="truncate text-xs text-tpc-text-secondary">{subtitle}</p>
        )}
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </header>
  )
}
