'use client'

import { garageEmptyBanner } from '@/lib/copy/onboarding'

interface GarageEmptyBannerProps {
  onAddCar: () => void
}

export const GarageEmptyBanner = ({ onAddCar }: GarageEmptyBannerProps) => {
  return (
    <div className="mb-3 flex items-center gap-3.5 rounded-2xl border border-tpc-red/40 bg-tpc-red/[0.06] p-4 shadow-[0_0_24px_rgba(225,38,28,0.08)] md:p-5">
      <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl border border-tpc-red/40 bg-tpc-red/10 text-tpc-red">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M5 17H4a1 1 0 0 1-1-1v-3.2a2 2 0 0 1 .2-.86l1.6-3.3A2 2 0 0 1 6.6 7.5h10.8a2 2 0 0 1 1.8 1.14l1.6 3.3a2 2 0 0 1 .2.86V16a1 1 0 0 1-1 1h-1" />
          <path d="M9 17h6" />
          <circle cx="7" cy="17" r="2" />
          <circle cx="17" cy="17" r="2" />
        </svg>
      </div>

      <div className="min-w-0 flex-1">
        <div className="text-[14px] font-semibold tracking-tight text-tpc-text md:text-[15px]">
          {garageEmptyBanner.title}
        </div>
        <p className="mt-0.5 text-[12px] leading-snug text-tpc-text-secondary md:text-[12.5px]">
          {garageEmptyBanner.body}
        </p>
      </div>

      <button
        type="button"
        onClick={onAddCar}
        className="hidden flex-shrink-0 cursor-pointer items-center gap-1.5 rounded-full bg-tpc-red px-4 py-2 text-[12.5px] font-semibold text-tpc-text shadow-md shadow-tpc-red/30 transition hover:bg-tpc-red-dark sm:inline-flex"
      >
        <svg
          width="13"
          height="13"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
        {garageEmptyBanner.cta}
      </button>

      <button
        type="button"
        onClick={onAddCar}
        aria-label={garageEmptyBanner.cta}
        className="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-full bg-tpc-red text-tpc-text shadow-md shadow-tpc-red/30 transition hover:bg-tpc-red-dark sm:hidden"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
    </div>
  )
}
