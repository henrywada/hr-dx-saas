'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { closeQuestionnairePeriod, deleteQuestionnairePeriod } from '@/features/questionnaire/actions'
import type { QuestionnaireDetail, PeriodListItem, QuestionnaireListItem } from '@/features/questionnaire/types'
import PeriodFormModal from './PeriodFormModal'
import AssignmentModal from './AssignmentModal'

interface Props {
  questionnaire: QuestionnaireDetail
  initialPeriods: PeriodListItem[]
  tenantId: string
}

type DisplayStatus = 'upcoming' | 'active' | 'closed' | 'interrupted'

function computeDisplayStatus(period: PeriodListItem): DisplayStatus {
  // 手動中断（status=closed）は日付より優先
  if (period.status === 'closed') return 'interrupted'

  const today = new Date().toISOString().split('T')[0]

  if (period.start_date && period.end_date) {
    if (today < period.start_date) return 'upcoming'
    if (today > period.end_date) return 'closed'
    return 'active'
  }
  if (period.start_date && !period.end_date) {
    return today >= period.start_date ? 'active' : 'upcoming'
  }
  // 日付なし（none）
  return 'active'
}

const STATUS_CONFIG: Record<DisplayStatus, { label: string; className: string }> = {
  upcoming:    { label: '未開始',   className: 'bg-blue-100 text-blue-700' },
  active:      { label: '実施中',   className: 'bg-green-100 text-green-700' },
  closed:      { label: '終了',     className: 'bg-gray-100 text-gray-500' },
  interrupted: { label: '中断',     className: 'bg-orange-100 text-orange-600' },
}

export default function PeriodListPanel({ questionnaire, initialPeriods, tenantId }: Props) {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal]     = useState(false)
  const [editingPeriod, setEditingPeriod]         = useState<PeriodListItem | null>(null)
  const [assigningPeriodId, setAssigningPeriodId] = useState<string | null>(null)

  const questionnaireAsListItem: QuestionnaireListItem = {
    ...questionnaire,
    question_count:   questionnaire.questions.length,
    assignment_count: 0,
    submitted_count:  0,
  }

  function handleModalSuccess() {
    setShowCreateModal(false)
    setEditingPeriod(null)
    router.refresh()
  }

  async function handleInterrupt(periodId: string) {
    if (!confirm('この実施期間を中断しますか？（日付に関係なく強制終了します）')) return
    await closeQuestionnairePeriod(periodId)
    router.refresh()
  }

  async function handleDelete(periodId: string) {
    if (!confirm('この実施期間を削除しますか？アサイン・回答データも削除されます。')) return
    const res = await deleteQuestionnairePeriod(periodId)
    if (!res.success) {
      alert(res.error ?? '削除に失敗しました。')
      return
    }
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
          {initialPeriods.map(period => {
            const displayStatus = computeDisplayStatus(period)
            const { label: statusLabel, className: statusClass } = STATUS_CONFIG[displayStatus]
            const isActive = displayStatus === 'active' || displayStatus === 'upcoming'

            return (
              <div
                key={period.id}
                className="border rounded-xl p-4 flex items-center justify-between"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{period.label ?? '期間名未設定'}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${statusClass}`}>
                      {statusLabel}
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
                  <button
                    onClick={() => setEditingPeriod(period)}
                    className="text-sm px-3 py-1.5 border rounded-lg hover:bg-gray-50"
                  >
                    変更
                  </button>
                  {isActive && (
                    <button
                      onClick={() => handleInterrupt(period.id)}
                      className="text-sm px-3 py-1.5 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50"
                    >
                      中断
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(period.id)}
                    className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                  >
                    削除
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {(showCreateModal || editingPeriod) && (
        <PeriodFormModal
          questionnaireId={questionnaire.id}
          period={editingPeriod ?? undefined}
          onSuccess={handleModalSuccess}
          onClose={() => { setShowCreateModal(false); setEditingPeriod(null) }}
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
