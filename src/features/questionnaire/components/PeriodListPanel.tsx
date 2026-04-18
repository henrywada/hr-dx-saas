'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { closeQuestionnairePeriod, deleteQuestionnairePeriod } from '@/features/questionnaire/actions'
import { APP_ROUTES } from '@/config/routes'
import type {
  QuestionnaireDetail,
  PeriodListItem,
  QuestionnaireListItem,
  PeriodDisplayStatus,
} from '@/features/questionnaire/types'
import { computePeriodDisplayStatus } from '@/features/questionnaire/types'
import PeriodFormModal from './PeriodFormModal'
import AssignmentModal from './AssignmentModal'

interface Props {
  questionnaire: QuestionnaireDetail
  initialPeriods: PeriodListItem[]
  tenantId: string
}

/** 実施一覧の1行用（カレンダー上の実施中だが対象者0件を分離） */
type PeriodListRowStatus = PeriodDisplayStatus | 'no_assignees'

function computePeriodListRowStatus(period: PeriodListItem): PeriodListRowStatus {
  const base = computePeriodDisplayStatus(period)
  if (base === 'active' && period.assignment_count === 0) return 'no_assignees'
  return base
}

const STATUS_CONFIG: Record<PeriodListRowStatus, { label: string; className: string }> = {
  upcoming:    { label: '未開始',   className: 'bg-blue-100 text-blue-700' },
  active:      { label: '実施中',   className: 'bg-green-100 text-green-700' },
  no_assignees: { label: '対象者なし', className: 'bg-amber-100 text-amber-800' },
  closed:      { label: '終了',     className: 'bg-gray-100 text-gray-500' },
  interrupted: { label: '中断',     className: 'bg-orange-100 text-orange-600' },
}

export default function PeriodListPanel({ questionnaire, initialPeriods, tenantId }: Props) {
  const router = useRouter()
  const [showCreateModal, setShowCreateModal]     = useState(false)
  const [editingPeriod, setEditingPeriod]         = useState<PeriodListItem | null>(null)
  const [assigningPeriodId, setAssigningPeriodId] = useState<string | null>(null)

  const sortedPeriods = [...initialPeriods].sort((a, b) =>
    (a.start_date ?? '').localeCompare(b.start_date ?? '')
  )
  const ongoingPeriod = sortedPeriods.find(
    p => computePeriodListRowStatus(p) === 'active'
  )

  const questionnaireAsListItem: QuestionnaireListItem = {
    ...questionnaire,
    question_count: questionnaire.questions.length,
    assignment_count: 0,
    submitted_count: 0,
    period_count: initialPeriods.length,
    has_ongoing_period_display: ongoingPeriod != null,
    ongoing_period_start_date: ongoingPeriod?.start_date ?? null,
    ongoing_period_end_date: ongoingPeriod?.end_date ?? null,
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
          <h1 className="text-2xl font-bold">実施一覧：{questionnaire.title}</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => router.push(APP_ROUTES.TENANT.ADMIN_SURVEY)}
            className="px-4 py-2 border rounded-lg hover:bg-gray-50 text-sm"
          >
            ← アンケートTOPへ
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
          >
            ＋ 実施期間を作成
          </button>
        </div>
      </div>

      {initialPeriods.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          実施期間がありません。「実施期間を作成」から開始してください。
        </div>
      ) : (
        <div className="space-y-3">
          {initialPeriods.map(period => {
            const displayStatus = computePeriodListRowStatus(period)
            const { label: statusLabel, className: statusClass } = STATUS_CONFIG[displayStatus]

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
                  {(displayStatus === 'upcoming' || displayStatus === 'no_assignees') && (
                    <>
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
                      <button
                        onClick={() => handleDelete(period.id)}
                        className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                      >
                        削除
                      </button>
                    </>
                  )}
                  {displayStatus === 'active' && (
                    <button
                      onClick={() => handleInterrupt(period.id)}
                      className="text-sm px-3 py-1.5 border border-orange-300 text-orange-600 rounded-lg hover:bg-orange-50"
                    >
                      中断
                    </button>
                  )}
                  {(displayStatus === 'interrupted' || displayStatus === 'closed') && (
                    <button
                      onClick={() => handleDelete(period.id)}
                      className="text-sm px-3 py-1.5 border border-red-300 text-red-600 rounded-lg hover:bg-red-50"
                    >
                      削除
                    </button>
                  )}
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
