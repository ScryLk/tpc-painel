// Dados de contato da TPC usados em templates de email + outros lugares
// que renderizam assinatura/contato. Centraliza pra trocar em 1 lugar.
//
// [TPC-DECISION #5] endereço real da oficina ainda pendente. Valores aqui
// são placeholders plausíveis; substituir quando TPC confirmar.
//
// [TPC-DECISION #4] WhatsApp Business definitivo. Hoje aponta pra wa.me
// direto do número, troca quando provider (Twilio/Z-API/Cloud) for ativado.

export const BUSINESS = {
  name: 'Thomas PowerChip',
  shortName: 'TPC Performance',
  email: 'atendimento@tpcperformance.com.br',
  phone: '+55 55 99999-9999',
  whatsappUrl: 'https://wa.me/5555999999999',
  instagramHandle: '@tpc.performance',
  instagramUrl: 'https://instagram.com/tpc.performance',
  address: {
    street: 'Av. Pátria, 0',
    neighborhood: 'Centro',
    city: 'Panambi',
    state: 'RS',
    cep: '98280-000',
  },
} as const

export type Business = typeof BUSINESS
