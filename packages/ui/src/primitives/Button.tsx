import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { cn } from '../lib/cn'

type Variant = 'primary' | 'secondary' | 'ghost'

interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  variant?: Variant
  fullWidth?: boolean
  leading?: ReactNode
  trailing?: ReactNode
  children: ReactNode
}

const base =
  'inline-flex cursor-pointer items-center justify-center gap-2 rounded-full font-semibold tracking-tight transition disabled:cursor-not-allowed disabled:opacity-50'

const sizeMap = 'px-6 py-3 text-sm'

const variantMap: Record<Variant, string> = {
  primary:
    'bg-tpc-red text-tpc-text shadow-lg shadow-tpc-red/40 hover:bg-tpc-red-dark active:scale-[0.98]',
  secondary:
    'border border-tpc-border-strong bg-transparent text-tpc-text hover:bg-tpc-elevated active:scale-[0.98]',
  ghost: 'bg-transparent text-tpc-text-secondary hover:text-tpc-text hover:bg-tpc-elevated',
}

export const Button = ({
  variant = 'primary',
  fullWidth = false,
  leading,
  trailing,
  className,
  children,
  ...rest
}: ButtonProps) => {
  return (
    <button
      {...rest}
      className={cn(base, sizeMap, variantMap[variant], fullWidth && 'w-full', className)}
    >
      {leading}
      <span>{children}</span>
      {trailing}
    </button>
  )
}
