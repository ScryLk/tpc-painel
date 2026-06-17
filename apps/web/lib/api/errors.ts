// Camada de tradução de erros: pega qualquer Error (de API, JS interno,
// rede) e devolve uma mensagem em PT-BR amigável e segura pra exibir pro
// cliente. Nunca vaza stack trace, código interno do framework, ou detalhes
// que possam ajudar atacante.

interface ApiErrorShape {
  status?: number
  code?: string
  message?: string
}

// Mapa de código de erro do backend → mensagem amigável. Sobrescreve a
// mensagem crua que vem do API quando o código casa. Adicionar entradas aqui
// conforme novos códigos forem criados nos handlers.
const FRIENDLY_BY_CODE: Record<string, string> = {
  // Generic auth/auth
  UNAUTHORIZED: 'Tua sessão expirou. Faz login de novo pra continuar.',
  FORBIDDEN: 'Você não tem permissão pra fazer isso.',
  NOT_FOUND: 'Não encontramos o que você procurava.',
  VALIDATION_ERROR: 'Verifica os campos e tenta de novo.',
  INTERNAL_ERROR:
    'Algo deu errado do nosso lado. Tenta de novo em alguns segundos.',

  // Saldo / reserva
  INSUFFICIENT_BALANCE:
    'Saldo insuficiente pra essa operação. Recarrega pontos primeiro.',
  INVALID_RESERVATION:
    'A reserva não está mais válida. Refaz a operação.',

  // Carros
  CAR_HAS_PENDING_ORDERS:
    'Esse carro tem pedido em andamento. Conclua ou cancela antes de remover.',

  // Cadastro
  CPF_CNPJ_TAKEN: 'Esse CPF/CNPJ já está cadastrado em outra conta.',
  CPF_CNPJ_CONFLICT: 'Esse CPF/CNPJ já está cadastrado em outra conta.',

  // Solicitação presencial
  SOLICITACAO_NOT_CANCELABLE:
    'Essa solicitação não pode mais ser cancelada.',
  SOLICITACAO_IN_EXECUTION:
    'Serviço já está em execução. Fala com a TPC pelo WhatsApp.',

  // Admin · pacotes
  PACKAGE_HAS_PURCHASES:
    'Esse pacote já tem compras vinculadas. Desativa em vez de excluir.',
  TIER_TAKEN: 'Já existe um pacote com esse identificador.',

  // Admin · serviços
  SLUG_TAKEN: 'Já existe um serviço com esse identificador.',

  // Admin · usuários
  USER_DELETED: 'Essa conta está marcada como excluída.',
  CANNOT_CHANGE_OWN_ROLE: 'Não dá pra mudar a própria permissão.',

  // Admin · marketing
  CAMPAIGN_NOT_EDITABLE: 'Essa campanha não pode mais ser editada.',
  CAMPAIGN_NOT_DELETABLE:
    'Essa campanha não pode mais ser excluída (mantemos pra audit).',
  CAMPAIGN_NOT_SENDABLE: 'Essa campanha não pode ser enviada de novo.',

  // Integrações externas
  CLERK_UNAVAILABLE:
    'Serviço de autenticação está indisponível agora. Tenta de novo em alguns segundos.',
  CLERK_TOKEN_FAILED: 'Não foi possível gerar o link. Tenta de novo.',
  CLERK_REVOKE_FAILED: 'Não foi possível revogar a sessão. Tenta de novo.',
}

// Mensagens por status quando não há código específico. Cobre os casos onde
// o backend devolveu erro genérico sem código mapeado.
const FRIENDLY_BY_STATUS: Record<number, string> = {
  400: 'Os dados enviados estão inválidos. Verifica e tenta de novo.',
  401: 'Tua sessão expirou. Faz login de novo pra continuar.',
  403: 'Você não tem permissão pra essa ação.',
  404: 'Não encontramos o que você procurava.',
  408: 'A operação demorou demais. Tenta de novo.',
  409: 'Tem um conflito com o estado atual. Recarrega a página e tenta de novo.',
  413: 'O arquivo enviado é maior que o limite permitido.',
  429: 'Muitas tentativas em pouco tempo. Espera um instante e tenta de novo.',
}

// Pega a mensagem default por status (server side: 5xx → mensagem segura).
const fallbackForStatus = (status?: number, custom?: string): string => {
  if (status && status >= 500) {
    return 'Algo deu errado do nosso lado. Tenta de novo em alguns segundos.'
  }
  if (status && FRIENDLY_BY_STATUS[status]) {
    return FRIENDLY_BY_STATUS[status]!
  }
  return custom ?? 'Algo deu errado. Tenta de novo.'
}

// Detecta texto que parece técnico/inseguro pra expor: stack trace, código
// de framework Fastify, mensagem JS crua, etc. Quando bate, descartamos e
// usamos fallback amigável.
const looksTechnical = (msg: string): boolean => {
  if (msg.length > 240) return true // provavelmente stack trace
  if (/FST_ERR_|ECONN|ENOTFOUND|EAI_|ETIMEDOUT/.test(msg)) return true
  if (/\bat\s+\w+\s*\(/.test(msg)) return true // linha de stack
  if (/TypeError|ReferenceError|SyntaxError|RangeError/.test(msg)) return true
  if (/^Prisma|prisma:/i.test(msg)) return true
  if (/Internal server error$/i.test(msg)) return true
  return false
}

// API pública: pega qualquer erro e devolve uma mensagem segura pra exibir.
// Aceita um `fallback` opcional pra usar quando não conseguimos identificar
// nada útil (ex: "Falha ao salvar perfil").
export const friendlyMessage = (
  err: unknown,
  fallback?: string,
): string => {
  if (err == null) return fallback ?? 'Algo deu errado. Tenta de novo.'

  const e = err as ApiErrorShape & { name?: string }

  // 1. Código mapeado vence sempre (mais específico).
  if (e.code && FRIENDLY_BY_CODE[e.code]) {
    return FRIENDLY_BY_CODE[e.code]!
  }

  // 2. 500+: nunca confia no message; usa fallback genérico.
  if (e.status && e.status >= 500) {
    return fallbackForStatus(e.status, fallback)
  }

  // 3. Se a mensagem parecer técnica, usa fallback por status.
  if (!e.message || looksTechnical(e.message)) {
    return fallbackForStatus(e.status, fallback)
  }

  // 4. Mensagem da API parece amigável (4xx BusinessError típico): confia.
  return e.message
}
