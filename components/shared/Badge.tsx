'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export type BadgeVariant =
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'teal'
  | 'indigo'
  | 'neutral'
  | 'violet'

export interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  dot?: boolean // show colored dot before text
  size?: 'sm' | 'md'
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  success: 'badge-success',
  warning: 'badge-warning',
  danger: 'badge-danger',
  info: 'badge-info',
  teal: 'badge-teal',
  indigo: 'badge-indigo',
  neutral: 'badge-neutral',
  violet: 'badge-violet',
}

const dotColors: Record<BadgeVariant, string> = {
  success: 'bg-emerald-500 shadow-[0_0_6px_rgba(34,197,94,0.6)]',
  warning: 'bg-amber-500 shadow-[0_0_6px_rgba(245,158,11,0.6)]',
  danger: 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.6)]',
  info: 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.6)]',
  teal: 'bg-[#19a99a] shadow-[0_0_6px_rgba(25,169,154,0.6)]',
  indigo: 'bg-indigo-500 shadow-[0_0_6px_rgba(99,102,241,0.6)]',
  neutral: 'bg-slate-400 dark:bg-slate-500 shadow-[0_0_6px_rgba(148,163,184,0.4)]',
  violet: 'bg-purple-500 shadow-[0_0_6px_rgba(139,92,246,0.6)]',
}

const sizeClasses = {
  sm: 'px-2 py-0.5 text-[10px] gap-1',
  md: 'px-2.5 py-0.5 text-[11px] gap-1.5',
}

export function Badge({
  variant = 'neutral',
  children,
  dot = false,
  size = 'md',
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center font-semibold rounded-full tracking-wide transition-colors whitespace-nowrap',
        variantClasses[variant] || variantClasses.neutral,
        sizeClasses[size] || sizeClasses.md,
        className
      )}
    >
      {dot && (
        <span
          className={cn(
            'size-1.5 rounded-full shrink-0',
            dotColors[variant] || dotColors.neutral
          )}
          aria-hidden="true"
        />
      )}
      <span>{children}</span>
    </span>
  )
}
