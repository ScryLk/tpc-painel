import type { FastifyPluginAsync } from 'fastify'
import { z } from 'zod'

import { createReadStream } from 'node:fs'
import { stat } from 'node:fs/promises'

import { queueEmailIfConsented, siteUrl } from '../emails/jobs.js'
import {
  EXPORT_USER_DATA_JOB,
  type ExportUserDataPayload,
} from '../jobs/export-user-data.js'
import { clerk } from '../lib/clerk.js'
import { enqueue } from '../lib/queue.js'
import {
  BusinessError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnauthorizedError,
} from '../lib/errors.js'

// Configuração explícita do que o user pode incluir no export. Mantemos
// "general" sempre on (dados pessoais são o mínimo do export); o resto
// é opt-in.
const exportBodySchema = z.object({
  includeTransactions: z.boolean().default(true),
  includeOrders: z.boolean().default(true),
  includeFiles: z.boolean().default(true),
  includeMessages: z.boolean().default(false),
})

const consentsBodySchema = z
  .object({
    marketingEmail: z.boolean().optional(),
    marketingWhatsapp: z.boolean().optional(),
    transactionalEmail: z.boolean().optional(),
    transactionalWhatsapp: z.boolean().optional(),
    transactionalPush: z.boolean().optional(),
  })
  .refine((v) => Object.keys(v).length > 0, {
    message: 'Pelo menos um campo deve ser informado',
  })

// Body aceita ambas as formas de confirmação. Qual é exigida depende do
// estado da conta no Clerk (passwordEnabled), checado no handler.
const deletionBodySchema = z.object({
  reason: z.string().max(500).optional(),
  confirmText: z.string().optional(),
  password: z.string().optional(),
})

// Quantos dias o user tem pra cancelar antes da exclusão efetiva.
const DELETION_GRACE_DAYS = 30

const shapeExport = (e: {
  id: string
  status: string
  r2Key: string | null
  expiresAt: Date | null
  createdAt: Date
  updatedAt: Date
}) => {
  const isReady = e.status === 'READY' && e.r2Key
  const notExpired = !e.expiresAt || e.expiresAt > new Date()
  return {
    id: e.id,
    status: e.status,
    ready: Boolean(isReady && notExpired),
    // Path relativo; frontend prepende NEXT_PUBLIC_API_URL ao montar a URL.
    downloadPath: isReady && notExpired ? `/me/data-export/${e.id}/download` : null,
    expiresAt: e.expiresAt?.toISOString() ?? null,
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
  }
}

export const lgpdRoutes: FastifyPluginAsync = async (app) => {
  // ========================================================================
  // Data export — direito de portabilidade (LGPD art. 18 V)
  // ========================================================================

  // POST /me/data-export — agenda geração do ZIP. Endpoint cria a row em
  // DataExportRequest com status PROCESSING. Job export-user-data (a wirar)
  // pega a row, monta o ZIP e sobe pro R2.
  app.post(
    '/me/data-export',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const body = exportBodySchema.parse(request.body)

      // Throttle: 1 export PROCESSING ativo por user. Evita fila enorme se
      // user spammar o botão.
      const inFlight = await app.prisma.dataExportRequest.findFirst({
        where: { userId: user.id, status: 'PROCESSING' },
        select: { id: true, createdAt: true },
      })
      if (inFlight) {
        throw new ConflictError(
          'EXPORT_IN_PROGRESS',
          'Já existe um export em processamento. Aguarda o email com o link.',
        )
      }

      const created = await app.prisma.dataExportRequest.create({
        data: {
          userId: user.id,
          status: 'PROCESSING',
          // TODO: passar o body como JSON no Job pra export-user-data saber
          // o que incluir. Por hora, persistimos os flags via Notification
          // simples como observability.
        },
      })

      await app.prisma.notification.create({
        data: {
          userId: user.id,
          kind: 'INFO',
          title: 'Solicitação recebida',
          body: 'Estamos preparando teu pacote de dados. Te avisamos por email quando estiver pronto.',
          source: 'lgpd-export',
        },
      })

      const payload: ExportUserDataPayload = {
        exportId: created.id,
        options: body,
      }
      await enqueue(EXPORT_USER_DATA_JOB, payload)

      return { export: shapeExport(created) }
    },
  )

  // GET /me/data-export/latest — status do export mais recente (qualquer
  // status). Frontend usa pra mostrar "em processamento" ou link de
  // download quando READY.
  app.get(
    '/me/data-export/latest',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const latest = await app.prisma.dataExportRequest.findFirst({
        where: { userId: user.id },
        orderBy: { createdAt: 'desc' },
      })

      return { export: latest ? shapeExport(latest) : null }
    },
  )

  // GET /me/data-export/:id/download — stream do JSON do export.
  // Em dev/MVP o r2Key começa com "local:" e aponta pra arquivo no disco
  // gerado pelo job export-user-data. Quando R2 estiver wirado, gera
  // signed URL aqui e redireciona, sem streaming local.
  app.get(
    '/me/data-export/:id/download',
    { preHandler: [app.requireAuth] },
    async (request, reply) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const { id } = z.object({ id: z.string().uuid() }).parse(request.params)

      const row = await app.prisma.dataExportRequest.findUnique({
        where: { id },
        select: {
          id: true,
          userId: true,
          status: true,
          r2Key: true,
          expiresAt: true,
        },
      })
      if (!row) throw new NotFoundError('DataExportRequest')
      if (row.userId !== user.id) throw new ForbiddenError('Export não pertence ao usuário')
      if (row.status !== 'READY' || !row.r2Key) {
        throw new BusinessError(
          'EXPORT_NOT_READY',
          'Export ainda não está pronto. Aguarde o email.',
        )
      }
      if (row.expiresAt && row.expiresAt < new Date()) {
        await app.prisma.dataExportRequest.update({
          where: { id },
          data: { status: 'EXPIRED' },
        })
        throw new BusinessError(
          'EXPORT_EXPIRED',
          'Esse export expirou. Solicite um novo pacote.',
        )
      }

      if (!row.r2Key.startsWith('local:')) {
        // TODO: wire signed URL do R2 e redirect 302 quando storage real
        // estiver pronto. Por enquanto só lidamos com path local.
        throw new BusinessError(
          'EXPORT_STORAGE_UNSUPPORTED',
          'Storage não suportado neste ambiente.',
        )
      }

      const filePath = row.r2Key.slice('local:'.length)
      try {
        await stat(filePath)
      } catch {
        throw new NotFoundError('Arquivo do export')
      }

      reply
        .header('Content-Type', 'application/json')
        .header(
          'Content-Disposition',
          `attachment; filename="tpc-export-${id}.json"`,
        )
      return reply.send(createReadStream(filePath))
    },
  )

  // ========================================================================
  // Consentimentos — controle granular (LGPD art. 8 § 5)
  // ========================================================================

  // GET /me/consents — retorna preferências atuais. Cria com defaults
  // (marketing OFF, transacional ON) se ainda não existe.
  app.get(
    '/me/consents',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const consent = await app.prisma.consent.upsert({
        where: { userId: user.id },
        create: { userId: user.id },
        update: {},
      })

      return {
        consents: {
          marketingEmail: consent.marketingEmail,
          marketingWhatsapp: consent.marketingWhatsapp,
          transactionalEmail: consent.transactionalEmail,
          transactionalWhatsapp: consent.transactionalWhatsapp,
          transactionalPush: consent.transactionalPush,
          updatedAt: consent.updatedAt.toISOString(),
        },
      }
    },
  )

  // PUT /me/consents — atualiza parcial. Aceita qualquer subconjunto dos
  // 5 flags. Mantém defaults se row não existe.
  app.put(
    '/me/consents',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const body = consentsBodySchema.parse(request.body)

      const updated = await app.prisma.consent.upsert({
        where: { userId: user.id },
        create: { userId: user.id, ...body },
        update: body,
      })

      return {
        consents: {
          marketingEmail: updated.marketingEmail,
          marketingWhatsapp: updated.marketingWhatsapp,
          transactionalEmail: updated.transactionalEmail,
          transactionalWhatsapp: updated.transactionalWhatsapp,
          transactionalPush: updated.transactionalPush,
          updatedAt: updated.updatedAt.toISOString(),
        },
      }
    },
  )

  // ========================================================================
  // Account deletion — direito de esquecimento (LGPD art. 18 VI)
  // ========================================================================

  // POST /me/account/deletion — agenda exclusão. Carência de 30 dias antes
  // do anonimato efetivo. User pode cancelar via DELETE até lá.
  // Lei 8.846/94 obriga manter Transactions por 5 anos, então o job de
  // execução anonimiza PII mas preserva transações + purchases.
  app.post(
    '/me/account/deletion',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()
      const body = deletionBodySchema.parse(request.body)

      // Conta com senha: re-auth obrigatória via Clerk (verifica contra
      // backend deles, não check local). Conta sem senha (login social
      // puro): fallback pro texto EXCLUIR.
      const clerkUser = await clerk.users.getUser(user.clerkId)
      const requiresPassword = Boolean(clerkUser.passwordEnabled)

      if (requiresPassword) {
        if (!body.password) {
          throw new BusinessError(
            'PASSWORD_REQUIRED',
            'Senha obrigatória pra confirmar exclusão.',
          )
        }
        const result = await clerk.users.verifyPassword({
          userId: user.clerkId,
          password: body.password,
        })
        if (!result.verified) {
          throw new BusinessError('PASSWORD_INVALID', 'Senha incorreta.')
        }
      } else if (body.confirmText !== 'EXCLUIR') {
        throw new BusinessError(
          'CONFIRMATION_INVALID',
          'Digite EXCLUIR (maiúsculas) pra confirmar a exclusão.',
        )
      }

      const existing = await app.prisma.accountDeletion.findUnique({
        where: { userId: user.id },
      })
      if (existing && !existing.cancelledAt && !existing.executedAt) {
        throw new ConflictError(
          'DELETION_PENDING',
          'Já existe uma solicitação de exclusão pendente. Cancela antes de criar outra.',
        )
      }

      const scheduledFor = new Date(
        Date.now() + DELETION_GRACE_DAYS * 24 * 60 * 60 * 1000,
      )

      // Se existia uma cancelada, atualiza. Senão, cria.
      const deletion = existing
        ? await app.prisma.accountDeletion.update({
            where: { userId: user.id },
            data: {
              reason: body.reason ?? null,
              scheduledFor,
              executedAt: null,
              cancelledAt: null,
            },
          })
        : await app.prisma.accountDeletion.create({
            data: {
              userId: user.id,
              reason: body.reason ?? null,
              scheduledFor,
            },
          })

      await app.prisma.user.update({
        where: { id: user.id },
        data: { pendingDeletion: true },
      })

      await app.prisma.notification.create({
        data: {
          userId: user.id,
          kind: 'WARNING',
          title: 'Exclusão agendada',
          body: `Tua conta será excluída em ${DELETION_GRACE_DAYS} dias. Faz login antes pra cancelar.`,
          source: 'lgpd-deletion',
        },
      })

      const scheduledForBR = new Intl.DateTimeFormat('pt-BR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
      }).format(scheduledFor)

      await queueEmailIfConsented(app.prisma, user.id, {
        kind: 'accountDeletionScheduled',
        to: user.email,
        props: {
          siteUrl: siteUrl(),
          customerName: user.name,
          scheduledForBR,
          graceDays: DELETION_GRACE_DAYS,
          cancelUrl: `${siteUrl()}/perfil`,
        },
      })

      return {
        deletion: {
          id: deletion.id,
          scheduledFor: deletion.scheduledFor.toISOString(),
          graceDays: DELETION_GRACE_DAYS,
        },
      }
    },
  )

  // DELETE /me/account/deletion — cancela exclusão agendada. Reativa user.
  app.delete(
    '/me/account/deletion',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const existing = await app.prisma.accountDeletion.findUnique({
        where: { userId: user.id },
      })
      if (!existing || existing.cancelledAt || existing.executedAt) {
        throw new NotFoundError('AccountDeletion')
      }

      await app.prisma.$transaction([
        app.prisma.accountDeletion.update({
          where: { userId: user.id },
          data: { cancelledAt: new Date() },
        }),
        app.prisma.user.update({
          where: { id: user.id },
          data: { pendingDeletion: false },
        }),
      ])

      await queueEmailIfConsented(app.prisma, user.id, {
        kind: 'accountDeletionCancelled',
        to: user.email,
        props: {
          siteUrl: siteUrl(),
          customerName: user.name,
          dashboardUrl: `${siteUrl()}/dashboard`,
        },
      })

      await app.prisma.notification.create({
        data: {
          userId: user.id,
          kind: 'SUCCESS',
          title: 'Exclusão cancelada',
          body: 'Tua conta voltou ao estado normal. Tudo no lugar.',
          source: 'lgpd-deletion',
        },
      })

      return { ok: true }
    },
  )

  // GET /me/account/deletion — checa se tem exclusão pendente.
  app.get(
    '/me/account/deletion',
    { preHandler: [app.requireAuth] },
    async (request) => {
      const user = request.user
      if (!user) throw new UnauthorizedError()

      const existing = await app.prisma.accountDeletion.findUnique({
        where: { userId: user.id },
      })

      const pending =
        existing && !existing.cancelledAt && !existing.executedAt
          ? {
              id: existing.id,
              scheduledFor: existing.scheduledFor.toISOString(),
              graceDays: DELETION_GRACE_DAYS,
              createdAt: existing.createdAt.toISOString(),
            }
          : null

      return { deletion: pending }
    },
  )
}
