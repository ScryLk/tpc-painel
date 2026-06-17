import { unlink } from 'node:fs/promises'

import type { Job } from 'bullmq'

import { prisma } from '@tpc/db'

import { SEND_EMAIL_JOB } from '../emails/jobs.js'
import { clerk } from '../lib/clerk.js'
import { env } from '../lib/env.js'
import { defineJob, enqueue } from '../lib/queue.js'

export const EXECUTE_ACCOUNT_DELETION_JOB = 'execute-account-deletion'

interface ProcessResult {
  scanned: number
  executed: number
  failed: number
}

const anonymizedEmail = (userId: string): string => `deleted-${userId}@tpc.invalid`

// Roda 1x por dia. Procura AccountDeletion com scheduledFor no passado,
// executedAt null e cancelledAt null. Pra cada uma:
//   1. Email final pro endereço REAL (antes de anonimizar)
//   2. Deleta hard: PII e dados ligados ao user
//   3. Anonimiza User (preserva FK referencing — transactions, purchases)
//   4. Marca AccountDeletion.executedAt
//   5. Best-effort: deleta Clerk user (eles não conseguem mais logar)
//
// Erro num user não impede o próximo — continua o batch. Falha de Clerk
// não reverte a anonimização do DB (Clerk delete pode ser feito manual
// depois se preciso, mas a parte critica — apagar PII — já rodou).
const executeOne = async (
  deletionId: string,
  log: (msg: string) => void,
): Promise<{ ok: boolean }> => {
  const deletion = await prisma.accountDeletion.findUnique({
    where: { id: deletionId },
    include: {
      user: {
        select: {
          id: true,
          clerkId: true,
          name: true,
          email: true,
          deletedAt: true,
        },
      },
    },
  })

  if (!deletion || deletion.executedAt || deletion.cancelledAt) {
    return { ok: true } // idempotência
  }
  if (deletion.user.deletedAt) {
    // User já marcado deleted (caso raro mas blindagem). Só marca o
    // AccountDeletion pra não tentar de novo.
    await prisma.accountDeletion.update({
      where: { id: deletionId },
      data: { executedAt: new Date() },
    })
    return { ok: true }
  }

  const { user } = deletion
  const executedAt = new Date()
  const executedAtBR = new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
  }).format(executedAt)

  // Email final ANTES de anonimizar — único momento em que o endereço
  // real ainda existe na nossa base. Best-effort.
  try {
    await enqueue(SEND_EMAIL_JOB, {
      payload: {
        kind: 'accountDeletionExecuted',
        to: user.email,
        props: {
          siteUrl: env.NEXT_PUBLIC_SITE_URL,
          customerName: user.name,
          executedAtBR,
        },
      },
    })
  } catch (err) {
    log(`final-email enqueue failed for user ${user.id}: ${err}`)
  }

  // Coleta arquivos locais de DataExportRequest antes de deletar (precisa
  // dos r2Keys pra unlinkar do disco). Fora do delete-many porque o select
  // após delete seria vazio.
  const exports = await prisma.dataExportRequest.findMany({
    where: { userId: user.id },
    select: { r2Key: true },
  })

  await prisma.$transaction(async (tx) => {
    // Messages primeiro (referenciam RemapFile via fileId — FK pra ser
    // limpa antes de deletar RemapFile).
    await tx.message.deleteMany({
      where: {
        OR: [
          { remapOrder: { userId: user.id } },
          { senderUserId: user.id },
        ],
      },
    })

    // Arquivos .bin do user (todos os RemapFile dos orders dele)
    await tx.remapFile.deleteMany({
      where: { remapOrder: { userId: user.id } },
    })

    await tx.notification.deleteMany({ where: { userId: user.id } })
    await tx.savedCard.deleteMany({ where: { userId: user.id } })
    await tx.address.deleteMany({ where: { userId: user.id } })
    await tx.car.deleteMany({ where: { userId: user.id } })
    await tx.consent.deleteMany({ where: { userId: user.id } })
    await tx.dataExportRequest.deleteMany({ where: { userId: user.id } })
    await tx.pointsBalance.deleteMany({ where: { userId: user.id } })

    // Anonimiza o User. Mantém row + clerkId (orphan, mas FK refs
    // continuam válidas em Transaction/Purchase/Solicitacao/RemapOrder).
    await tx.user.update({
      where: { id: user.id },
      data: {
        name: 'Usuário excluído',
        email: anonymizedEmail(user.id),
        cpfCnpj: null,
        phone: null,
        avatarUrl: null,
        pendingDeletion: false,
        deletedAt: executedAt,
      },
    })

    await tx.accountDeletion.update({
      where: { id: deletionId },
      data: { executedAt },
    })
  })

  // Side effects fora da transação (não dá pra rollback Clerk/fs anyway).

  // Apaga JSONs locais de exports (path no formato 'local:/abs/path').
  for (const exp of exports) {
    if (exp.r2Key?.startsWith('local:')) {
      const path = exp.r2Key.slice('local:'.length)
      try {
        await unlink(path)
      } catch {
        // Arquivo já pode não existir (expirou e foi limpo, ou nunca foi
        // criado se job export-user-data falhou). Não importa.
      }
    }
  }

  // Delete Clerk — final pra eles. Best-effort: se falhar (rede, rate
  // limit), DB já está limpo e podemos deletar manualmente depois pelo
  // dashboard do Clerk.
  try {
    await clerk.users.deleteUser(user.clerkId)
  } catch (err) {
    log(`clerk delete failed for ${user.clerkId}: ${err}`)
  }

  return { ok: true }
}

const processor = async (job: Pick<Job, 'log'>): Promise<ProcessResult> => {
  const now = new Date()

  const pending = await prisma.accountDeletion.findMany({
    where: {
      scheduledFor: { lte: now },
      executedAt: null,
      cancelledAt: null,
    },
    select: { id: true },
    orderBy: { scheduledFor: 'asc' },
    take: 100, // batch limit por execução; resto pega no próximo ciclo
  })

  job.log(`scanned ${pending.length} pending deletions`)

  let executed = 0
  let failed = 0
  for (const { id } of pending) {
    try {
      const res = await executeOne(id, (msg) => job.log(msg))
      if (res.ok) executed += 1
      else failed += 1
    } catch (err) {
      failed += 1
      job.log(`failed deletion ${id}: ${err instanceof Error ? err.message : err}`)
    }
  }

  return { scanned: pending.length, executed, failed }
}

defineJob({
  name: EXECUTE_ACCOUNT_DELETION_JOB,
  processor,
})

// Export pra testes
export { executeOne as executeAccountDeletionOne }
