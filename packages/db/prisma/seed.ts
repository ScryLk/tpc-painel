import { PrismaClient, ServiceCategory, MapState, Role } from '@prisma/client'

const prisma = new PrismaClient()

// ----------------------------------------------------------------------------
// Packages — 4 tiers fixos. Precos validados com TPC.
// Stage 1 e marcado como "popular" (badge MAIS ESCOLHIDO).
// TPC-DECISION: bonus/pct exatos por tier ainda em validacao.
// ----------------------------------------------------------------------------

const packages = [
  {
    tier: 'iniciante',
    name: 'Iniciante',
    points: 100,
    priceCents: 10000,
    bonusPoints: 0,
    bonusPct: 0,
    popular: false,
    sortOrder: 1,
  },
  {
    tier: 'stage1',
    name: 'Stage 1',
    points: 500,
    priceCents: 45000,
    bonusPoints: 50,
    bonusPct: 10,
    popular: true,
    sortOrder: 2,
  },
  {
    tier: 'pro',
    name: 'Pro',
    points: 1000,
    priceCents: 85000,
    bonusPoints: 150,
    bonusPct: 15,
    popular: false,
    sortOrder: 3,
  },
  {
    tier: 'vip',
    name: 'VIP',
    points: 2000,
    priceCents: 160000,
    bonusPoints: 400,
    bonusPct: 20,
    popular: false,
    sortOrder: 4,
  },
]

// ----------------------------------------------------------------------------
// Servicos presenciais — 12 itens do catalogo (Panambi).
// pts e precoAvulsoCents sao placeholders, TPC valida [TPC-DECISION].
// ----------------------------------------------------------------------------

const COMMON_MOTORS = ['flex', 'gasoline', 'diesel', 'turbo']

const presencialServices = [
  {
    slug: 'diagnostico',
    name: 'Diagnostico',
    description: 'Leitura de codigos da ECU e analise inicial. Sempre gratis.',
    category: ServiceCategory.CONFIG,
    pts: 0,
    priceAvulsoCents: 0,
    motorTypes: COMMON_MOTORS,
    durationDays: 1,
    sortOrder: 1,
  },
  {
    slug: 'stage1',
    name: 'Stage 1',
    description: 'Remap basico. Mais potencia e torque mantendo confiabilidade stock.',
    category: ServiceCategory.PERFORMANCE,
    pts: 500,
    priceAvulsoCents: 70000,
    motorTypes: ['flex', 'gasoline', 'diesel', 'turbo'],
    durationDays: 1,
    popular: true,
    sortOrder: 2,
  },
  {
    slug: 'stage2',
    name: 'Stage 2',
    description: 'Remap intermediario. Requer downpipe/intake. Ganho expressivo.',
    category: ServiceCategory.PERFORMANCE,
    pts: 1000,
    priceAvulsoCents: 130000,
    motorTypes: ['gasoline', 'turbo'],
    durationDays: 1,
    sortOrder: 3,
  },
  {
    slug: 'stage3',
    name: 'Stage 3',
    description: 'Remap avancado. Requer hardware dedicado. 2 dias de oficina.',
    category: ServiceCategory.PERFORMANCE,
    pts: 1500,
    priceAvulsoCents: 200000,
    motorTypes: ['gasoline', 'turbo'],
    durationDays: 2,
    sortOrder: 4,
  },
  {
    slug: 'pop-bang',
    name: 'Pop & Bang',
    description: 'Som esportivo no escape com estouros em desaceleracao.',
    category: ServiceCategory.AESTHETIC,
    pts: 200,
    priceAvulsoCents: 30000,
    motorTypes: ['gasoline', 'turbo'],
    durationDays: 1,
    sortOrder: 5,
  },
  {
    slug: 'burble',
    name: 'Burble',
    description: 'Crackles continuos em ponto neutro e desaceleracao.',
    category: ServiceCategory.AESTHETIC,
    pts: 250,
    priceAvulsoCents: 35000,
    motorTypes: ['gasoline', 'turbo'],
    durationDays: 1,
    sortOrder: 6,
  },
  {
    slug: 'hardcut',
    name: 'Hardcut',
    description: 'Corte agressivo de combustivel no limitador.',
    category: ServiceCategory.PERFORMANCE,
    pts: 300,
    priceAvulsoCents: 40000,
    motorTypes: ['gasoline', 'turbo'],
    durationDays: 1,
    sortOrder: 7,
  },
  {
    slug: 'launch-control',
    name: 'Launch Control',
    description: 'Largada otimizada com RPM fixo para tracao maxima.',
    category: ServiceCategory.PERFORMANCE,
    pts: 300,
    priceAvulsoCents: 40000,
    motorTypes: ['gasoline', 'turbo'],
    durationDays: 1,
    sortOrder: 8,
  },
  {
    slug: 'cold-start-delete',
    name: 'Cold Start Delete',
    description: 'Remove o regime de aquecimento ruidoso pos partida.',
    category: ServiceCategory.CONFIG,
    pts: 150,
    priceAvulsoCents: 20000,
    motorTypes: ['gasoline', 'turbo'],
    durationDays: 1,
    sortOrder: 9,
  },
  {
    slug: 'dpf-off',
    name: 'DPF Off',
    description: 'Desativacao do filtro de particulas em diesel.',
    category: ServiceCategory.CONFIG,
    pts: 400,
    priceAvulsoCents: 60000,
    motorTypes: ['diesel'],
    durationDays: 1,
    sortOrder: 10,
  },
  {
    slug: 'egr-off',
    name: 'EGR Off',
    description: 'Desativacao da recirculacao de gases em diesel.',
    category: ServiceCategory.CONFIG,
    pts: 300,
    priceAvulsoCents: 45000,
    motorTypes: ['diesel'],
    durationDays: 1,
    sortOrder: 11,
  },
  {
    slug: 'adblue-off',
    name: 'AdBlue Off',
    description: 'Desativacao do sistema AdBlue (SCR) em diesel.',
    category: ServiceCategory.CONFIG,
    pts: 350,
    priceAvulsoCents: 50000,
    motorTypes: ['diesel'],
    durationDays: 1,
    sortOrder: 12,
  },
]

// ----------------------------------------------------------------------------
// Servicos por arquivo — 9 fixos + 1 custom (pedido personalizado).
// Suporta principais ECU brands.
// ----------------------------------------------------------------------------

const COMMON_ECUS = ['Bosch', 'Siemens', 'Marelli', 'Continental', 'Delphi']

const remapServices = [
  {
    slug: 'remap-stage1',
    name: 'Stage 1 (arquivo)',
    description: 'Remap basico por arquivo. Envie o .bin, devolvemos em ate 4h.',
    pts: 500,
    supports: COMMON_ECUS,
    isCustom: false,
    sortOrder: 1,
  },
  {
    slug: 'remap-stage2',
    name: 'Stage 2 (arquivo)',
    description: 'Remap intermediario. Necessario downpipe/intake instalado.',
    pts: 1000,
    supports: ['Bosch', 'Siemens', 'Continental'],
    isCustom: false,
    sortOrder: 2,
  },
  {
    slug: 'remap-pop-bang',
    name: 'Pop & Bang (arquivo)',
    description: 'Estouros no escape em desaceleracao via arquivo.',
    pts: 200,
    supports: ['Bosch', 'Siemens', 'Marelli'],
    isCustom: false,
    sortOrder: 3,
  },
  {
    slug: 'remap-hardcut',
    name: 'Hardcut (arquivo)',
    description: 'Corte agressivo no limitador via arquivo.',
    pts: 300,
    supports: COMMON_ECUS,
    isCustom: false,
    sortOrder: 4,
  },
  {
    slug: 'remap-launch-control',
    name: 'Launch Control (arquivo)',
    description: 'Largada com RPM fixo configurado via arquivo.',
    pts: 300,
    supports: ['Bosch', 'Siemens', 'Continental'],
    isCustom: false,
    sortOrder: 5,
  },
  {
    slug: 'remap-dpf-off',
    name: 'DPF Off (arquivo)',
    description: 'Desativacao DPF via arquivo modificado.',
    pts: 400,
    supports: ['Bosch', 'Continental', 'Delphi'],
    isCustom: false,
    sortOrder: 6,
  },
  {
    slug: 'remap-egr-off',
    name: 'EGR Off (arquivo)',
    description: 'Desativacao EGR via arquivo modificado.',
    pts: 300,
    supports: ['Bosch', 'Continental', 'Delphi'],
    isCustom: false,
    sortOrder: 7,
  },
  {
    slug: 'remap-adblue-off',
    name: 'AdBlue Off (arquivo)',
    description: 'Desativacao AdBlue (SCR) via arquivo modificado.',
    pts: 350,
    supports: ['Bosch', 'Continental'],
    isCustom: false,
    sortOrder: 8,
  },
  {
    slug: 'remap-speed-limit-off',
    name: 'Speed Limit Off (arquivo)',
    description: 'Remocao do limitador de velocidade via arquivo.',
    pts: 200,
    supports: COMMON_ECUS,
    isCustom: false,
    sortOrder: 9,
  },
  {
    slug: 'remap-custom',
    name: 'Pedido personalizado',
    description: 'Pedido sem preco fixo. TPC orca em ate 24h apos receber o arquivo.',
    pts: 0,
    supports: COMMON_ECUS,
    isCustom: true,
    sortOrder: 99,
  },
]

// ----------------------------------------------------------------------------
// Users dummy de dev. Clerk IDs ficticios.
// ----------------------------------------------------------------------------

const dummyCustomer = {
  clerkId: 'dev_customer_001',
  email: 'cliente@exemplo.dev',
  name: 'Cliente Dev',
  phone: '+5555555550100',
  role: Role.CUSTOMER,
}

const dummyStaff = {
  clerkId: 'dev_staff_001',
  email: 'staff@tpc.dev',
  name: 'Staff TPC',
  phone: '+5555555550200',
  role: Role.STAFF,
}

const dummyCar = {
  brand: 'Volkswagen',
  model: 'Golf GTI',
  year: 2022,
  motorType: 'gasoline',
  plate: 'TPC1A23',
  color: 'Preto',
  isActive: true,
  mapState: MapState.STOCK,
}

// ----------------------------------------------------------------------------
// Main
// ----------------------------------------------------------------------------

async function main() {
  console.log('Seeding TPC Painel database...')

  for (const pkg of packages) {
    await prisma.package.upsert({
      where: { tier: pkg.tier },
      create: pkg,
      update: pkg,
    })
  }
  console.log(`  ${packages.length} packages`)

  for (const svc of presencialServices) {
    await prisma.service.upsert({
      where: { slug: svc.slug },
      create: svc,
      update: svc,
    })
  }
  console.log(`  ${presencialServices.length} presencial services`)

  for (const svc of remapServices) {
    await prisma.remapService.upsert({
      where: { slug: svc.slug },
      create: svc,
      update: svc,
    })
  }
  console.log(`  ${remapServices.length} remap services (incl. custom)`)

  const customer = await prisma.user.upsert({
    where: { clerkId: dummyCustomer.clerkId },
    create: {
      ...dummyCustomer,
      balance: { create: { available: 1250, reserved: 0 } },
      consent: { create: {} },
    },
    update: {},
    include: { cars: true, balance: true },
  })

  if (customer.cars.length === 0) {
    await prisma.car.create({
      data: { ...dummyCar, userId: customer.id },
    })
  }

  await prisma.user.upsert({
    where: { clerkId: dummyStaff.clerkId },
    create: { ...dummyStaff, consent: { create: {} } },
    update: {},
  })

  console.log(`  2 dummy users (1 customer with car + balance, 1 staff)`)
  console.log('Done.')
}

main()
  .catch((err) => {
    console.error(err)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
