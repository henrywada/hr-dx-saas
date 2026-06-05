'use client'

import { cn } from '@/lib/utils'
import type { AssistantMode } from '../types'
import { ASSISTANT_MODE_LABELS, ASSISTANT_MODE_DESCRIPTIONS } from '../types'

const MODES: AssistantMode[] = ['general', 'labor_calc', 'comment_review', 'case_search']

const MODE_ICONS: Record<AssistantMode, string> = {
  general:        '💬',
  labor_calc:     '🧮',
  comment_review: '✏️',
  case_search:    '🔍',
}

type Props = {
  value: AssistantMode
  onChange: (mode: AssistantMode) => void
  disabled?: boolean
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {MODES.map((mode) => (
        <button
          key={mode}
          type="button"
          disabled={disabled}
          onClick={() => onChange(mode)}
          title={ASSISTANT_MODE_DESCRIPTIONS[mode]}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            value === mode
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200',
            disabled && 'opacity-50 cursor-not-allowed',
          )}
        >
          <span>{MODE_ICONS[mode]}</span>
          {ASSISTANT_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  )
}
