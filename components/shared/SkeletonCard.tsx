'use client'

import React from 'react'
import { cn } from '@/lib/utils'

export interface SkeletonCardProps {
  lines?: number
  hasHeader?: boolean
  className?: string
}

const lineWidths = ['w-full', 'w-[88%]', 'w-[72%]', 'w-[95%]', 'w-[60%]']

export function SkeletonCard({
  lines = 3,
  hasHeader = true,
  className,
}: SkeletonCardProps) {
  return (
    <div className={cn('card-base p-5 space-y-4', className)}>
      {/* Header Skeleton */}
      {hasHeader && (
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-xl skeleton shrink-0" />
            <div className="space-y-2">
              <div className="h-4 w-28 skeleton rounded-md" />
              <div className="h-3 w-16 skeleton rounded-md" />
            </div>
          </div>
          <div className="h-7 w-14 skeleton rounded-lg shrink-0" />
        </div>
      )}

      {/* Body Lines Skeleton */}
      <div className="space-y-2.5 pt-1">
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'h-3.5 skeleton rounded-md',
              lineWidths[index % lineWidths.length]
            )}
          />
        ))}
      </div>
    </div>
  )
}

export interface SkeletonTableProps {
  rows?: number
  cols?: number
  className?: string
}

export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn('card-base overflow-hidden', className)}>
      {/* Table Header Skeleton */}
      <div className="flex items-center gap-4 px-5 py-3.5 bg-[#f8fafc] dark:bg-white/[0.025] border-b border-[#e2e8f0] dark:border-white/[0.06]">
        {Array.from({ length: cols }).map((_, colIdx) => (
          <div
            key={colIdx}
            className={cn(
              'h-3.5 skeleton rounded-md',
              colIdx === 0 ? 'w-24' : colIdx === 1 ? 'w-36' : 'flex-1'
            )}
          />
        ))}
      </div>

      {/* Table Rows Skeleton */}
      <div className="divide-y divide-[#f1f5f9] dark:divide-white/[0.04]">
        {Array.from({ length: rows }).map((_, rowIdx) => (
          <div
            key={rowIdx}
            className="flex items-center gap-4 px-5 py-3.5"
          >
            {Array.from({ length: cols }).map((_, colIdx) => (
              <div
                key={colIdx}
                className={cn(
                  'h-3 skeleton rounded-md',
                  colIdx === 0 ? 'w-20' : colIdx === 1 ? 'w-32' : 'flex-1'
                )}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

export function SkeletonStat({ className }: { className?: string }) {
  return (
    <div className={cn('card-base p-5 space-y-3', className)}>
      <div className="flex items-start justify-between">
        <div className="h-3 w-20 skeleton rounded" />
        <div className="size-11 rounded-xl skeleton shrink-0" />
      </div>
      <div className="h-7 w-28 skeleton rounded-md my-1" />
      <div className="flex items-center gap-2 pt-1 border-t border-[#f1f5f9] dark:border-white/[0.05]">
        <div className="h-4 w-14 skeleton rounded-full" />
        <div className="h-3 w-20 skeleton rounded" />
      </div>
    </div>
  )
}
