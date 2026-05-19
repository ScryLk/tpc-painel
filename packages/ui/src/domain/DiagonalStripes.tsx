import type { CSSProperties } from 'react'

interface DiagonalStripesProps {
  width?: number
  height?: number
  color?: string
  spacing?: number
  thickness?: number
  angle?: number
  opacity?: number
  mask?: 'top-right' | 'bottom-left' | 'top-left' | 'bottom-right' | 'none'
  className?: string
}

const masks: Record<NonNullable<DiagonalStripesProps['mask']>, string | undefined> = {
  'top-right': 'linear-gradient(225deg, black, transparent 70%)',
  'bottom-left': 'linear-gradient(45deg, black, transparent 70%)',
  'top-left': 'linear-gradient(135deg, black, transparent 70%)',
  'bottom-right': 'linear-gradient(315deg, black, transparent 70%)',
  none: undefined,
}

export const DiagonalStripes = ({
  width = 140,
  height = 140,
  color = '#a41b14',
  spacing = 8,
  thickness = 1.5,
  angle = -55,
  opacity = 0.5,
  mask = 'top-right',
  className,
}: DiagonalStripesProps) => {
  const maskImage = masks[mask]
  const style: CSSProperties = {
    width,
    height,
    opacity,
    backgroundImage: `repeating-linear-gradient(${angle}deg, ${color} 0 ${thickness}px, transparent ${thickness}px ${spacing}px)`,
    ...(maskImage
      ? {
          maskImage,
          WebkitMaskImage: maskImage,
        }
      : {}),
  }
  return <div aria-hidden className={className} style={style} />
}
