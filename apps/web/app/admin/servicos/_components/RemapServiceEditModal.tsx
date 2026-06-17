'use client'

import { useState } from 'react'

import { useApi } from '@/lib/api/client'

import type { RemapServiceItem } from '../page'

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

interface CommonProps {
  onClose: () => void
  onSaved: () => void | Promise<void>
}

type Props =
  | (CommonProps & { mode: 'edit'; initial: RemapServiceItem })
  | (CommonProps & { mode: 'create'; initial?: undefined })

interface FormState {
  slug: string
  name: string
  description: string
  category: string
  pts: number
  priceAvulsoCents: number
  supports: string[]
  isCustom: boolean
  active: boolean
  sortOrder: number
}

const buildInitial = (s: RemapServiceItem | undefined): FormState => {
  if (s) {
    return {
      slug: s.slug,
      name: s.name,
      description: s.description,
      category: s.category ?? '',
      pts: s.pts,
      priceAvulsoCents: s.priceAvulsoCents,
      supports: s.supports,
      isCustom: s.isCustom,
      active: s.active,
      sortOrder: s.sortOrder,
    }
  }
  return {
    slug: '',
    name: '',
    description: '',
    category: 'Performance',
    pts: 100,
    priceAvulsoCents: 0,
    supports: [],
    isCustom: false,
    active: true,
    sortOrder: 0,
  }
}

export const RemapServiceEditModal = (props: Props) => {
  const api = useApi()
  const isCreate = props.mode === 'create'
  const [form, setForm] = useState<FormState>(buildInitial(props.initial))
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((f) => ({ ...f, [k]: v }))

  // category vazio vira null no body (schema permite null).
  const categoryForBody = form.category.trim() === '' ? null : form.category.trim()

  const submit = async () => {
    if (submitting) return
    setError(null)
    setSubmitting(true)
    try {
      if (isCreate) {
        await api.post('/admin/remap-services', {
          slug: form.slug.trim(),
          name: form.name,
          description: form.description,
          category: categoryForBody,
          pts: form.pts,
          priceAvulsoCents: form.priceAvulsoCents,
          supports: form.supports,
          isCustom: form.isCustom,
          active: form.active,
          sortOrder: form.sortOrder,
        })
      } else {
        const init = props.initial
        const patch: Record<string, unknown> = {}
        if (form.name !== init.name) patch.name = form.name
        if (form.description !== init.description) patch.description = form.description
        if (categoryForBody !== init.category) patch.category = categoryForBody
        if (form.pts !== init.pts) patch.pts = form.pts
        if (form.priceAvulsoCents !== init.priceAvulsoCents)
          patch.priceAvulsoCents = form.priceAvulsoCents
        if (
          form.supports.length !== init.supports.length ||
          form.supports.some((m, i) => m !== init.supports[i])
        )
          patch.supports = form.supports
        if (form.isCustom !== init.isCustom) patch.isCustom = form.isCustom
        if (form.active !== init.active) patch.active = form.active
        if (form.sortOrder !== init.sortOrder) patch.sortOrder = form.sortOrder
        if (Object.keys(patch).length === 0) {
          props.onClose()
          return
        }
        await api.patch(`/admin/remap-services/${props.initial.id}`, patch)
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
      title={isCreate ? 'Novo serviço por arquivo' : `Editar · ${props.initial.name}`}
      onClose={props.onClose}
      disabled={submitting}
    >
      <ModalBody>
        {isCreate && (
          <Field label="Slug" hint="kebab-case, imutável">
            <TextInput
              value={form.slug}
              onChange={(v) => update('slug', v.toLowerCase().replace(/\s+/g, '-'))}
              placeholder="ex: pop-and-bang-file"
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
            placeholder="ex: Stage 1 por arquivo"
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

        <Field label="Categoria" hint="texto livre, pode deixar vazio">
          <TextInput
            value={form.category}
            onChange={(v) => update('category', v)}
            placeholder="Performance | Aesthetic | Config | Custom"
            maxLength={60}
            disabled={submitting}
          />
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
          <Field label="Sort order" hint="menor aparece primeiro">
            <NumberInput
              value={form.sortOrder}
              onChange={(n) => update('sortOrder', n)}
              min={0}
              disabled={submitting}
            />
          </Field>
        </div>

        <Field label="Suportes / compatibilidade" hint="ECU, hardware, etc — um por linha">
          <StringListInput
            value={form.supports}
            onChange={(v) => update('supports', v)}
            placeholder={'EDC17C46\nMED17.5\nKess V2/V3'}
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
            checked={form.isCustom}
            onChange={(v) => update('isCustom', v)}
            label="Custom (fluxo de orçamento)"
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
