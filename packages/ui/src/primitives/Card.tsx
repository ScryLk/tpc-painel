import type { HTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn.js'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean
  children: ReactNode
}

export const Card = ({ elevated = false, className, children, ...rest }: CardProps) => {
  return (
    <div
      {...rest}
      className={cn(
        'rounded-2xl border border-tpc-border p-5',
        elevated ? 'bg-tpc-elevated' : 'bg-tpc-surface',
        className,
      )}
    >
      {children}
    </div>
  )
}
