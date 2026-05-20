import type { Metadata, Viewport } from 'next'
import { ClerkProvider } from '@clerk/nextjs'
import { ptBR } from '@clerk/localizations'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'

import './globals.css'

export const metadata: Metadata = {
  title: 'TPC Painel',
  description: 'Carteira pré-paga TPC Performance',
}

export const viewport: Viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <ClerkProvider
      localization={ptBR}
      appearance={{
        variables: {
          colorPrimary: '#e1261c',
          colorBackground: '#0a0a0a',
          colorInputBackground: '#141414',
          colorText: '#ebebeb',
          colorTextSecondary: '#888888',
          colorDanger: '#e1261c',
          colorSuccess: '#22e07a',
          colorWarning: '#ffb800',
          colorNeutral: '#ffffff',
          colorInputText: '#ebebeb',
          borderRadius: '0.75rem',
          fontFamily: 'var(--font-geist-sans), system-ui, sans-serif',
          fontFamilyButtons: 'var(--font-geist-sans), system-ui, sans-serif',
          fontSize: '0.875rem',
        },
        elements: {
          rootBox: 'w-full',
          card: 'bg-tpc-surface border border-tpc-border rounded-2xl shadow-2xl',
          headerTitle: 'text-tpc-text font-semibold tracking-tight',
          headerSubtitle: 'text-tpc-text-secondary',
          socialButtonsBlockButton:
            'bg-tpc-elevated border border-tpc-border hover:bg-tpc-elevated-2 transition rounded-full h-11 w-full justify-center [&>*]:!flex-none',
          socialButtonsBlockButtonText: 'text-tpc-text font-medium',
          dividerLine: 'bg-tpc-border',
          dividerText: 'text-tpc-text-tertiary uppercase tracking-[0.16em] text-[10px]',
          formFieldLabel: 'text-tpc-text-secondary text-xs font-medium',
          formFieldLabelRow: 'mb-1.5',
          formFieldHintText: 'text-tpc-text-tertiary',
          formFieldInput:
            'bg-tpc-elevated border border-tpc-border text-tpc-text rounded-lg h-12 focus:border-tpc-red focus:ring-1 focus:ring-tpc-red transition',
          formButtonPrimary:
            'bg-tpc-red hover:bg-tpc-red-dark text-tpc-text font-medium rounded-full h-10 w-full shadow-sm shadow-tpc-red/20 transition active:scale-[0.98] normal-case tracking-tight text-sm',
          footer: 'bg-tpc-surface border-t border-tpc-border',
          footerAction: 'text-tpc-text-secondary',
          footerActionText: 'text-tpc-text-secondary',
          footerActionLink: 'text-tpc-red hover:text-tpc-red-dark font-semibold',
          identityPreview: 'bg-tpc-elevated border border-tpc-border',
          identityPreviewText: 'text-tpc-text',
          identityPreviewEditButton: 'text-tpc-red hover:text-tpc-red-dark',
          formFieldInputShowPasswordButton: 'text-tpc-text-tertiary hover:text-tpc-text',
          alertText: 'text-tpc-text',
          formFieldSuccessText: 'text-tpc-green',
          formFieldErrorText: 'text-tpc-red',
        },
      }}
    >
      <html lang="pt-BR" className={`${GeistSans.variable} ${GeistMono.variable}`}>
        <body className="min-h-screen antialiased">{children}</body>
      </html>
    </ClerkProvider>
  )
}
