// Pure business helpers usados por backend e frontend.

export interface PackageLike {
  points: number
  bonusPoints: number
  priceCents: number
}

// Pontos efetivamente creditados quando o pagamento de um pacote aprova.
export const totalCreditedPoints = (pkg: PackageLike): number =>
  pkg.points + pkg.bonusPoints

// Custo R$ por ponto (em centavos). Sem incluir bônus.
export const pricePerPointCents = (pkg: PackageLike): number =>
  pkg.points > 0 ? pkg.priceCents / pkg.points : 0

// Cartão sem juros: TPC absorve a taxa. Política do produto: parcelado libera
// só pra pacotes a partir de R$ 400 pra cobrir o custo da maquininha.
export const PARCELAMENTO_MIN_CENTS = 40000

export const canInstall = (pkg: PackageLike, installments: number): boolean => {
  if (installments < 1 || installments > 3) return false
  if (installments === 1) return true
  return pkg.priceCents >= PARCELAMENTO_MIN_CENTS
}

export const installmentValueCents = (priceCents: number, n: number): number => {
  if (n < 1) throw new Error('installments must be >= 1')
  return Math.round(priceCents / n)
}

// Saldo
export interface BalanceLike {
  available: number
  reserved: number
}

export const fitsBalance = (cost: number, balance: BalanceLike): boolean =>
  balance.available >= cost

export * from './agendar.js'
