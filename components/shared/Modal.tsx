'use client'

import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface ModalProps {
  open: boolean
  onClose: () => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  size?: 'sm' | 'md' | 'lg'
  arabic?: boolean
  className?: string
}

const sizeWidths: Record<'sm' | 'md' | 'lg', string> = {
  sm: '420px',
  md: '540px',
  lg: '760px',
}

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = 'md',
  arabic = false,
  className,
}: ModalProps) {
  const [mounted, setMounted] = useState(false)

  // Ensure portal target exists on client
  useEffect(() => {
    setMounted(true)
  }, [])

  // Close on Escape key press
  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  // Lock body scroll while modal is active
  useEffect(() => {
    if (!open) return

    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!mounted || !open) return null

  const modalContent = (
    <div
      className="modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose()
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title || 'Modal Dialog'}
      dir={arabic ? 'rtl' : 'ltr'}
    >
      <div
        className={cn(
          'modal-box relative border border-[#e2e8f0] dark:border-white/[0.1] flex flex-col',
          className
        )}
        style={{ maxWidth: sizeWidths[size] }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] dark:border-white/[0.08] shrink-0">
          <h3 className="text-[17px] font-bold text-[#182b52] dark:text-white tracking-tight leading-tight">
            {title || ''}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="btn-icon size-8 rounded-lg text-[#64748b] hover:text-[#182b52] dark:hover:text-white transition-colors"
            aria-label={arabic ? 'إغلاق' : 'Close'}
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 text-[13px] text-[#334155] dark:text-[#cbd5e1] leading-relaxed overflow-y-auto max-h-[calc(90vh-140px)]">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t border-[#e2e8f0] dark:border-white/[0.08] bg-[#f8fafc]/60 dark:bg-white/[0.02] flex items-center justify-end gap-2.5 rounded-b-[20px] shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div>
  )

  return createPortal(modalContent, document.body)
}
