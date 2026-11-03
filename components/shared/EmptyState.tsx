'use client'

import React from 'react'
import { Inbox } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface EmptyStateProps {
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
  className?: string
}

export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'card-base animate-fade-in flex flex-col items-center justify-center text-center p-8 sm:p-12 border-dashed border-2 border-[#e2e8f0] dark:border-white/[0.08] bg-white/60 dark:bg-[#0f1f3d]/60 transition-all',
        className
      )}
    >
      {/* Icon */}
      <div className="flex size-16 items-center justify-center rounded-2xl bg-[#f1f5f9] dark:bg-white/[0.05] border border-[#e2e8f0] dark:border-white/[0.06] text-[#94a3b8] dark:text-[#64748b] mb-4 shadow-inner">
        <Icon className="size-8 stroke-[1.75]" />
      </div>

      {/* Title */}
      <h3 className="text-[16px] font-bold text-[#182b52] dark:text-white mb-1.5 tracking-tight">
        {title}
      </h3>

      {/* Description */}
      {description && (
        <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8] max-w-sm mb-5 leading-relaxed">
          {description}
        </p>
      )}

      {/* Action button */}
      {action && (
        <button
          type="button"
          onClick={action.onClick}
          className="btn-teal text-[13px] font-semibold px-4 py-2"
        >
          {action.label}
        </button>
      )}
    </div>
  )
}
