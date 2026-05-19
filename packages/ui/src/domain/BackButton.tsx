interface BackButtonProps {
  onClick?: () => void
  href?: string
  label?: string
}

const ArrowLeft = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
    <path d="M15 18l-6-6 6-6" />
  </svg>
)

export const BackButton = ({ onClick, label = 'Voltar' }: BackButtonProps) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-full border border-tpc-border text-tpc-text-secondary transition hover:bg-tpc-elevated hover:text-tpc-text"
    >
      <ArrowLeft />
    </button>
  )
}
