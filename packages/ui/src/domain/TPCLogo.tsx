import { cn } from '../lib/cn'

interface TPCLogoProps {
  size?: number
  className?: string
}

// Logo oficial TPC Performance. Single source pra brand.
// Asset em apps/web/public/_LOGO_TCP.png.
export const TPCLogo = ({ size = 28, className }: TPCLogoProps) => {
  return (
    <img
      src="/_LOGO_TCP.png"
      alt="TPC Performance"
      style={{ height: size, width: 'auto' }}
      className={cn('block select-none', className)}
    />
  )
}
