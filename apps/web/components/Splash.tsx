import { DiagonalStripes, TPCLogo } from '@tpc/ui'

interface SplashProps {
  message?: string
}

export const Splash = ({ message = 'Carregando sistema' }: SplashProps) => {
  return (
    <div className="relative flex min-h-screen w-full flex-col overflow-hidden bg-tpc-bg text-tpc-text">
      <div className="pointer-events-none absolute right-0 top-0 opacity-50">
        <DiagonalStripes
          width={260}
          height={260}
          thickness={1.5}
          spacing={11}
          mask="top-right"
        />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 opacity-50">
        <DiagonalStripes
          width={260}
          height={260}
          thickness={1.5}
          spacing={11}
          mask="bottom-left"
        />
      </div>

      <div className="relative flex flex-1 flex-col items-center justify-center px-10">
        <TPCLogo size={110} />
        <div className="mt-7 font-mono text-[11px] uppercase tracking-[0.42em] text-tpc-text-tertiary">
          Performance
        </div>
      </div>

      <div className="relative mx-auto flex w-full max-w-[1280px] items-baseline justify-between px-6 pb-6 md:px-10">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
          {message}
        </div>
      </div>

      <div
        className="relative h-[3px] overflow-hidden bg-[#1a0a08]"
        role="progressbar"
        aria-label={message}
      >
        <div
          className="absolute inset-y-0 left-0 w-1/3 animate-[tpc-splash_1.6s_ease-in-out_infinite] bg-gradient-to-r from-tpc-red-dark to-tpc-red shadow-[0_0_8px_rgba(225,38,28,0.6)]"
        />
      </div>
    </div>
  )
}
