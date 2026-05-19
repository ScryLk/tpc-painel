import type { ReactNode } from 'react'

import { cn } from '../lib/cn.js'

interface SecHeadingProps {
  children: ReactNode
  action?: ReactNode
  className?: string
}

export const SecHeading = ({ children, action, className }: SecHeadingProps) => {
  return (
    <div className={cn('flex items-center justify-between px-5 pb-2 pt-3.5', className)}>
      <span className="tpc-eyebrow">{children}</span>
      {action}
    </div>
  )
}
