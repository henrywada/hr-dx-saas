'use client'

import type { ResearchMode } from '../types'

/** 3モードの表示定義。3つは対等に並べる（税法だけ扱いを変えない） */
const MODES: { value: ResearchMode; label: string; description: string }[] = [
  {
    value: 'tax',
    label: '税法を調べる',
    description: '24の主要税法 + 17の行政通達 + 1,950の裁決事例',
  },
  {
    value: 'labor',
    label: '労務法を調べる',
    description: '45の労働関連法令 + 厚労省通達をカバー',
  },
  {
    value: 'law',
    label: '法令を調べる',
    description: '法令名検索、条文取得、改正履歴',
  },
]

export function ModeRadioGroup({
  value,
  onChange,
}: {
  value: ResearchMode
  onChange: (mode: ResearchMode) => void
}) {
  return (
    <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <legend className="sr-only">調べる対象</legend>
      {MODES.map(mode => {
        const selected = mode.value === value
        return (
          <label
            key={mode.value}
            className={`flex items-start gap-2.5 rounded-lg border p-4 cursor-pointer transition-colors ${
              selected
                ? 'border-[#FD7601] bg-[#FD7601]/5'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="research-mode"
              value={mode.value}
              checked={selected}
              onChange={() => onChange(mode.value)}
              className="mt-0.5 accent-[#FD7601]"
            />
            <span className="min-w-0">
              <span
                className={`block text-sm font-medium ${
                  selected ? 'text-[#FD7601]' : 'text-slate-900'
                }`}
              >
                {mode.label}
              </span>
              <span className="block text-xs text-slate-500 mt-0.5">{mode.description}</span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
