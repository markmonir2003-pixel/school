'use client'

import React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  icon?: React.ComponentType<{ className?: string }>
  actions?: React.ReactNode
  breadcrumb?: string[]
  arabic?: boolean
  className?: string
}

export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  actions,
  breadcrumb,
  arabic = false,
  className,
}: PageHeaderProps) {
  const ChevronIcon = arabic ? ChevronLeft : ChevronRight

  return (
    <div
      dir={arabic ? 'rtl' : 'ltr'}
      className={cn(
        'animate-fade-in pb-5 mb-6 border-b border-[#e2e8f0] dark:border-white/[0.06] transition-colors',
        className
      )}
    >
      {/* Breadcrumb row if provided */}
      {breadcrumb && breadcrumb.length > 0 && (
        <nav
          aria-label="Breadcrumb"
          className="flex items-center gap-1.5 text-[11px] font-medium text-[#64748b] dark:text-[#94a3b8] mb-2.5 overflow-x-auto no-scrollbar"
        >
          {breadcrumb.map((crumb, idx) => {
            const isLast = idx === breadcrumb.length - 1
            return (
              <React.Fragment key={idx}>
                {idx > 0 && (
                  <ChevronIcon className="size-3 text-[#94a3b8] dark:text-[#64748b] shrink-0" />
                )}
                <span
                  className={cn(
                    'truncate transition-colors',
                    isLast
                      ? 'font-semibold text-[#182b52] dark:text-white'
                      : 'hover:text-[#19a99a] cursor-pointer'
                  )}
                >
                  {crumb}
                </span>
              </React.Fragment>
            )
          })}
        </nav>
      )}

      {/* Main Header Row: Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Left / Start: Icon + Title + Subtitle */}
        <div className="flex items-start sm:items-center gap-3.5 min-w-0">
          {Icon && (
            <div className="flex size-11 items-center justify-center rounded-xl bg-gradient-to-br from-[#19a99a]/15 to-[#0d9488]/25 dark:from-[#19a99a]/25 dark:to-[#0d9488]/35 border border-[#19a99a]/25 text-[#19a99a] dark:text-[#2dd4bf] shrink-0 shadow-sm transition-transform hover:scale-105">
              <Icon className="size-5" />
            </div>
          )}

          <div className="min-w-0">
            <h2 className="text-[22px] font-extrabold text-[#182b52] dark:text-white tracking-tight leading-tight truncate">
              {title}
            </h2>
            {subtitle && (
              <p className="text-[13px] text-[#64748b] dark:text-[#94a3b8] mt-1 font-normal leading-relaxed">
                {subtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right / End: Actions slot */}
        {actions && (
          <div className="flex items-center gap-2.5 flex-wrap sm:flex-nowrap shrink-0 self-start sm:self-center">
            {actions}
          </div>
        )}
      </div>
    </div>
  )
}
