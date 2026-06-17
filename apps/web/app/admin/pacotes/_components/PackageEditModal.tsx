'use client'

import { useState } from 'react'

import { useApi } from '@/lib/api/client'

import {
  AdminModalShell,
  Checkbox,
  Field,
  ModalBody,
  ModalFooter,
  NumberInput,
  TextInput,
} from '../../_components/modal-shell'

import type { PackageItem } from '../page'

interface CommonProps {
  onClose: () => void
  onSaved: () => void | Promise<void>
}

// Tiers padrão da TPC. Cobrem 100% dos pacotes atuais; o admin escolhe
// "Personalizado" se quiser criar um tier novo (ex: black-friday-2026).
const TIER_PRESETS = [
  { value: 'iniciante', label: 'Iniciante' },
  { value: 'stage1', label: 'Stage 1' },
  { value: 'stage2', label: 'Stage 2' },
  { value: 'stage3', label: 'Stage 3' },
] as const

const CUSTOM_TIER = '__custom__'

type Props =
  | (CommonProps & { mode: 'edit'; initial: PackageItem })
  | (CommonProps & { mode: 'create'; initial?: undefined })

interface FormState {
  tier: string
  name: string
  points: number
  priceCents: number
  bonusPoints: number
  bonusPct: number
  popular: boolean
  active: boolean
  sortOrder: number
}

const buildInitial = (p: PackageItem | undefined): FormState => {
  if (p) {
    return {
      tier: p.tier,
      name: p.name,
      points: p.points,
      priceCents: p.priceCents,
      bonusPoints: p.bonusPoints,
      bonusPct: p.bonusPct,
      popular: p.popular,
      active: p.active,
      sortOrder: p.sortOrder,
    }
  }
  return {
    tier: '',
    name: '',
    points: 100,
    priceCents: 10000,
    bonusPoints: 0,
    bonusPct: 0,
    popular: false,
    active: true,
    sortOrder: 0,
  }
}

export const PackageEditModal = (props: Props) => {
  const api = useApi()
  const isCreate = props.mode === 'create'
  const [form, setForm] = useState<FormState>(buildInitial(props.initial))
  const [submitting, setSubmitting] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // customTierMode = admin escolheu "Personalizado" no select. Determina se
  // mostramos o input de texto livre. Inicial sempre false no create.
  const [customTierMode, setCustomTierMode] = useState(false)

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const onTierSelectChange = (v: string) => {
    if (v === CUSTOM_TIER) {
      setCustomTierMode(true)
      update('tier', '')
    } else {
      setCustomTierMode(false)
      update('tier', v)
    }
  }

  const remove = async () => {
    if (isCreate || deleting) return
    const target = props.initial
    if (target.purchasesCount > 0) return // UI block; double-check
    if (
      !confirm(
        `Excluir o pacote "${target.name}" (${target.tier})?\n\nIsso é permanente. Não dá pra desfazer.`,
      )
    )
      return
    setError(null)
    setDeleting(true)
    try {
      await api.del(`/admin/packages/${target.id}`)
      await props.onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir')
    } finally {
      setDeleting(false)
    }
  }

  const submit = async () => {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      if (isCreate) {
        await api.post('/admin/packages', {
          tier: form.tier.trim(),
          name: form.name,
          points: form.points,
          priceCents: form.priceCents,
          bonusPoints: form.bonusPoints,
          bonusPct: form.bonusPct,
          popular: form.popular,
          active: form.active,
          sortOrder: form.sortOrder,
        })
      } else {
        const init = props.initial
        const patch: Record<string, unknown> = {}
        if (form.name !== init.name) patch.name = form.name
        if (form.points !== init.points) patch.points = form.points
        if (form.priceCents !== init.priceCents) patch.priceCents = form.priceCents
        if (form.bonusPoints !== init.bonusPoints) patch.bonusPoints = form.bonusPoints
        if (form.bonusPct !== init.bonusPct) patch.bonusPct = form.bonusPct
        if (form.popular !== init.popular) patch.popular = form.popular
        if (form.active !== init.active) patch.active = form.active
        if (form.sortOrder !== init.sortOrder) patch.sortOrder = form.sortOrder
        if (Object.keys(patch).length === 0) {
          props.onClose()
          return
        }
        await api.patch(`/admin/packages/${props.initial.id}`, patch)
      }
      await props.onSaved()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao salvar')
    } finally {
      setSubmitting(false)
    }
  }

  const canSubmit =
    form.name.trim().length >= 2 &&
    form.points >= 1 &&
    form.priceCents >= 1 &&
    (!isCreate || /^[a-z0-9-]+$/.test(form.tier.trim()))

  // Preview do ratio R$/pt — feedback imediato pro admin enquanto edita.
  const totalPts = form.points + form.bonusPoints
  const pricePerPoint = totalPts > 0 ? form.priceCents / totalPts / 100 : 0

  return (
    <AdminModalShell
      title={isCreate ? 'Novo pacote' : `Editar · ${props.initial.name}`}
      onClose={props.onClose}
      disabled={submitting}
    >
      <ModalBody>
        {isCreate && (
          <Field label="Tier" hint="imutável após criar">
            <select
              value={customTierMode ? CUSTOM_TIER : form.tier}
              onChange={(e) => onTierSelectChange(e.target.value)}
              disabled={submitting}
              className="w-full cursor-pointer rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[13px] text-tpc-text focus:border-tpc-border-strong focus:outline-none disabled:opacity-60"
            >
              <option value="">Escolher tier…</option>
              {TIER_PRESETS.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
              <option value={CUSTOM_TIER}>Personalizado…</option>
            </select>
            {customTierMode && (
              <div className="mt-2">
                <TextInput
                  value={form.tier}
                  onChange={(v) =>
                    update('tier', v.toLowerCase().replace(/\s+/g, '-'))
                  }
                  placeholder="kebab-case, ex: black-friday-2026"
                  maxLength={40}
                  disabled={submitting}
                  mono
                />
              </div>
            )}
          </Field>
        )}

        <Field label="Nome">
          <TextInput
            value={form.name}
            onChange={(v) => update('name', v)}
            placeholder="ex: Stage 1"
            maxLength={120}
            disabled={submitting}
          />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Pontos base" hint="≥ 1">
            <NumberInput
              value={form.points}
              onChange={(n) => update('points', n)}
              min={1}
              disabled={submitting}
            />
          </Field>
          <Field label="Preço (centavos)" hint="≥ 1">
            <NumberInput
              value={form.priceCents}
              onChange={(n) => update('priceCents', n)}
              min={1}
              disabled={submitting}
            />
          </Field>
          <Field label="Bonus em pts" hint="extra grátis">
            <NumberInput
              value={form.bonusPoints}
              onChange={(n) => update('bonusPoints', n)}
              min={0}
              disabled={submitting}
            />
          </Field>
          <Field label="Bonus %" hint="só pro display">
            <NumberInput
              value={form.bonusPct}
              onChange={(n) => update('bonusPct', n)}
              min={0}
              max={100}
              disabled={submitting}
            />
          </Field>
          <Field label="Sort order" hint="menor aparece primeiro">
            <NumberInput
              value={form.sortOrder}
              onChange={(n) => update('sortOrder', n)}
              min={0}
              disabled={submitting}
            />
          </Field>
        </div>

        <div className="rounded-[10px] border border-dashed border-tpc-border bg-tpc-surface/40 px-3 py-2.5">
          <div className="font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-text-tertiary">
            Preview
          </div>
          <div className="mt-1 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 text-[12.5px] text-tpc-text">
            <span>
              {totalPts.toLocaleString('pt-BR')} pts
              {form.bonusPoints > 0 && (
                <span className="text-tpc-text-tertiary">
                  {' '}
                  ({form.points} + {form.bonusPoints})
                </span>
              )}
            </span>
            <span>·</span>
            <span>R$ {(form.priceCents / 100).toFixed(2)}</span>
            <span>·</span>
            <span className="font-mono text-tpc-text-tertiary">
              R$ {pricePerPoint.toFixed(2)} / pt
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Checkbox
            checked={form.active}
            onChange={(v) => update('active', v)}
            label="Ativo (visível no app)"
            disabled={submitting}
          />
          <Checkbox
            checked={form.popular}
            onChange={(v) => update('popular', v)}
            label="Marcar como popular"
            disabled={submitting}
          />
        </div>
      </ModalBody>

      <ModalFooter
        onCancel={props.onClose}
        onSubmit={submit}
        submitLabel={isCreate ? 'Criar pacote' : 'Salvar alterações'}
        disabled={!canSubmit}
        submitting={submitting || deleting}
        error={error}
        secondaryAction={
          !isCreate ? (
            <DeleteButton
              onDelete={remove}
              deleting={deleting}
              disabled={submitting}
              purchasesCount={props.initial.purchasesCount}
            />
          ) : null
        }
      />
    </AdminModalShell>
  )
}

const DeleteButton = ({
  onDelete,
  deleting,
  disabled,
  purchasesCount,
}: {
  onDelete: () => void
  deleting: boolean
  disabled: boolean
  purchasesCount: number
}) => {
  const blocked = purchasesCount > 0
  const title = blocked
    ? `Bloqueado: ${purchasesCount} compra(s) usam esse pacote. Desative em vez de excluir.`
    : 'Exclui permanentemente'
  return (
    <button
      type="button"
      onClick={onDelete}
      disabled={blocked || disabled || deleting}
      title={title}
      className="cursor-pointer rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 px-3.5 py-2 text-[12px] font-semibold text-tpc-red transition hover:bg-tpc-red/20 disabled:cursor-not-allowed disabled:border-tpc-border disabled:bg-transparent disabled:text-tpc-text-tertiary"
    >
      {deleting ? 'Excluindo…' : blocked ? `Excluir · ${purchasesCount} compra(s)` : 'Excluir'}
    </button>
  )
}
