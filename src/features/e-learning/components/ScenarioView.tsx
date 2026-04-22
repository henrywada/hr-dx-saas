'use client'

import { useState, useTransition } from 'react'
import { CheckCircle, Lightbulb } from 'lucide-react'
import { recordScenarioAnswer } from '../actions'
import type { ElScenarioBranch, ElSlide } from '../types'

interface Props {
  slide: ElSlide
  assignmentId: string
  isCompleted: boolean
  selectedBranchId?: string | null
  onCompleted: () => void
}

// [Phase 3] シナリオ問題スライド
// 「あなたならどうする？」分岐問題 → 選択後にフィードバックを表示する
export function ScenarioView({
  slide,
  assignmentId,
  isCompleted,
  selectedBranchId,
  onCompleted,
}: Props) {
  const [isPending, startTransition] = useTransition()
  const branches: ElScenarioBranch[] = slide.scenario_branches ?? []

  const [chosenId, setChosenId] = useState<string | null>(selectedBranchId ?? null)
  const answered = chosenId !== null || isCompleted
  const chosen = branches.find(b => b.id === chosenId)

  const handleSelect = (branch: ElScenarioBranch) => {
    if (answered || isPending) return
    setChosenId(branch.id)
    startTransition(async () => {
      await recordScenarioAnswer(assignmentId, slide.id, branch.id, branch.choice_text)
      onCompleted()
    })
  }

  return (
    <div className="space-y-5">
      {slide.title && (
        <h2 className="text-xl font-bold text-gray-800">{slide.title}</h2>
      )}

      {/* シナリオ本文 */}
      {slide.content && (
        <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
          <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
            {slide.content}
          </p>
        </div>
      )}

      <p className="text-sm font-semibold text-gray-700">あなたならどうしますか？</p>

      {/* 選択肢ボタン */}
      <div className="space-y-3">
        {branches.map((branch, idx) => {
          const isChosen = chosenId === branch.id
          let cls = 'border-gray-200 bg-white text-gray-700 hover:border-blue-400 hover:bg-blue-50'

          if (answered) {
            if (branch.is_recommended) {
              cls = 'border-green-400 bg-green-50 text-green-800'
            } else if (isChosen) {
              cls = 'border-orange-300 bg-orange-50 text-orange-800'
            } else {
              cls = 'border-gray-100 bg-gray-50 text-gray-400'
            }
          }

          return (
            <button
              key={branch.id}
              disabled={answered || isPending}
              onClick={() => handleSelect(branch)}
              className={`w-full text-left px-4 py-3.5 rounded-xl border-2 transition-colors text-sm leading-snug disabled:cursor-default ${cls}`}
            >
              <span className="mr-2 font-bold text-gray-400">
                {String.fromCharCode(65 + idx)}.
              </span>
              {branch.choice_text}
              {answered && branch.is_recommended && (
                <span className="ml-2 text-xs font-semibold text-green-600">✓ 推奨</span>
              )}
            </button>
          )
        })}
      </div>

      {/* フィードバックカード（選択後に表示） */}
      {answered && chosen && (
        <div
          className={`rounded-xl p-4 space-y-2 ${
            chosen.is_recommended
              ? 'bg-green-50 border border-green-200'
              : 'bg-orange-50 border border-orange-200'
          }`}
        >
          <div className="flex items-center gap-2 font-semibold text-sm">
            {chosen.is_recommended ? (
              <>
                <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
                <span className="text-green-700">良い判断です！</span>
              </>
            ) : (
              <>
                <Lightbulb className="w-5 h-5 text-orange-500 shrink-0" />
                <span className="text-orange-700">こう考えてみましょう</span>
              </>
            )}
          </div>
          {chosen.feedback_text && (
            <p className="text-sm text-gray-600 leading-relaxed">{chosen.feedback_text}</p>
          )}
        </div>
      )}

      {isPending && <p className="text-xs text-center text-gray-400">記録中...</p>}
    </div>
  )
}
