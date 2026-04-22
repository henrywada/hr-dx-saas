'use client'

import { useState, useTransition } from 'react'
import { CheckSquare, Square, ClipboardCheck } from 'lucide-react'
import { toggleChecklistItem } from '../actions'
import type { ElChecklistItem, ElChecklistCompletion, ElSlide } from '../types'

interface Props {
  slide: ElSlide
  assignmentId: string
  completions: ElChecklistCompletion[]
  onAllChecked: () => void
}

// [Phase 5] 現場適用チェックリストスライド
// 受講者が現場で実施した行動をチェックする（後日チェックも可）
export function ChecklistView({ slide, assignmentId, completions, onAllChecked }: Props) {
  const [isPending, startTransition] = useTransition()
  const items: ElChecklistItem[] = slide.checklist_items ?? []

  const initialChecked = new Set(completions.map(c => c.checklist_item_id))
  const [checkedIds, setCheckedIds] = useState<Set<string>>(initialChecked)

  const allChecked = items.length > 0 && items.every(it => checkedIds.has(it.id))

  const handleToggle = (item: ElChecklistItem) => {
    if (isPending) return

    const next = new Set(checkedIds)
    const willCheck = !next.has(item.id)
    willCheck ? next.add(item.id) : next.delete(item.id)
    setCheckedIds(next)

    startTransition(async () => {
      await toggleChecklistItem(assignmentId, item.id, willCheck)
      if (willCheck && items.every(it => next.has(it.id))) {
        onAllChecked()
      }
    })
  }

  return (
    <div className="space-y-5">
      {slide.title && (
        <h2 className="text-xl font-bold text-gray-800">{slide.title}</h2>
      )}

      {slide.content && (
        <p className="text-sm text-gray-600 leading-relaxed">{slide.content}</p>
      )}

      <div className="rounded-2xl border border-gray-200 overflow-hidden">
        <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-2">
          <ClipboardCheck className="w-4 h-4 text-gray-500" />
          <span className="text-xs font-semibold text-gray-600">現場適用チェックリスト</span>
          <span className="ml-auto text-xs text-gray-400">
            {checkedIds.size} / {items.length} 完了
          </span>
        </div>

        <ul className="divide-y divide-gray-100">
          {items.map(item => {
            const checked = checkedIds.has(item.id)
            return (
              <li key={item.id}>
                <button
                  onClick={() => handleToggle(item)}
                  disabled={isPending}
                  className={`w-full flex items-start gap-3 px-4 py-3.5 text-left transition-colors disabled:opacity-60 ${
                    checked ? 'bg-green-50' : 'bg-white hover:bg-gray-50'
                  }`}
                >
                  {checked ? (
                    <CheckSquare className="w-5 h-5 text-green-500 shrink-0 mt-0.5" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-300 shrink-0 mt-0.5" />
                  )}
                  <span
                    className={`text-sm leading-snug ${
                      checked ? 'text-green-800 line-through decoration-green-400' : 'text-gray-700'
                    }`}
                  >
                    {item.item_text}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>
      </div>

      {allChecked ? (
        <div className="rounded-xl bg-green-50 border border-green-200 p-4 text-center">
          <p className="text-sm font-semibold text-green-700">すべての項目を完了しました！ 🎉</p>
        </div>
      ) : (
        <p className="text-xs text-gray-400 text-center">未チェックの項目は後からでも確認できます</p>
      )}
    </div>
  )
}
