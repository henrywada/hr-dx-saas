'use client'

import { selectTemplatesForDisplay } from '../template-select'
import type { AssistantMode, QuestionTemplate } from '../types'

type Props = {
  templates: QuestionTemplate[]
  mode: AssistantMode
  disabled: boolean
  onSelect: (template: QuestionTemplate) => void
}

/** チャット空状態に表示する「こんな質問はありませんか？」チップ */
export function QuestionTemplateChips({ templates, mode, disabled, onSelect }: Props) {
  const displayed = selectTemplatesForDisplay(templates, mode)
  if (displayed.length === 0) return null

  return (
    <div className="w-full text-left">
      <p className="text-xs font-semibold text-[#57606a] mb-2">💡 こんな質問はありませんか？</p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {displayed.map(t => (
          <button
            key={t.id}
            type="button"
            disabled={disabled}
            onClick={() => onSelect(t)}
            className="text-left text-xs text-[#24292f] bg-white border border-[#e2e6ec] rounded-lg px-3 py-2 hover:border-[#FD7601] hover:text-[#FD7601] transition-colors disabled:opacity-50"
          >
            {t.question_text}
          </button>
        ))}
      </div>
    </div>
  )
}
