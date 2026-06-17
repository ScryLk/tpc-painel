'use client'

import { useState } from 'react'

import { useApi } from '@/lib/api/client'

import type { ServiceItem } from '../page'

import {
  Checkbox,
  Field,
  ModalBody,
  ModalFooter,
  NumberInput,
  AdminModalShell,
  StringListInput,
  Textarea,
  TextInput,
} from '../../_components/modal-shell'

type Category = 'PERFORMANCE' | 'AESTHETIC' | 'CONFIG'

const CATEGORIES: Array<{ value: Category; label: string }> = [
  { value: 'PERFORMANCE', label: 'Performance' },
  { value: 'AESTHETIC', label: 'Estética' },
  { value: 'CONFIG', label: 'Config' },
]

interface CommonProps {
  onClose: () => void
  onSaved: () => void | Promise<void>
}

type Props =
  | (CommonProps & { mode: 'edit'; initial: ServiceItem })
  | (CommonProps & { mode: 'create'; initial?: undefined })

interface FormState {
  slug: string
  name: string
  description: string
  category: Category
  pts: number
  priceAvulsoCents: number
  motorTypes: string[]
  durationDays: number
  popular: boolean
  active: boolean
  sortOrder: number
}

const buildInitial = (s: ServiceItem | undefined): FormState => {
  if (s) {
    return {
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category,
      pts: s.pts,
      priceAvulsoCents: s.priceAvulsoCents,
      motorTypes: s.motorTypes,
      durationDays: s.durationDays,
      popular: s.popular,
      active: s.active,
      sortOrder: s.sortOrder,
    }
  }
  return {
    slug: '',
    name: '',
    description: '',
    category: 'PERFORMANCE',
    pts: 100,
    priceAvulsoCents: 0,
    motorTypes: [],
    durationDays: 1,
    popular: false,
    active: true,
    sortOrder: 0,
  }
}

export const ServiceEditModal = (props: Props) => {
  const api = useApi()
  const isCreate = props.mode === 'create'
  const [form, setForm] = useState<FormState>(buildInitial(props.initial))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  const submit = async () => {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      if (isCreate) {
        await api.post('/admin/services', {
          slug: form.slug.trim(),
          name: form.name,
          description: form.description,
          category: form.category,
          pts: form.pts,
          priceAvulsoCents: form.priceAvulsoCents,
          motorTypes: form.motorTypes,
          durationDays: form.durationDays,
          popular: form.popular,
          active: form.active,
          sortOrder: form.sortOrder,
        })
      } else {
        // PATCH: manda só o que mudou pra reduzir noise no audit log.
        const init = props.initial
        const patch: Record<string, unknown> = {}
        if (form.name !== init.name) patch.name = form.name
        if (form.description !== init.description) patch.description = form.description
        if (form.category !== init.category) patch.category = form.category
        if (form.pts !== init.pts) patch.pts = form.pts
        if (form.priceAvulsoCents !== init.priceAvulsoCents)
          patch.priceAvulsoCents = form.priceAvulsoCents
        if (
          form.motorTypes.length !== init.motorTypes.length ||
          form.motorTypes.some((m, i) => m !== init.motorTypes[i])
        )
          patch.motorTypes = form.motorTypes
        if (form.durationDays !== init.durationDays)
          patch.durationDays = form.durationDays
        if (form.popular !== init.popular) patch.popular = form.popular
        if (form.active !== init.active) patch.active = form.active
        if (form.sortOrder !== init.sortOrder) patch.sortOrder = form.sortOrder
        if (Object.keys(patch).length === 0) {
          props.onClose()
          return
        }
        await api.patch(`/admin/services/${props.initial.id}`, patch)
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
    form.description.trim().length >= 2 &&
    form.pts >= 1 &&
    (!isCreate || /^[a-z0-9-]+$/.test(form.slug.trim()))

  return (
    <AdminModalShell
      title={isCreate ? 'Novo serviço presencial' : `Editar · ${props.initial.name}`}
      onClose={props.onClose}
      disabled={submitting}
    >
      <ModalBody>
        {isCreate && (
          <Field label="Slug" hint="kebab-case, imutável">
            <TextInput
              value={form.slug}
              onChange={(v) => update('slug', v.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="ex: stage-1"
              maxLength={60}
              disabled={submitting}
              mono
            />
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

        <Field label="Descrição">
          <Textarea
            value={form.description}
            onChange={(v) => update('description', v)}
            placeholder="O que esse serviço faz, ganhos esperados, requisitos…"
            maxLength={2000}
            disabled={submitting}
            rows={4}
          />
        </Field>

        <Field label="Categoria">
          <div className="flex gap-1.5">
            {CATEGORIES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => update('category', c.value)}
                disabled={submitting}
                className={
                  form.category === c.value
                    ? 'flex-1 rounded-[10px] border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-[12px] font-semibold text-tpc-red transition'
                    : 'flex-1 rounded-[10px] border border-tpc-border bg-tpc-bg px-3 py-2 text-[12px] text-tpc-text-tertiary transition hover:text-tpc-text'
                }
              >
                {c.label}
              </button>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Pontos" hint="≥ 1">
            <NumberInput
              value={form.pts}
              onChange={(n) => update('pts', n)}
              min={1}
              disabled={submitting}
            />
          </Field>
          <Field label="Preço avulso (centavos)" hint="0 = não exibir">
            <NumberInput
              value={form.priceAvulsoCents}
              onChange={(n) => update('priceAvulsoCents', n)}
              min={0}
              disabled={submitting}
            />
          </Field>
          <Field label="Duração (dias)" hint="multi-dia bloqueia calendar">
            <NumberInput
              value={form.durationDays}
              onChange={(n) => update('durationDays', n)}
              min={1}
              max={30}
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

        <Field label="Motores compatíveis" hint="um por linha">
          <StringListInput
            value={form.motorTypes}
            onChange={(v) => update('motorTypes', v)}
            placeholder={'1.0 TSI\n1.4 TSI\n2.0 TSI'}
            disabled={submitting}
          />
        </Field>

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
        submitLabel={isCreate ? 'Criar serviço' : 'Salvar alterações'}
        disabled={!canSubmit}
        submitting={submitting}
        error={error}
      />
    </AdminModalShell>
  )
}
