'use client'

import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'

type TabsListProps = {
  className?: string
  children: ReactNode
}

export function TabsList({ className, children }: TabsListProps) {
  return (
    <div role="tablist" className={cn('flex flex-wrap items-center gap-2', className)}>
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

export function TabsTrigger({
  selected,
  onClick,
  children,
  className,
  disabled,
}: TabsTriggerProps) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={selected}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'rounded-full px-5 py-2 text-sm font-semibold transition-colors',
        selected
          ? 'bg-primary text-white shadow-sm'
          : 'border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-primary hover:text-primary hover:bg-slate-50',
        disabled && 'opacity-50 cursor-not-allowed',
        className
      )}
    >
      {children}
    </button>
  )
}
