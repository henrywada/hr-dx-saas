'use client'

import * as React from 'react'
import { cn } from '@/lib/utils'

export function Alert({
  className,
  variant = 'default',
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: 'default' | 'destructive'
}) {
  return (
    <div
      role="alert"
      className={cn(
        'relative w-full rounded-lg border p-4',
        variant === 'destructive' &&
          'border-red-200 bg-red-50 text-red-900 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-100',
        variant === 'default' &&
          'border-slate-200 bg-slate-50 text-slate-900 dark:border-slate-700 dark:bg-slate-900/40',
        className,
      )}
      {...props}
    />
  )
}

export function AlertTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h5
      className={cn(
        'mb-1 font-semibold leading-none tracking-tight',
        className,
      )}
      {...props}
    />
  )
}

export function AlertDescription({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('text-sm leading-relaxed', className)} {...props} />
  )
}
