'use client'

import { cn } from '@/lib/utils'
import type { AssistantMode } from '../types'
import { ASSISTANT_MODE_LABELS, ASSISTANT_MODE_DESCRIPTIONS } from '../types'

const MODES: AssistantMode[] = ['general', 'labor_calc', 'comment_review', 'case_search']

const MODE_ICONS: Record<AssistantMode, string> = {
  general: '💬',
  labor_calc: '🧮',
  comment_review: '✏️',
  case_search: '🔍',
}

type Props = {
  value: AssistantMode
  onChange: (mode: AssistantMode) => void
  disabled?: boolean
}

export function ModeSelector({ value, onChange, disabled }: Props) {
  return (
    <div className="flex gap-2 flex-wrap">
      {MODES.map(mode => (
        <button
          key={mode}
          type="button"
          disabled={disabled}
          onClick={() => onChange(mode)}
          title={ASSISTANT_MODE_DESCRIPTIONS[mode]}
          className={cn(
            'flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
            value === mode
              ? 'bg-[#FD7601] text-white shadow-sm'
              : 'bg-[#f6f8fa] text-[#57606a] hover:bg-[#f6f8fa]',
            disabled && 'opacity-50 cursor-not-allowed'
          )}
        >
          <span>{MODE_ICONS[mode]}</span>
          {ASSISTANT_MODE_LABELS[mode]}
        </button>
      ))}
    </div>
  )
}
