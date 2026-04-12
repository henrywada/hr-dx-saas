'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TabsListProps = {
  className?: string
  children: ReactNode
}

export function TabsList({ className, children }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn('inline-flex flex-wrap gap-1 rounded-lg border border-slate-200 bg-slate-50/80 p-1', className)}
    >
      {children}
    </div>
  )
}

type TabsTriggerProps = {
  selected: boolean
  onClick: () => void
  children: ReactNode
  className?: string
  disabled?: boolean
}

export function TabsTrigger({ selected, onClick, children, className, disabled }: TabsTriggerProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
        selected
          ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200'
          : 'text-slate-600 hover:text-slate-900',
        disabled && 'opacity-50 cursor-not-allowed',
        className,
      )}
    >
      {children}
    </button>
  )
}
