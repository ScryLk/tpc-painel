'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'

import { formatPhoneBR, normalizePhone } from '@tpc/lib/formatters'
import { formatCpfCnpj, isValidCnpj, isValidCpf, normalizeCpfCnpj } from '@tpc/lib/validators'
import { Button, Card, SecHeading, cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

import type { ProfileAddress } from '../view'

interface FormUser {
  fullName: string
  email: string
  phone: string
  cpfCnpj: string
  address: ProfileAddress | null
}

interface FormState {
  name: string
  phone: string
  cpfCnpj: string
  address: ProfileAddress
}

const emptyAddress: ProfileAddress = {
  cep: '',
  street: '',
  number: '',
  complement: null,
  neighborhood: '',
  city: '',
  state: '',
}

const buildInitialState = (user: FormUser): FormState => ({
  name: user.fullName,
  phone: user.phone ? formatPhoneBR(user.phone) : '',
  cpfCnpj: user.cpfCnpj ? formatCpfCnpj(user.cpfCnpj) : '',
  address: user.address ?? { ...emptyAddress },
})

const formatCep = (raw: string): string => {
  const d = raw.replace(/\D/g, '').slice(0, 8)
  if (d.length <= 5) return d
  return `${d.slice(0, 5)}-${d.slice(5)}`
}

const isAddressEmpty = (a: ProfileAddress): boolean =>
  !a.cep && !a.street && !a.number && !a.neighborhood && !a.city && !a.state

interface ViaCepResponse {
  logradouro?: string
  bairro?: string
  localidade?: string
  uf?: string
  erro?: boolean
}

export const PerfilDadosForm = ({ user }: { user: FormUser }) => {
  const router = useRouter()
  const api = useApi()
  const [editing, setEditing] = useState(false)
  const [state, setState] = useState<FormState>(() => buildInitialState(user))
  const [saving, startSave] = useTransition()
  const [cepLoading, setCepLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const startEdit = () => {
    setState(buildInitialState(user))
    setError(null)
    setEditing(true)
  }
  const cancel = () => {
    setEditing(false)
    setError(null)
  }

  // Auto-busca via ViaCEP quando CEP completa 8 dígitos.
  const onCepBlur = async () => {
    const cep = state.address.cep.replace(/\D/g, '')
    if (cep.length !== 8) return
    setCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = (await res.json()) as ViaCepResponse
      if (data.erro) return
      setState((s) => ({
        ...s,
        address: {
          ...s.address,
          street: data.logradouro || s.address.street,
          neighborhood: data.bairro || s.address.neighborhood,
          city: data.localidade || s.address.city,
          state: (data.uf || s.address.state).toUpperCase(),
        },
      }))
    } catch {
      /* swallow: campos ficam vazios pra usuário preencher manual */
    } finally {
      setCepLoading(false)
    }
  }

  const save = () => {
    setError(null)

    // Validações client-side antes de bater na API.
    const cpfDigits = normalizeCpfCnpj(state.cpfCnpj)
    if (cpfDigits && !isValidCpf(cpfDigits) && !isValidCnpj(cpfDigits)) {
      setError('CPF/CNPJ inválido.')
      return
    }
    if (state.name.trim().length < 2) {
      setError('Nome precisa ter ao menos 2 caracteres.')
      return
    }
    const phoneDigits = state.phone.replace(/\D/g, '')
    if (state.phone && (phoneDigits.length < 10 || phoneDigits.length > 15)) {
      setError('Telefone precisa ter 10 a 15 dígitos.')
      return
    }

    // Address: só envia se preencheu CEP + street + number + city + state.
    let addressPayload: ProfileAddress | null = null
    if (!isAddressEmpty(state.address)) {
      const a = state.address
      const missing: string[] = []
      if (a.cep.replace(/\D/g, '').length !== 8) missing.push('CEP')
      if (!a.street.trim()) missing.push('rua')
      if (!a.number.trim()) missing.push('número')
      if (!a.neighborhood.trim()) missing.push('bairro')
      if (!a.city.trim()) missing.push('cidade')
      if (a.state.trim().length !== 2) missing.push('UF')
      if (missing.length > 0) {
        setError(`Endereço incompleto: faltam ${missing.join(', ')}.`)
        return
      }
      addressPayload = {
        ...a,
        cep: a.cep.replace(/\D/g, ''),
        complement: a.complement?.trim() || null,
        state: a.state.toUpperCase(),
      }
    }

    startSave(async () => {
      try {
        await api.patch('/me/profile', {
          name: state.name.trim(),
          phone: phoneDigits ? normalizePhone(state.phone) : '',
          cpfCnpj: cpfDigits,
          address: addressPayload,
        })
        setEditing(false)
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao salvar.')
      }
    })
  }

  return (
    <section>
      <SecHeading
        className="px-0 pb-3 pt-0"
        action={
          editing ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={cancel}
                disabled={saving}
                className="cursor-pointer font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-tpc-text-tertiary hover:text-tpc-text disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancelar
              </button>
              <Button
                onClick={save}
                disabled={saving}
                className="px-3 py-1.5 text-[11px]"
              >
                {saving ? 'Salvando…' : 'Salvar'}
              </Button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEdit}
              className="cursor-pointer font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-tpc-red"
            >
              Editar
            </button>
          )
        }
      >
        Dados pessoais
      </SecHeading>

      {editing ? (
        <Card className="space-y-4 p-5">
          <FieldRow
            label="Nome"
            input={
              <input
                type="text"
                value={state.name}
                onChange={(e) => setState((s) => ({ ...s, name: e.target.value }))}
                className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
              />
            }
          />
          <FieldRow
            label="E-mail"
            sub="Gerenciado pelo Clerk · não editável aqui"
            input={
              <input
                type="email"
                value={user.email}
                disabled
                className="block w-full cursor-not-allowed rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text opacity-60 outline-none placeholder:text-tpc-text-tertiary"
              />
            }
          />
          <FieldRow
            label="Telefone"
            sub="usado pelo WhatsApp da TPC"
            input={
              <input
                type="tel"
                value={state.phone}
                onChange={(e) =>
                  setState((s) => ({ ...s, phone: formatPhoneBR(e.target.value) }))
                }
                placeholder="(55) 9 9999-9999"
                className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
              />
            }
          />
          <FieldRow
            label="CPF/CNPJ"
            sub="opcional · pra emissão de NF"
            input={
              <input
                type="text"
                value={state.cpfCnpj}
                onChange={(e) =>
                  setState((s) => ({
                    ...s,
                    cpfCnpj: formatCpfCnpj(e.target.value),
                  }))
                }
                placeholder="000.000.000-00"
                className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
              />
            }
          />

          <div className="space-y-3 border-t border-tpc-border pt-4">
            <div className="tpc-eyebrow">Endereço</div>
            <div className="grid grid-cols-3 gap-3">
              <FieldRow
                compact
                label="CEP"
                input={
                  <input
                    type="text"
                    value={formatCep(state.address.cep)}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        address: { ...s.address, cep: e.target.value },
                      }))
                    }
                    onBlur={onCepBlur}
                    placeholder="00000-000"
                    className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
                  />
                }
              />
              <div className="col-span-2 flex items-end font-mono text-[10px] uppercase tracking-[0.1em] text-tpc-text-tertiary">
                {cepLoading
                  ? 'buscando CEP…'
                  : 'preenche o CEP que o resto vem auto'}
              </div>
            </div>
            <div className="grid grid-cols-[1fr_120px] gap-3">
              <FieldRow
                compact
                label="Rua"
                input={
                  <input
                    type="text"
                    value={state.address.street}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        address: { ...s.address, street: e.target.value },
                      }))
                    }
                    className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
                  />
                }
              />
              <FieldRow
                compact
                label="Número"
                input={
                  <input
                    type="text"
                    value={state.address.number}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        address: { ...s.address, number: e.target.value },
                      }))
                    }
                    className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
                  />
                }
              />
            </div>
            <FieldRow
              compact
              label="Complemento"
              input={
                <input
                  type="text"
                  value={state.address.complement ?? ''}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      address: { ...s.address, complement: e.target.value },
                    }))
                  }
                  placeholder="apto, bloco..."
                  className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
                />
              }
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldRow
                compact
                label="Bairro"
                input={
                  <input
                    type="text"
                    value={state.address.neighborhood}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        address: { ...s.address, neighborhood: e.target.value },
                      }))
                    }
                    className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
                  />
                }
              />
              <FieldRow
                compact
                label="Cidade"
                input={
                  <input
                    type="text"
                    value={state.address.city}
                    onChange={(e) =>
                      setState((s) => ({
                        ...s,
                        address: { ...s.address, city: e.target.value },
                      }))
                    }
                    className="block w-full rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
                  />
                }
              />
            </div>
            <FieldRow
              compact
              label="UF"
              input={
                <input
                  type="text"
                  value={state.address.state}
                  onChange={(e) =>
                    setState((s) => ({
                      ...s,
                      address: {
                        ...s.address,
                        state: e.target.value.toUpperCase().slice(0, 2),
                      },
                    }))
                  }
                  maxLength={2}
                  placeholder="UF"
                  className="block w-[80px] rounded-lg border border-tpc-border bg-tpc-elevated-2 px-3 py-2.5 text-[13px] uppercase text-tpc-text outline-none transition placeholder:text-tpc-text-tertiary focus:border-tpc-red focus:ring-2 focus:ring-tpc-red/20"
                />
              }
            />
            {!isAddressEmpty(state.address) && (
              <button
                type="button"
                onClick={() => setState((s) => ({ ...s, address: { ...emptyAddress } }))}
                className="cursor-pointer font-mono text-[9px] uppercase tracking-[0.14em] text-tpc-red hover:text-tpc-text"
              >
                Limpar endereço
              </button>
            )}
          </div>

          {error && (
            <div className="rounded-lg border border-tpc-red/40 bg-tpc-red/10 px-3 py-2 text-xs text-tpc-red">
              {error}
            </div>
          )}
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ReadRow label="Nome" value={user.fullName} />
          <ReadRow label="E-mail" value={user.email || '—'} />
          <ReadRow
            label="Telefone"
            sub="usado pelo WhatsApp da TPC"
            value={user.phone ? formatPhoneBR(user.phone) : 'Não cadastrado'}
            placeholder={!user.phone}
          />
          <ReadRow
            label="CPF/CNPJ"
            sub="opcional · pra emissão de NF"
            value={user.cpfCnpj ? formatCpfCnpj(user.cpfCnpj) : 'Não cadastrado'}
            placeholder={!user.cpfCnpj}
          />
          <ReadRow
            label="Endereço"
            sub="opcional · pra NF e correspondência"
            value={user.address ? formatAddress(user.address) : 'Não cadastrado'}
            placeholder={!user.address}
            last
          />
        </Card>
      )}
    </section>
  )
}

const FieldRow = ({
  label,
  sub,
  input,
  compact,
}: {
  label: string
  sub?: string
  input: React.ReactNode
  compact?: boolean
}) => {
  if (compact) {
    return (
      <label className="block">
        <span className="mb-1 block font-mono text-[9px] uppercase tracking-[0.18em] text-tpc-text-tertiary">
          {label}
        </span>
        {input}
      </label>
    )
  }
  return (
    <div className="grid grid-cols-[140px_1fr] items-start gap-3 md:grid-cols-[180px_1fr] md:gap-4">
      <div>
        <div className="text-[13px] font-medium text-tpc-text">{label}</div>
        {sub && (
          <div className="mt-0.5 text-[11px] text-tpc-text-tertiary">{sub}</div>
        )}
      </div>
      <div>{input}</div>
    </div>
  )
}

const ReadRow = ({
  label,
  value,
  sub,
  placeholder,
  last,
}: {
  label: string
  value: string
  sub?: string
  placeholder?: boolean
  last?: boolean
}) => {
  return (
    <div
      className={cn(
        'grid grid-cols-[140px_1fr] items-center gap-3 px-5 py-4 md:grid-cols-[180px_1fr] md:gap-4',
        !last && 'border-b border-tpc-border',
      )}
    >
      <div>
        <div className="text-[13px] font-medium text-tpc-text">{label}</div>
        {sub && (
          <div className="mt-0.5 text-[11px] text-tpc-text-tertiary">{sub}</div>
        )}
      </div>
      <div
        className={cn(
          'text-[13px]',
          placeholder ? 'italic text-tpc-text-tertiary' : 'text-tpc-text',
        )}
      >
        {value}
      </div>
    </div>
  )
}

const formatAddress = (a: ProfileAddress): string => {
  const parts = [
    `${a.street}, ${a.number}`,
    a.complement || null,
    a.neighborhood,
    `${a.city}-${a.state}`,
    a.cep ? `CEP ${a.cep.slice(0, 5)}-${a.cep.slice(5)}` : null,
  ].filter(Boolean)
  return parts.join(' · ')
}
