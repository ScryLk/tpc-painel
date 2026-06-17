import Link from 'next/link'
import type { ReactNode } from 'react'

interface LegalDocumentProps {
  title: string
  version: string
  effectiveDate: string
  lastUpdated: string
  children: ReactNode
}

export const LegalDocument = ({
  title,
  version,
  effectiveDate,
  lastUpdated,
  children,
}: LegalDocumentProps) => (
  <div className="mx-auto max-w-[760px] px-5 py-10 md:py-14">
    <Link
      href="/perfil"
      className="mb-6 inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.15em] text-tpc-text-tertiary transition hover:text-tpc-text"
    >
      <svg
        width="11"
        height="11"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden
      >
        <path d="M15 18l-6-6 6-6" />
      </svg>
      Voltar ao perfil
    </Link>

    <header className="mb-10 border-b border-tpc-border pb-6">
      <h1 className="text-[28px] font-bold leading-tight tracking-[-0.03em] text-tpc-text">
        {title}
      </h1>
      <div className="mt-3 flex flex-wrap gap-3 font-mono text-[10px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
        <span>versão {version}</span>
        <span>·</span>
        <span>vigente desde {effectiveDate}</span>
        <span>·</span>
        <span>atualizado em {lastUpdated}</span>
      </div>
    </header>

    <article className="prose-tpc">{children}</article>

    <footer className="mt-12 border-t border-tpc-border pt-6 font-mono text-[10px] uppercase tracking-[0.12em] text-tpc-text-tertiary">
      TPC Performance · todos os direitos reservados
    </footer>
  </div>
)

export const Section = ({
  num,
  title,
  children,
}: {
  num: string
  title: string
  children: ReactNode
}) => (
  <section className="mb-8">
    <h2 className="mb-3 flex items-baseline gap-2.5 text-[18px] font-bold tracking-[-0.02em] text-tpc-text">
      <span className="font-mono text-[12px] text-tpc-red">{num}</span>
      {title}
    </h2>
    <div className="space-y-3 text-[14px] leading-relaxed text-tpc-text-secondary">
      {children}
    </div>
  </section>
)

export const P = ({ children }: { children: ReactNode }) => (
  <p className="text-tpc-text-secondary">{children}</p>
)

export const UL = ({ children }: { children: ReactNode }) => (
  <ul className="ml-5 list-disc space-y-1.5 marker:text-tpc-text-tertiary">
    {children}
  </ul>
)

export const LI = ({ children }: { children: ReactNode }) => (
  <li className="text-tpc-text-secondary">{children}</li>
)

export const Strong = ({ children }: { children: ReactNode }) => (
  <strong className="font-semibold text-tpc-text">{children}</strong>
)

export const Pending = ({ children }: { children: ReactNode }) => (
  <span className="inline-flex items-center gap-1 rounded border border-tpc-yellow/40 bg-tpc-yellow/10 px-1.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.1em] text-tpc-yellow">
    {children}
  </span>
)

export const Table = ({
  headers,
  rows,
}: {
  headers: string[]
  rows: string[][]
}) => (
  <div className="overflow-x-auto rounded-xl border border-tpc-border">
    <table className="w-full border-collapse text-[13px]">
      <thead>
        <tr className="bg-tpc-surface">
          {headers.map((h) => (
            <th
              key={h}
              className="border-b border-tpc-border px-3.5 py-2.5 text-left font-mono text-[10px] font-semibold uppercase tracking-[0.12em] text-tpc-text-tertiary"
            >
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i}>
            {row.map((cell, j) => (
              <td
                key={j}
                className="border-b border-tpc-border px-3.5 py-2.5 align-top text-tpc-text-secondary last:border-b-0"
              >
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)
