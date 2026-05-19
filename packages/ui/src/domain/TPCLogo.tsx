interface TPCLogoProps {
  size?: number
  className?: string
}

// T-P-C italico com stripes vermelhas atras do C. Single source pra brand.
export const TPCLogo = ({ size = 28, className }: TPCLogoProps) => {
  const stripeBg = `repeating-linear-gradient(-58deg, #e1261c 0 ${size * 0.07}px, transparent ${size * 0.07}px ${size * 0.12}px)`
  return (
    <span
      aria-label="TPC"
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'baseline',
        fontFamily: 'var(--font-sans)',
        fontStyle: 'italic',
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1,
        letterSpacing: '-0.06em',
        color: '#ebebeb',
      }}
    >
      <span>T</span>
      <span style={{ color: '#e1261c' }}>P</span>
      <span style={{ position: 'relative', display: 'inline-block' }}>
        <span
          aria-hidden
          style={{
            position: 'absolute',
            inset: '8% 0 8% 0',
            backgroundImage: stripeBg,
            opacity: 0.85,
            pointerEvents: 'none',
            maskImage: 'linear-gradient(to right, black 60%, transparent 100%)',
            WebkitMaskImage: 'linear-gradient(to right, black 60%, transparent 100%)',
          }}
        />
        <span style={{ position: 'relative' }}>C</span>
      </span>
    </span>
  )
}
