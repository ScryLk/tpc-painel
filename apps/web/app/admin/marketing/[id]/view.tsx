'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'

import { Card, SecHeading, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

import type { CampaignDetail } from './page'

interface Props {
  initial: CampaignDetail
}

interface FormState {
  subject: string
  title: string
  body: string
  ctaText: string
  ctaUrl: string
}

const buildForm = (c: CampaignDetail): FormState => ({
  subject: c.subject,
  title: c.title,
  body: c.body,
  ctaText: c.ctaText ?? '',
  ctaUrl: c.ctaUrl ?? '',
})

export const CampanhaDetailView = ({ initial }: Props) => {
  const router = useRouter()
  const api = useApi()
  const [campaign, setCampaign] = useState<CampaignDetail>(initial)
  const [form, setForm] = useState<FormState>(buildForm(initial))
  const [savingPatch, setSavingPatch] = useState(false)
  const [sendingTest, setSendingTest] = useState(false)
  const [sending, setSending] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [audienceCount, setAudienceCount] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isDraft = campaign.status === 'DRAFT'
  const readOnly = !isDraft

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // Detecta o que mudou pra mandar só o diff no PATCH.
  const dirty = useMemo(() => {
    return (
      form.subject !== campaign.subject ||
      form.title !== campaign.title ||
      form.body !== campaign.body ||
      (form.ctaText || null) !== (campaign.ctaText || null) ||
      (form.ctaUrl || null) !== (campaign.ctaUrl || null)
    )
  }, [form, campaign])

  // Fetch audience count uma vez. Só DRAFT precisa porque pra SENT/SENDING
  // o estimatedReach já tá salvo.
  useEffect(() => {
    if (!isDraft) return
    let alive = true
    api
      .get<{ count: number }>(`/admin/marketing-campaigns/${campaign.id}/audience-count`)
      .then((res) => {
        if (alive) setAudienceCount(res.count)
      })
      .catch(() => {
        /* silencia */
      })
    return () => {
      alive = false
    }
  }, [api, campaign.id, isDraft])

  const save = async () => {
    if (savingPatch || !dirty) return
    setError(null)
    setSuccess(null)
    setSavingPatch(true)
    try {
      const patch: Record<string, unknown> = {}
      if (form.subject !== campaign.subject) patch.subject = form.subject
      if (form.title !== campaign.title) patch.title = form.title
      if (form.body !== campaign.body) patch.body = form.body
      if ((form.ctaText || null) !== (campaign.ctaText || null))
        patch.ctaText = form.ctaText || null
      if ((form.ctaUrl || null) !== (campaign.ctaUrl || null))
        patch.ctaUrl = form.ctaUrl || null

      await api.patch(`/admin/marketing-campaigns/${campaign.id}`, patch)
      setCampaign((c) => ({
        ...c,
        subject: form.subject,
        title: form.title,
        body: form.body,
        ctaText: form.ctaText || null,
        ctaUrl: form.ctaUrl || null,
      }))
      setSuccess('Alterações salvas')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSavingPatch(false)
    }
  }

  const testSend = async () => {
    if (sendingTest) return
    setError(null)
    setSuccess(null)
    setSendingTest(true)
    try {
      // Se há mudanças não salvas, salva antes pra o test refletir o estado
      // atual.
      if (dirty) await save()
      const res = await api.post<{ ok: boolean; sentTo: string }>(
        `/admin/marketing-campaigns/${campaign.id}/test-send`,
        {},
      )
      setSuccess(`Test enviado pra ${res.sentTo}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha no test send')
    } finally {
      setSendingTest(false)
    }
  }

  const sendForReal = async () => {
    if (sending) return
    const target = audienceCount ?? '?'
    if (
      !confirm(
        `Disparar campanha "${campaign.title}" pra ${target} usuários opt-in?\n\nNão dá pra desfazer depois.`,
      )
    )
      return
    setError(null)
    setSuccess(null)
    setSending(true)
    try {
      if (dirty) await save()
      await api.post(`/admin/marketing-campaigns/${campaign.id}/send`, {})
      setCampaign((c) => ({ ...c, status: 'SENDING' }))
      setSuccess('Campanha enfileirada. Atualizando…')
      setTimeout(() => router.refresh(), 1500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao enviar')
    } finally {
      setSending(false)
    }
  }

  const remove = async () => {
    if (deleting) return
    if (
      !confirm(
        `Excluir o rascunho "${campaign.title}"?\n\nIsso é permanente.`,
      )
    )
      return
    setError(null)
    setDeleting(true)
    try {
      await api.del(`/admin/marketing-campaigns/${campaign.id}`)
      router.push('/admin/marketing')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir')
      setDeleting(false)
    }
  }

  const totalDelivered =
    (campaign.stats.SENT ?? 0) +
    (campaign.stats.DELIVERED ?? 0) +
    (campaign.stats.OPENED ?? 0) +
    (campaign.stats.CLICKED ?? 0)
  const totalFailed =
    (campaign.stats.FAILED ?? 0) + (campaign.stats.BOUNCED ?? 0)

  return (
    <div className="mx-auto max-w-[1200px] px-6 py-6 md:px-8">
      <div className="mb-5">
        <Link
          href="/admin/marketing"
          className="inline-flex items-center gap-1.5 text-[12px] text-tpc-text-secondary transition hover:text-tpc-text"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M15 18l-6-6 6-6" />
          </svg>
          Voltar pra lista
        </Link>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col gap-4">
          <section>
            <SecHeading className="px-0 pb-3 pt-0">Composição</SecHeading>
            <Card className="flex flex-col gap-3 p-5">
              <Field label="Assunto (subject do email)">
                <Input
                  value={form.subject}
                  onChange={(v) => update('subject', v)}
                  maxLength={180}
                  disabled={readOnly || savingPatch}
                />
              </Field>
              <Field label="Título (heading dentro do email)">
                <Input
                  value={form.title}
                  onChange={(v) => update('title', v)}
                  maxLength={200}
                  disabled={readOnly || savingPatch}
                />
              </Field>
              <Field
                label="Corpo"
                hint="parágrafos separados por linha em branco"
              >
                <textarea
                  value={form.body}
                  onChange={(e) => update('body', e.target.value)}
                  maxLength={20000}
                  disabled={readOnly || savingPatch}
                  rows={12}
                  className="tpc-scroll w-full resize-y rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[13px] leading-relaxed text-tpc-text focus:border-tpc-border-strong focus:outline-none disabled:opacity-60"
                />
              </Field>
              <div className="grid grid-cols-[1fr_2fr] gap-3">
                <Field label="CTA texto" hint="opcional">
                  <Input
                    value={form.ctaText}
                    onChange={(v) => update('ctaText', v)}
                    placeholder="Ex: Ver oferta"
                    maxLength={80}
                    disabled={readOnly || savingPatch}
                  />
                </Field>
                <Field label="CTA URL" hint="https://...">
                  <Input
                    value={form.ctaUrl}
                    onChange={(v) => update('ctaUrl', v)}
                    placeholder="https://tpcperformance.com.br/promo"
                    maxLength={500}
                    disabled={readOnly || savingPatch}
                  />
                </Field>
              </div>

              {(error || success) && (
                <div
                  className={cn(
                    'rounded-[10px] border px-3 py-2 text-[12px]',
                    error
                      ? 'border-tpc-red/40 bg-tpc-red/10 text-tpc-red'
                      : 'border-tpc-green/40 bg-tpc-green/10 text-tpc-green',
                  )}
                >
                  {error ?? success}
                </div>
              )}

              {!readOnly && (
                <div className="flex flex-wrap items-center justify-between gap-2 border-t border-tpc-border pt-3">
                  <button
                    type="button"
                    onClick={remove}
                    disabled={deleting || savingPatch || sending}
                    className="cursor-pointer rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 px-3.5 py-2 text-[12px] font-semibold text-tpc-red transition hover:bg-tpc-red/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {deleting ? 'Excluindo…' : 'Excluir rascunho'}
                  </button>
                  <button
                    type="button"
                    onClick={save}
                    disabled={!dirty || savingPatch}
                    className="cursor-pointer rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2 text-[12px] font-semibold text-tpc-text-secondary transition hover:text-tpc-text disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {savingPatch ? 'Salvando…' : dirty ? 'Salvar' : 'Salvo'}
                  </button>
                </div>
              )}
            </Card>
          </section>

          <section>
            <SecHeading className="px-0 pb-3 pt-0">Preview</SecHeading>
            <EmailPreview form={form} />
          </section>
        </div>

        <div className="flex flex-col gap-4">
          <section>
            <SecHeading className="px-0 pb-3 pt-0">Status</SecHeading>
            <Card className="flex flex-col gap-2.5 p-4">
              <KV k="Status" v={statusLabel(campaign.status)} />
              <KV k="Criada por" v={campaign.createdBy.name} />
              <KV
                k="Criada em"
                v={new Date(campaign.createdAt).toLocaleString('pt-BR')}
              />
              {campaign.sentAt && (
                <KV
                  k="Disparada em"
                  v={new Date(campaign.sentAt).toLocaleString('pt-BR')}
                />
              )}
              {campaign.estimatedReach !== null && (
                <KV
                  k="Destinatários"
                  v={String(campaign.estimatedReach)}
                />
              )}
            </Card>
          </section>

          {isDraft && (
            <section>
              <SecHeading className="px-0 pb-3 pt-0">Disparo</SecHeading>
              <Card className="flex flex-col gap-3 p-4">
                <div className="rounded-[10px] border border-dashed border-tpc-border bg-tpc-surface/40 px-3 py-2.5">
                  <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
                    Audiência estimada
                  </div>
                  <div className="tpc-num mt-1 text-[18px] font-bold text-tpc-text">
                    {audienceCount === null ? '…' : audienceCount}{' '}
                    <span className="text-[11px] font-normal text-tpc-text-tertiary">
                      usuários opt-in
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={testSend}
                  disabled={sendingTest || sending}
                  className="cursor-pointer rounded-[10px] border border-tpc-border bg-tpc-surface px-3.5 py-2 text-[12px] font-semibold text-tpc-text-secondary transition hover:text-tpc-text disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingTest ? 'Enviando…' : 'Test send pra mim'}
                </button>
                <button
                  type="button"
                  onClick={sendForReal}
                  disabled={sending || sendingTest || audienceCount === 0}
                  className="cursor-pointer rounded-[10px] bg-tpc-red px-3.5 py-2 text-[12px] font-semibold text-tpc-text shadow-md shadow-tpc-red/20 transition hover:bg-tpc-red-dark disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? 'Enfileirando…' : 'Disparar campanha'}
                </button>
                <p className="font-mono text-[10px] tracking-wide text-tpc-text-tertiary">
                  Dispara só pra usuários com Consent.marketingEmail=true.
                  Não dá pra desfazer.
                </p>
              </Card>
            </section>
          )}

          {!isDraft && Object.keys(campaign.stats).length > 0 && (
            <section>
              <SecHeading className="px-0 pb-3 pt-0">Entregas</SecHeading>
              <Card className="flex flex-col gap-2.5 p-4">
                <KV
                  k="Entregues"
                  v={String(totalDelivered)}
                  tone="green"
                />
                {(campaign.stats.QUEUED ?? 0) > 0 && (
                  <KV
                    k="Na fila"
                    v={String(campaign.stats.QUEUED)}
                    tone="yellow"
                  />
                )}
                {totalFailed > 0 && (
                  <KV
                    k="Falharam"
                    v={String(totalFailed)}
                    tone="red"
                  />
                )}
              </Card>
            </section>
          )}
        </div>
      </div>
    </div>
  )
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

const Field = ({
  label,
  hint,
  children,
}: {
  label: string
  hint?: string
  children: React.ReactNode
}) => (
  <div>
    <div className="mb-1 flex items-baseline justify-between">
      <label className="text-[11px] font-semibold uppercase tracking-[0.1em] text-tpc-text-secondary">
        {label}
      </label>
      {hint && (
        <span className="font-mono text-[9px] tracking-wide text-tpc-text-tertiary">
          {hint}
        </span>
      )}
    </div>
    {children}
  </div>
)

const Input = ({
  value,
  onChange,
  placeholder,
  maxLength,
  disabled,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  maxLength?: number
  disabled?: boolean
}) => (
  <input
    type="text"
    value={value}
    onChange={(e) => onChange(e.target.value)}
    placeholder={placeholder}
    maxLength={maxLength}
    disabled={disabled}
    className="w-full rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[13px] text-tpc-text focus:border-tpc-border-strong focus:outline-none disabled:opacity-60"
  />
)

const KV = ({
  k,
  v,
  tone = 'default',
}: {
  k: string
  v: string
  tone?: 'default' | 'green' | 'yellow' | 'red'
}) => (
  <div className="flex items-center justify-between gap-3 text-[12.5px]">
    <span className="text-tpc-text-secondary">{k}</span>
    <span
      className={cn(
        'tpc-num font-semibold',
        tone === 'green' && 'text-tpc-green',
        tone === 'yellow' && 'text-tpc-yellow',
        tone === 'red' && 'text-tpc-red',
        tone === 'default' && 'text-tpc-text',
      )}
    >
      {v}
    </span>
  </div>
)

const statusLabel = (s: CampaignDetail['status']): string =>
  ({ DRAFT: 'Rascunho', SENDING: 'Enviando', SENT: 'Enviada', FAILED: 'Falhou' })[s]

// ----------------------------------------------------------------------------
// Preview inline (não é renderizado pelo react-email — é uma aproximação
// suficiente pro admin saber a estrutura final do email).
// ----------------------------------------------------------------------------

const EmailPreview = ({ form }: { form: FormState }) => {
  const paragraphs = form.body
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter((p) => p.length > 0)
  const hasCta = form.ctaText.trim() !== '' && form.ctaUrl.trim() !== ''
  return (
    <div className="rounded-2xl border border-tpc-border bg-[#0a0a0a] p-7">
      <div className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
        Subject: {form.subject || '(vazio)'}
      </div>
      <div className="border-t border-tpc-border pt-5">
        <div className="text-center">
          <div className="font-mono text-[9px] font-bold uppercase tracking-[0.3em] text-tpc-red">
            TPC
          </div>
          <div className="mt-1 text-[18px] font-bold tracking-tight text-tpc-text">
            Performance
          </div>
          <div className="mx-auto mt-3 h-[2px] w-[40px] bg-tpc-red" />
        </div>
        <h2 className="mt-6 text-[22px] font-bold tracking-tight text-tpc-text">
          {form.title || '(título vazio)'}
        </h2>
        <p className="mt-3 text-[14px] leading-relaxed text-tpc-text">
          Olá [nome],
        </p>
        {paragraphs.length > 0 ? (
          paragraphs.map((p, i) => (
            <p
              key={i}
              className="mt-3 text-[14px] leading-relaxed text-tpc-text"
            >
              {p}
            </p>
          ))
        ) : (
          <p className="mt-3 text-[14px] italic text-tpc-text-tertiary">
            (corpo vazio)
          </p>
        )}
        {hasCta && (
          <div className="mt-5">
            <span className="inline-block rounded-full bg-tpc-red px-6 py-3 text-[14px] font-semibold text-tpc-text">
              {form.ctaText}
            </span>
          </div>
        )}
        <p className="mt-6 border-t border-tpc-border pt-4 text-[12px] text-tpc-text-tertiary">
          Recebeu este email porque optou por novidades. Atualize preferências
          em Perfil → Notificações.
        </p>
      </div>
    </div>
  )
}
