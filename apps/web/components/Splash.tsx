import { DiagonalStripes, ScreenChrome, TPCLogo } from '@tpc/ui'

interface SplashProps {
  message?: string
}

// Tela de carregamento. Logo central + decorative stripes nos cantos +
// progress indeterminado animado. Usado pelo loading.tsx nos boundaries
// que renderizam de cara enquanto Next.js resolve dados.
export const Splash = ({ message = 'Carregando sistema' }: SplashProps) => {
  return (
    <ScreenChrome className="relative overflow-hidden">
      <div className="pointer-events-none absolute right-0 top-0 opacity-50">
        <DiagonalStripes width={180} height={180} thickness={1.5} spacing={10} mask="top-right" />
      </div>
      <div className="pointer-events-none absolute bottom-0 left-0 opacity-50">
        <DiagonalStripes
          width={180}
          height={180}
          thickness={1.5}
          spacing={10}
          mask="bottom-left"
        />
      </div>

      <div className="flex flex-1 flex-col items-center justify-center px-10">
        <TPCLogo size={92} />
        <div className="mt-7 font-mono text-[10px] uppercase tracking-[0.42em] text-tpc-text-tertiary">
          Performance
        </div>
      </div>

      <div className="flex items-baseline justify-between px-6 pb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-tpc-text-tertiary">
          {message.split(' ').map((word, i, arr) => (
            <span key={i}>
              {word}
              {i < arr.length - 1 && <br />}
            </span>
          ))}
        </div>
      </div>

      <div
        className="relative h-[3px] overflow-hidden bg-[#1a0a08]"
        role="progressbar"
        aria-label={message}
      >
        <div
          className="absolute inset-y-0 left-0 w-1/3 animate-[tpc-splash_1.6s_ease-in-out_infinite] bg-gradient-to-r from-tpc-red-dark to-tpc-red shadow-[0_0_8px_rgba(225,38,28,0.6)]"
          style={{ animationName: 'tpc-splash' }}
        />
      </div>
    </ScreenChrome>
  )
}
