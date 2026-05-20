'use client'

import type { ReactNode } from 'react'

import { cn } from '../lib/cn'

interface DesktopDrawerProps {
  open: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
  widthClassName?: string
}

export const DesktopDrawer = ({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  widthClassName = 'w-[480px]',
}: DesktopDrawerProps) => {
  if (!open) return null
  return (
    <>
      <div
        role="presentation"
        onClick={onClose}
        className="absolute inset-0 z-10 bg-black/60"
      />
      <aside
        className={cn(
          'absolute bottom-0 right-0 top-0 z-20 flex flex-col border-l border-tpc-border bg-tpc-bg shadow-[-20px_0_60px_rgba(0,0,0,0.5)]',
          widthClassName,
        )}
      >
        <div className="flex items-center gap-3.5 border-b border-tpc-border px-6 py-5">
          <div className="min-w-0 flex-1">
            {subtitle && (
              <div className="mb-1 font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-tpc-text-tertiary">
                {subtitle}
              </div>
            )}
            <div className="text-lg font-bold tracking-tight text-tpc-text">
              {title}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg border border-tpc-border bg-tpc-surface text-tpc-text-secondary"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="tpc-scroll flex-1 overflow-y-auto p-6">{children}</div>

        {footer && (
          <div className="border-t border-tpc-border bg-gradient-to-b from-transparent to-tpc-bg px-5 py-4">
            {footer}
          </div>
        )}
      </aside>
    </>
  )
}
