export interface OnboardingSlide {
  title: string
  body: string
  bullets?: Array<{ label: string; text: string }>
  note?: string
}

export const onboardingWelcomeTitle = (firstName: string) =>
  `Tudo certo, ${firstName}!`

export const onboardingSlides: OnboardingSlide[] = [
  {
    title: '',
    body:
      'Bem-vindo ao catálogo da TPC Performance. Aqui você explora nossos serviços de remap de motor e contrata como preferir: presencial na nossa oficina em Panambi/RS, ou enviando seu arquivo pelo chat. Sem mensalidade, sem letra miúda.',
  },
  {
    title: 'Dois jeitos de contratar',
    body: '',
    bullets: [
      {
        label: 'Presencial',
        text:
          'Você agenda, leva o carro até a TPC, e a gente executa no dia marcado. Stage 1, Pop & Bang, DPF, e mais.',
      },
      {
        label: 'Por arquivo',
        text:
          'Você manda o .bin ou .ori pelo chat, a gente devolve modificado. Funciona pra quem mora longe de Panambi.',
      },
    ],
    note: 'Diagnóstico inicial é sempre grátis pelo app.',
  },
  {
    title: 'Vamos cadastrar seu carro?',
    body:
      'É rápido, 5 passos. A gente precisa pra mostrar só os serviços compatíveis com seu motor e calcular garantia certinha.',
    note: 'Até 3 carros por conta. Pode adicionar ou remover depois.',
  },
]

export const onboardingCtas = {
  next: 'Próximo',
  back: 'Voltar',
  addCar: 'Cadastrar meu carro',
  explore: 'Explorar primeiro',
} as const

export const garageEmptyBanner = {
  title: 'Cadastre seu primeiro carro',
  body:
    'Sem carro cadastrado, a gente não consegue filtrar serviços compatíveis nem calcular garantia. Leva 1 minuto.',
  cta: 'Adicionar carro',
} as const
