'use client'

import type { ResearchMode } from '../types'

/** 3モードの表示定義。法律の専門家向けではなく、現場の処理から選ばせる */
const MODES: { value: ResearchMode; label: string; description: string; source: string }[] = [
  {
    value: 'tax',
    label: '税法を調べる',
    description: '給与・経費・年末調整など、税務処理の根拠を調べる',
    source: 'e-Gov + 国税庁の通達・裁決事例（24の主要税法 + 17の行政通達 + 1,950の裁決事例）',
  },
  {
    value: 'labor',
    label: '労務法を調べる',
    description: '勤怠・休職・安全衛生など、労務処理の根拠を調べる',
    source: '45の労働関連法令 + 厚労省通達（労基署・安全衛生関連の通達も含む）',
  },
  {
    value: 'law',
    label: '法令を調べる',
    description: '社内ルールや契約に関わる法令を調べる',
    source: 'e-Gov法令検索（法令名検索、条文取得、改正履歴）',
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
              <span className="block text-[11px] text-slate-400 mt-1.5 leading-relaxed">
                ソース：{mode.source}
              </span>
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
