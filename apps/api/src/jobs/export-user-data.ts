import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

import type { Job } from 'bullmq'

import { prisma } from '@tpc/db'

import { defineJob, enqueue } from '../lib/queue.js'
import { SEND_EMAIL_JOB } from '../emails/jobs.js'
import { env } from '../lib/env.js'

export const EXPORT_USER_DATA_JOB = 'export-user-data'

export interface ExportUserDataPayload extends Record<string, unknown> {
  exportId: string
  options: {
    includeTransactions: boolean
    includeOrders: boolean
    includeFiles: boolean
    includeMessages: boolean
  }
}

const EXPORT_TTL_DAYS = 7

// Resolve onde gravar o ZIP/JSON em dev. Em prod isso vai pra R2; aqui
// guardamos local no workspace root e o endpoint de download faz stream.
// Caminho é relativo pra rodar igual em Mac/Linux/container.
const exportPath = (exportId: string): string =>
  resolve(process.cwd(), '.data', 'exports', `${exportId}.json`)

const buildExportPayload = async (
  userId: string,
  options: ExportUserDataPayload['options'],
) => {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      address: true,
      cars: { where: { deletedAt: null } },
      consent: true,
      savedCards: {
        where: { deletedAt: null },
        select: {
          brand: true,
          lastFour: true,
          expMonth: true,
          expYear: true,
          isDefault: true,
          createdAt: true,
        },
      },
    },
  })
  if (!user) throw new Error(`User ${userId} not found`)

  const base = {
    exportedAt: new Date().toISOString(),
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      cpfCnpj: user.cpfCnpj,
      role: user.role,
      createdAt: user.createdAt.toISOString(),
    },
    address: user.address
      ? {
          cep: user.address.cep,
          street: user.address.street,
          number: user.address.number,
          complement: user.address.complement,
          neighborhood: user.address.neighborhood,
          city: user.address.city,
          state: user.address.state,
        }
      : null,
    cars: user.cars.map((c) => ({
      id: c.id,
      brand: c.brand,
      model: c.model,
      year: c.year,
      plate: c.plate,
      motorType: c.motorType,
      color: c.color,
      mapState: c.mapState,
      isActive: c.isActive,
      createdAt: c.createdAt.toISOString(),
    })),
    consents: user.consent
      ? {
          marketingEmail: user.consent.marketingEmail,
          marketingWhatsapp: user.consent.marketingWhatsapp,
          transactionalEmail: user.consent.transactionalEmail,
          transactionalWhatsapp: user.consent.transactionalWhatsapp,
          transactionalPush: user.consent.transactionalPush,
        }
      : null,
    savedCards: user.savedCards.map((c) => ({
      brand: c.brand,
      lastFour: c.lastFour,
      expMonth: c.expMonth,
      expYear: c.expYear,
      isDefault: c.isDefault,
      createdAt: c.createdAt.toISOString(),
    })),
  }

  const optional: Record<string, unknown> = {}

  if (options.includeTransactions) {
    const transactions = await prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        amount: true,
        balanceAfter: true,
        createdAt: true,
        purchaseId: true,
        solicitacaoId: true,
        remapOrderId: true,
        reservationId: true,
      },
    })
    optional.transactions = transactions.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
    }))

    const purchases = await prisma.purchase.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        status: true,
        amountCents: true,
        pointsCredited: true,
        mpPaymentMethod: true,
        installments: true,
        cpfCnpj: true,
        createdAt: true,
        paidAt: true,
        package: { select: { name: true } },
      },
    })
    optional.purchases = purchases.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      paidAt: p.paidAt?.toISOString() ?? null,
      packageName: p.package?.name ?? null,
      package: undefined,
    }))
  }

  if (options.includeOrders) {
    const solicitacoes = await prisma.solicitacao.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: { service: { select: { name: true } }, car: { select: { brand: true, model: true, plate: true } } },
    })
    optional.solicitacoes = solicitacoes.map((s) => ({
      id: s.id,
      protocol: s.protocol,
      status: s.status,
      scheduledDate: s.scheduledDate.toISOString(),
      slot: s.slot,
      pointsReserved: s.pointsReserved,
      pointsDebited: s.pointsDebited,
      serviceName: s.service.name,
      car: s.car,
      createdAt: s.createdAt.toISOString(),
    }))

    const remapOrders = await prisma.remapOrder.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
      include: {
        remapService: { select: { name: true } },
        car: { select: { brand: true, model: true, plate: true } },
      },
    })
    optional.remapOrders = remapOrders.map((o) => ({
      id: o.id,
      protocol: o.protocol,
      status: o.status,
      isCustomQuote: o.isCustomQuote,
      pointsReserved: o.pointsReserved,
      pointsDebited: o.pointsDebited,
      serviceName: o.remapService?.name ?? null,
      car: o.car,
      createdAt: o.createdAt.toISOString(),
    }))
  }

  if (options.includeFiles) {
    const files = await prisma.remapFile.findMany({
      where: { remapOrder: { userId }, deletedAt: null },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        kind: true,
        fileName: true,
        fileSize: true,
        sha256: true,
        remapOrderId: true,
        createdAt: true,
        r2Key: true,
      },
    })
    // r2Key vira "downloadUrl: null" enquanto storage real não tá wirado.
    // Quando wirar R2, gerar signed URL com 7d TTL aqui.
    optional.files = files.map((f) => ({
      id: f.id,
      kind: f.kind,
      fileName: f.fileName,
      fileSize: f.fileSize,
      sha256: f.sha256,
      remapOrderId: f.remapOrderId,
      createdAt: f.createdAt.toISOString(),
      downloadUrl: null,
    }))
  }

  if (options.includeMessages) {
    const messages = await prisma.message.findMany({
      where: { remapOrder: { userId } },
      orderBy: { createdAt: 'asc' },
      select: {
        id: true,
        remapOrderId: true,
        senderType: true,
        body: true,
        fileId: true,
        createdAt: true,
      },
    })
    optional.messages = messages.map((m) => ({
      ...m,
      createdAt: m.createdAt.toISOString(),
    }))
  }

  return { ...base, ...optional }
}

const processor = async (job: Job<ExportUserDataPayload>) => {
  const { exportId, options } = job.data

  const exportRow = await prisma.dataExportRequest.findUnique({
    where: { id: exportId },
    include: { user: { select: { id: true, email: true, name: true } } },
  })
  if (!exportRow) throw new Error(`Export ${exportId} not found`)
  if (exportRow.status !== 'PROCESSING') {
    // Idempotência: re-execução não refaz trabalho.
    return { skipped: true, reason: 'already-processed' }
  }

  try {
    const payload = await buildExportPayload(exportRow.userId, options)
    const filePath = exportPath(exportId)
    await mkdir(dirname(filePath), { recursive: true })
    await writeFile(filePath, JSON.stringify(payload, null, 2), 'utf8')

    const expiresAt = new Date(Date.now() + EXPORT_TTL_DAYS * 24 * 60 * 60 * 1000)

    await prisma.dataExportRequest.update({
      where: { id: exportId },
      data: {
        status: 'READY',
        r2Key: `local:${filePath}`,
        expiresAt,
      },
    })

    // Email de pronto. Best-effort: erro no email não muda o status do
    // export (já tá READY, user pode baixar pela UI).
    try {
      await enqueue(SEND_EMAIL_JOB, {
        payload: {
          kind: 'dataExportReady',
          to: exportRow.user.email,
          props: {
            siteUrl: env.NEXT_PUBLIC_SITE_URL,
            customerName: exportRow.user.name,
            exportId,
            downloadUrl: `${env.NEXT_PUBLIC_SITE_URL}/perfil`,
            expiresAt: expiresAt.toISOString(),
            includedSections: Object.entries(options)
              .filter(([, on]) => on)
              .map(([k]) => k),
          },
        },
      })
    } catch (err) {
      job.log(`failed to enqueue email: ${err instanceof Error ? err.message : err}`)
    }

    await prisma.notification.create({
      data: {
        userId: exportRow.userId,
        kind: 'SUCCESS',
        title: 'Pacote de dados pronto',
        body: 'Teu export está disponível em Perfil → Privacidade. Link expira em 7 dias.',
        link: '/perfil',
        source: 'lgpd-export',
      },
    })

    return { ok: true, exportId, expiresAt }
  } catch (err) {
    await prisma.dataExportRequest.update({
      where: { id: exportId },
      data: { status: 'FAILED' },
    })
    throw err
  }
}

defineJob<ExportUserDataPayload>({
  name: EXPORT_USER_DATA_JOB,
  processor,
})

export { exportPath }
