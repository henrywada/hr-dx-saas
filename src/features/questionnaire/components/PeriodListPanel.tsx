'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { closeQuestionnairePeriod } from '@/features/questionnaire/actions'
import type { QuestionnaireDetail, PeriodListItem, QuestionnaireListItem } from '@/features/questionnaire/types'
import PeriodFormModal from './PeriodFormModal'
import AssignmentModal from './AssignmentModal'

interface Props {
  questionnaire: QuestionnaireDetail
  initialPeriods: PeriodListItem[]
  tenantId: string
}

export default function PeriodListPanel({ questionnaire, initialPeriods, tenantId }: Props) {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal]     = useState(false)
  const [assigningPeriodId, setAssigningPeriodId] = useState<string | null>(null)

  // AssignmentModal は QuestionnaireListItem を期待するため最小限の変換
  const questionnaireAsListItem: QuestionnaireListItem = {
    ...questionnaire,
    question_count:   questionnaire.questions.length,
    assignment_count: 0,
    submitted_count:  0,
  }

  function handlePeriodCreated() {
    setShowCreateModal(false)
    router.refresh()
  }

  async function handleClose(periodId: string) {
    if (!confirm('この実施期間を終了しますか？')) return
    await closeQuestionnairePeriod(periodId)
    router.refresh()
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{questionnaire.title}</h1>
          <p className="text-gray-500 text-sm mt-1">実施期間管理</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
        >
          ＋ 実施期間を作成
        </button>
      </div>

      {initialPeriods.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          実施期間がありません。「実施期間を作成」から開始してください。
        </div>
      ) : (
        <div className="space-y-3">
          {initialPeriods.map(period => (
            <div
              key={period.id}
              className="border rounded-xl p-4 flex items-center justify-between"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{period.label ?? '期間名未設定'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    period.status === 'active'
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-500'
                  }`}>
                    {period.status === 'active' ? '実施中' : '終了'}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">
                  {period.start_date && period.end_date
                    ? `${period.start_date} 〜 ${period.end_date}`
                    : period.start_date ?? '期間指定なし'}
                  　回答: {period.submitted_count} / {period.assignment_count}件
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setAssigningPeriodId(period.id)}
                  className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                >
                  対象者設定
                </button>
                {period.status === 'active' && (
                  <button
                    onClick={() => handleClose(period.id)}
                    className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    終了
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {showCreateModal && (
        <PeriodFormModal
          questionnaireId={questionnaire.id}
          onSuccess={handlePeriodCreated}
          onClose={() => setShowCreateModal(false)}
        />
      )}

      {assigningPeriodId && (
        <AssignmentModal
          questionnaire={questionnaireAsListItem}
          periodId={assigningPeriodId}
          tenantId={tenantId}
          onClose={() => setAssigningPeriodId(null)}
        />
      )}
    </div>
  )
}
