// Overrides locais pro Clerk embutido no AuthSplitLayout.
//
// O ClerkProvider em app/layout.tsx ja define o visual base (cores, radius,
// h-11, rounded-lg, etc). Aqui ficam SO as classes que sao especificas do
// embed (card transparente porque o chrome vai pro cardBox externo, header
// escondido, ajustes de layout). Evita duplicar utilitarios no DOM.
export const authEmbedAppearance = {
  layout: {
    socialButtonsPlacement: 'bottom' as const,
    socialButtonsVariant: 'blockButton' as const,
    unsafe_disableDevelopmentModeWarnings: true,
  },
  elements: {
    cardBox:
      '!w-full !max-w-none !rounded-none !border-0 !bg-transparent !shadow-none !backdrop-blur-none !p-0 !m-0 !overflow-visible',
    card: '!bg-transparent !border-0 !shadow-none !p-0 !m-0 !overflow-visible',
    header: '!hidden',
    headerTitle: '!hidden',
    headerSubtitle: '!hidden',
    rootBox: '!w-full',
    main: '!w-full !p-0 !m-0 gap-3',
    form: '!w-full !p-0 !m-0 gap-3',
    formFieldInput: '!w-full',
    formFieldRow: 'text-left',
    formFieldLabel: 'text-left',
    socialButtons:
      '!grid !grid-cols-[repeat(auto-fit,minmax(140px,1fr))] !gap-2 !w-full !p-0 !m-0',
    dividerRow: '!my-1 !p-0 !mx-0',
    footer:
      '!w-full !bg-transparent !border-t !border-tpc-border !p-0 !pt-5 !mt-4 !shadow-none [&_*]:!bg-transparent [&_*]:!border-0 [&_*]:!shadow-none [&>div:last-child]:!hidden',
    footerAction: '!bg-transparent !border-0 !p-0 !m-0',
  },
}
