'use client'

import { useUser } from '@clerk/nextjs'
import { useRouter } from 'next/navigation'
import { useRef, useState, useTransition } from 'react'

import { cn } from '@tpc/ui'

import { useApi } from '@/lib/api/client'

interface AvatarUploaderProps {
  user: {
    initials: string
    avatarUrl: string | null
  }
}

// Avatar upload: a imagem é hospedada pelo Clerk via setProfileImage do
// client SDK (sem precisar storage próprio + signed URLs). Depois do upload,
// sincronizamos imageUrl pra nossa coluna User.avatarUrl pra ficar legível
// no resto do app sem ter que ler de Clerk toda hora.
export const AvatarUploader = ({ user }: AvatarUploaderProps) => {
  const router = useRouter()
  const api = useApi()
  const { user: clerkUser } = useUser()
  const fileRef = useRef<HTMLInputElement>(null)
  const [uploading, startUpload] = useTransition()
  const [error, setError] = useState<string | null>(null)
  // Mostra o que está mais recente: prop (post-refresh) ou state local
  // após upload otimista.
  const [previewUrl, setPreviewUrl] = useState<string | null>(user.avatarUrl)

  const openPicker = () => {
    setError(null)
    fileRef.current?.click()
  }

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // reset pra permitir mesmo arquivo de novo
    if (!file) return
    if (!file.type.startsWith('image/')) {
      setError('Arquivo precisa ser imagem.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Imagem precisa ter menos de 5MB.')
      return
    }
    if (!clerkUser) {
      setError('Aguarda o Clerk carregar e tenta de novo.')
      return
    }

    startUpload(async () => {
      try {
        const res = await clerkUser.setProfileImage({ file })
        const newUrl = res.publicUrl ?? clerkUser.imageUrl ?? null
        setPreviewUrl(newUrl)
        if (newUrl) {
          await api.patch<{ ok: boolean }>('/me/avatar', { avatarUrl: newUrl })
        }
        router.refresh()
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Falha ao subir avatar.')
      }
    })
  }

  return (
    <div className="flex flex-col items-center gap-1.5">
      <button
        type="button"
        onClick={openPicker}
        disabled={uploading}
        className={cn(
          'group relative flex h-[72px] w-[72px] flex-shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl text-[28px] font-bold tracking-[-0.04em] text-tpc-text shadow-[0_0_28px_rgba(225,38,28,0.2)] transition disabled:cursor-not-allowed',
          previewUrl
            ? 'bg-tpc-elevated-2'
            : 'bg-gradient-to-br from-tpc-red to-tpc-red-dark',
        )}
        aria-label="Trocar foto de perfil"
      >
        {previewUrl ? (
          <img
            src={previewUrl}
            alt=""
            aria-hidden
            className="h-full w-full object-cover"
          />
        ) : (
          <span>{user.initials}</span>
        )}
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center bg-black/60 opacity-0 transition group-hover:opacity-100">
          {uploading ? (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="animate-[tpc-spin_1s_linear_infinite]"
            >
              <path d="M21 12a9 9 0 1 1-6.2-8.6" />
            </svg>
          ) : (
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          )}
        </span>
      </button>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        className="hidden"
      />
      <button
        type="button"
        onClick={openPicker}
        disabled={uploading}
        className="cursor-pointer font-mono text-[8px] uppercase tracking-[0.14em] text-tpc-red hover:text-tpc-text disabled:cursor-not-allowed disabled:opacity-50"
      >
        {uploading ? 'Enviando…' : 'Trocar'}
      </button>
      {error && (
        <span className="max-w-[160px] text-center text-[10px] text-tpc-red">
          {error}
        </span>
      )}
    </div>
  )
}
