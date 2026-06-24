import type { QuestionnaireListItem } from '@/features/questionnaire/types'

export interface QuestionnaireSummary {
  /** status='active' のアンケート件数 */
  activeCount: number
  /** 実施中アンケート（割り当て1件以上）の平均回答率（%） */
  averageResponseRatePercent: number | null
}

/** アンケート一覧から「実施中件数」と「平均回答率」を集計する（汎用アンケートカード用） */
export function summarizeQuestionnaires(items: QuestionnaireListItem[]): QuestionnaireSummary {
  const active = items.filter(item => item.status === 'active')
  const withAssignments = active.filter(item => item.assignment_count > 0)

  const averageResponseRatePercent =
    withAssignments.length > 0
      ? Math.round(
          (withAssignments.reduce(
            (sum, item) => sum + item.submitted_count / item.assignment_count,
            0
          ) /
            withAssignments.length) *
            1000
        ) / 10
      : null

  return {
    activeCount: active.length,
    averageResponseRatePercent,
  }
}
