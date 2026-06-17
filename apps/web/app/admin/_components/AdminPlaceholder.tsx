import { Card, DiagonalStripes } from '@tpc/ui'

export const AdminPlaceholder = ({
  title,
  description,
}: {
  title: string
  description: string
}) => {
  return (
    <div className="mx-auto max-w-[1100px] px-6 py-10 md:px-10">
      <Card className="relative overflow-hidden p-10 text-center">
        <div className="pointer-events-none absolute inset-0 opacity-20">
          <DiagonalStripes
            width={1000}
            height={400}
            thickness={1.2}
            spacing={14}
            mask="top-right"
          />
        </div>
        <div className="relative flex flex-col items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-tpc-border bg-tpc-elevated text-tpc-text-tertiary">
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
              <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
            </svg>
          </div>
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-tpc-text">
              {title}
            </h1>
            <p className="mt-1.5 text-[13px] text-tpc-text-secondary">
              {description}
            </p>
          </div>
          <span className="rounded-full border border-tpc-yellow/40 bg-tpc-yellow/10 px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-tpc-yellow">
            Em construção
          </span>
        </div>
      </Card>
    </div>
  )
}
