type CarType = 'sedan' | 'hatch' | 'suv' | 'coupe' | 'wagon' | 'pickup'

interface CarSilhouetteProps {
  type?: CarType
  width?: number
  color?: string
  className?: string
}

const paths: Record<CarType, string> = {
  sedan:
    'M30 80 L60 50 L130 50 L160 80 L240 80 L260 80 C266 80 270 86 270 92 L270 110 L20 110 L20 92 C20 86 24 80 30 80 Z',
  hatch:
    'M30 80 L65 50 L160 50 L200 80 L260 80 C266 80 270 86 270 92 L270 110 L20 110 L20 92 C20 86 24 80 30 80 Z',
  suv:
    'M30 70 L60 38 L150 38 L210 70 L260 70 C266 70 270 76 270 82 L270 110 L20 110 L20 82 C20 76 24 70 30 70 Z',
  coupe:
    'M30 85 L75 55 L195 55 L260 85 L270 90 L270 110 L20 110 L20 90 Z',
  wagon:
    'M30 80 L60 50 L210 50 L240 80 L260 80 C266 80 270 86 270 92 L270 110 L20 110 L20 92 C20 86 24 80 30 80 Z',
  pickup:
    'M30 80 L60 50 L140 50 L160 75 L260 75 L270 80 L270 110 L20 110 L20 92 C20 86 24 80 30 80 Z',
}

// Silhueta SVG generica do carro. Linhas decorativas dos faróis + rodas.
// Pra MVP serve pra contexto visual (hero do card, empty state).
export const CarSilhouette = ({
  type = 'sedan',
  width = 200,
  color = '#e1261c',
  className,
}: CarSilhouetteProps) => {
  const path = paths[type]
  return (
    <svg
      width={width}
      height={width * 0.4}
      viewBox="0 0 290 130"
      fill="none"
      stroke={color}
      strokeWidth="1.6"
      strokeLinejoin="round"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d={path} />
      {/* faróis */}
      <line x1="22" y1="86" x2="40" y2="86" />
      <line x1="250" y1="86" x2="268" y2="86" />
      {/* rodas */}
      <circle cx="78" cy="110" r="14" fill="#0a0a0a" />
      <circle cx="78" cy="110" r="6" />
      <circle cx="212" cy="110" r="14" fill="#0a0a0a" />
      <circle cx="212" cy="110" r="6" />
    </svg>
  )
}

export type { CarType }
