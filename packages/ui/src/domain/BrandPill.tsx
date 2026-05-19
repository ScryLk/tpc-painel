type Brand = 'pix' | 'visa' | 'master' | 'elo'

interface BrandPillProps {
  kind: Brand
}

const shell =
  'inline-flex h-6 min-w-[42px] items-center justify-center rounded-md bg-white px-2.5 py-1'

export const BrandPill = ({ kind }: BrandPillProps) => {
  if (kind === 'pix') {
    return (
      <div className={shell} title="Pix">
        <svg width="14" height="14" viewBox="0 0 24 24">
          <g fill="#32BCAD">
            <path d="M12 2.5l3.5 3.5h-2L12 8 10.5 6h-2L12 2.5z" />
            <path d="M2.5 12L6 8.5v2L8 12l-2 1.5v2L2.5 12z" />
            <path d="M21.5 12L18 15.5v-2L16 12l2-1.5v-2L21.5 12z" />
            <path d="M12 21.5L8.5 18h2L12 16l1.5 2h2L12 21.5z" />
          </g>
        </svg>
      </div>
    )
  }
  if (kind === 'visa') {
    return (
      <div className={shell} title="Visa">
        <span
          style={{ color: '#1A1F71', letterSpacing: '-0.04em' }}
          className="font-sans text-[11px] font-extrabold italic"
        >
          VISA
        </span>
      </div>
    )
  }
  if (kind === 'master') {
    return (
      <div className={shell} title="Mastercard">
        <svg width="22" height="14" viewBox="0 0 36 22">
          <circle cx="13" cy="11" r="9" fill="#EB001B" />
          <circle cx="23" cy="11" r="9" fill="#F79E1B" />
          <path d="M18 4.5a8.95 8.95 0 0 0 0 13 8.95 8.95 0 0 0 0-13z" fill="#FF5F00" />
        </svg>
      </div>
    )
  }
  return (
    <div className={shell} title="Elo">
      <span className="font-sans text-[11px] font-extrabold italic" style={{ letterSpacing: '-0.02em' }}>
        <span style={{ color: '#FFB700' }}>e</span>
        <span style={{ color: '#EA1F26' }}>l</span>
        <span style={{ color: '#00A4E0' }}>o</span>
      </span>
    </div>
  )
}
