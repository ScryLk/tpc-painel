interface PointsDisplayProps {
  balance: number
  compact?: boolean
  onRecharge?: () => void
}

const formatter = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 })

const BoltIcon = () => (
  <svg
    width="11"
    height="11"
    viewBox="0 0 24 24"
    fill="currentColor"
    className="text-tpc-red drop-shadow-[0_0_4px_rgba(225,38,28,0.4)]"
  >
    <path d="M13 2L4 14h6l-1 8 9-12h-6l1-8z" />
  </svg>
)

export const PointsDisplay = ({ balance, compact = false, onRecharge }: PointsDisplayProps) => {
  return (
    <div className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-tpc-border bg-tpc-elevated py-1 pl-2.5 pr-1">
      <BoltIcon />
      <span
        className={
          compact
            ? 'tpc-num text-xs font-semibold leading-none'
            : 'tpc-num text-sm font-semibold leading-none'
        }
      >
        {formatter.format(balance)}
      </span>
      {onRecharge && (
        <button
          type="button"
          onClick={onRecharge}
          aria-label="Recarregar pontos"
          className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-tpc-red text-tpc-text shadow-[0_2px_8px_rgba(225,38,28,0.4)]"
        >
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
        </button>
      )}
    </div>
  )
}
