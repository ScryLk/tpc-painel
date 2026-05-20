import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

interface ScreenChromeProps {
  children: ReactNode
  className?: string
}

export const ScreenChrome = ({ children, className }: ScreenChromeProps) => {
  return (
    <div
      className={cn(
        'mx-auto flex min-h-screen w-full max-w-[420px] flex-col bg-tpc-bg text-tpc-text',
        className,
      )}
    >
      {children}
    </div>
  )
}
