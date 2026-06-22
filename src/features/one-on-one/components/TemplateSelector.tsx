'use client'

import { DEFAULT_THEMES } from '../types'
import type { ThemeTemplate } from '../types'

interface Props {
  templates: ThemeTemplate[]
  value: string
  onChange: (theme: string) => void
}

export function TemplateSelector({ templates, value, onChange }: Props) {
  const displayThemes = templates.length > 0 ? templates.map(t => t.name) : [...DEFAULT_THEMES]

  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-gray-700">
        テーマ <span className="text-red-500">*</span>
      </label>
      <div className="flex flex-wrap gap-2">
        {displayThemes.map(theme => (
          <button
            key={theme}
            type="button"
            onClick={() => onChange(theme)}
            className={`rounded-full border px-3 py-1 text-sm transition-colors ${
              value === theme
                ? 'border-[#FD7601] bg-[#f6f8fa] text-[#FD7601]'
                : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
            }`}
          >
            {theme}
          </button>
        ))}
      </div>
      <input
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder="または自由入力..."
        className="mt-1 block w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-[#FD7601] focus:outline-none focus:ring-1 focus:ring-blue-400"
      />
    </div>
  )
}
