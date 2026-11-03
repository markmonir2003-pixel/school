'use client'

import React from 'react'
import { ArrowDownRight, ArrowUpRight, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

export interface StatCardProps {
  label: string
  value: string | number
  change?: string // e.g. '+8.2%' or '-3.4%'
  caption?: string
  icon: React.ComponentType<{ className?: string }>
  iconBg?: string // tailwind bg class or hex/rgb
  iconColor?: string // tailwind text class or hex/rgb
  trend?: 'up' | 'down' | 'neutral'
  className?: string
  delay?: number // stagger delay index (1-6)
}

const staggerClasses: Record<number, string> = {
  1: 'stagger-1',
  2: 'stagger-2',
  3: 'stagger-3',
  4: 'stagger-4',
  5: 'stagger-5',
  6: 'stagger-6',
}

export function StatCard({
  label,
  value,
  change,
  caption,
  icon: Icon,
  iconBg,
  iconColor,
  trend,
  className,
  delay,
}: StatCardProps) {
  const isCustomBg = iconBg?.startsWith('#') || iconBg?.startsWith('rgb')
  const isCustomColor = iconColor?.startsWith('#') || iconColor?.startsWith('rgb')

  const staggerClass = delay && staggerClasses[delay] ? staggerClasses[delay] : ''
  const customDelayStyle =
    delay && !staggerClasses[delay] ? { animationDelay: `${delay * 60}ms` } : undefined

  return (
    <div
      className={cn(
        'card-base p-5 animate-fade-in relative overflow-hidden group flex flex-col justify-between transition-all duration-300',
        staggerClass,
        className
      )}
      style={customDelayStyle}
    >
      {/* Top row: Label & Icon */}
      <div className="flex items-start justify-between gap-3">
        <span className="text-[12px] font-semibold tracking-wide text-[#64748b] dark:text-[#94a3b8] uppercase leading-tight line-clamp-1">
          {label}
        </span>

        {/* Icon box */}
        <div
          className={cn(
            'flex size-11 items-center justify-center rounded-xl shrink-0 transition-transform duration-200 group-hover:scale-105 shadow-sm',
            !isCustomBg && (iconBg || 'bg-[#19a99a]/10 dark:bg-[#19a99a]/20')
          )}
          style={{
            ...(isCustomBg ? { backgroundColor: iconBg } : {}),
            ...(isCustomColor ? { color: iconColor } : {}),
          }}
        >
          <Icon
            className={cn(
              'size-5 transition-colors',
              !isCustomColor && (iconColor || 'text-[#19a99a] dark:text-[#2dd4bf]')
            )}
          />
        </div>
      </div>

      {/* Metric Value */}
      <div className="mt-2 mb-3">
        <div className="text-[28px] font-extrabold tracking-tight text-[#182b52] dark:text-white leading-none">
          {value}
        </div>
      </div>

      {/* Trend indicator & Caption row */}
      {(change || caption) && (
        <div className="flex items-center gap-2 text-[12px] flex-wrap pt-1 border-t border-[#f1f5f9] dark:border-white/[0.05]">
          {change && (
            <span
              className={cn(
                'inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full font-bold text-[11px] leading-tight',
                trend === 'up' &&
                  'bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400',
                trend === 'down' &&
                  'bg-rose-50 dark:bg-rose-500/15 text-rose-700 dark:text-rose-400',
                (trend === 'neutral' || !trend) &&
                  'bg-slate-100 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400'
              )}
            >
              {trend === 'up' && <ArrowUpRight className="size-3.5 shrink-0 stroke-[2.5]" />}
              {trend === 'down' && <ArrowDownRight className="size-3.5 shrink-0 stroke-[2.5]" />}
              {trend === 'neutral' && <Minus className="size-3 shrink-0 stroke-[2.5]" />}
              <span>{change}</span>
            </span>
          )}

          {caption && (
            <span className="text-[11px] text-[#94a3b8] dark:text-[#64748b] truncate font-medium">
              {caption}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
