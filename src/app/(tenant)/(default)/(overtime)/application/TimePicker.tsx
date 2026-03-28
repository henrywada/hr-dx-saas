'use client'

import { cn } from '@/lib/utils'

type Props = {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
  /** 分単位（例: 60 で1分刻み） */
  step?: number
}

const inputClass =
  'mt-1 block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-900 shadow-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:opacity-50'

/** 時刻選択（ネイティブ input type="time"） */
export function TimePicker({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  step = 60,
}: Props) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type="time"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(inputClass, error && 'border-red-400 focus:ring-red-300')}
      />
      {error ? <p className="mt-1 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
