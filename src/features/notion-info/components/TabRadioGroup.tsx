'use client'

import type { NotionInfoTab } from '../types'

/** 情報掲示板の 3 分類。現場が見たい情報源から選ばせる */
const TABS: { value: NotionInfoTab; label: string }[] = [
  { value: 'hr_trend', label: '最新人事トレンド' },
  { value: 'grant', label: '助成金情報' },
  { value: 'ai', label: 'AI最新情報' },
]

export function TabRadioGroup({
  value,
  onChange,
}: {
  value: NotionInfoTab
  onChange: (tab: NotionInfoTab) => void
}) {
  return (
    <fieldset className="grid grid-cols-1 md:grid-cols-3 gap-3">
      <legend className="sr-only">情報の分類</legend>
      {TABS.map(tab => {
        const selected = tab.value === value
        return (
          <label
            key={tab.value}
            className={`flex items-start gap-2.5 rounded-lg border p-4 cursor-pointer transition-colors ${
              selected
                ? 'border-[#FD7601] bg-[#FD7601]/5'
                : 'border-slate-200 bg-white hover:border-slate-300'
            }`}
          >
            <input
              type="radio"
              name="notion-info-tab"
              value={tab.value}
              checked={selected}
              onChange={() => onChange(tab.value)}
              className="mt-0.5 accent-[#FD7601]"
            />
            <span
              className={`block text-sm font-medium ${
                selected ? 'text-[#FD7601]' : 'text-slate-900'
              }`}
            >
              {tab.label}
            </span>
          </label>
        )
      })}
    </fieldset>
  )
}
