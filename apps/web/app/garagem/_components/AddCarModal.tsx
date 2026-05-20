'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

import { AddCarWizard } from './AddCarWizard'

interface AddCarModalProps {
  open: boolean
  onClose: () => void
}

export const AddCarModal = ({ open, onClose }: AddCarModalProps) => {
  const router = useRouter()

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative flex h-[min(720px,90vh)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-tpc-border bg-tpc-bg shadow-[0_20px_60px_rgba(0,0,0,0.6)]"
        onClick={(e) => e.stopPropagation()}
      >
        <AddCarWizard
          onClose={onClose}
          onSuccess={() => {
            onClose()
            router.refresh()
          }}
        />
      </div>
    </div>
  )
}
