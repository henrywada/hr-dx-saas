'use client'

import type { GrowthRiskDetails, ScoreFactors } from '../types'

interface Props {
  factors: ScoreFactors
}

interface FactorRow {
  label: string
  score: number
  maxScore: number
  detail: string
}

function formatGrowthDetail(growth: GrowthRiskDetails | undefined): string {
  if (!growth) return 'データなし'
  const flags: string[] = []
  if (growth.one_on_one_overdue_30d) flags.push('1on1未実施(30日)')
  if (growth.evaluation_not_confirmed) flags.push('評価未完了')
  if (growth.has_skill_gap) flags.push('スキルギャップ')
  if (growth.has_incomplete_el) flags.push('eL未完了')
  return flags.length > 0 ? flags.join('、') : '該当なし'
}

export function RiskFactorBreakdown({ factors }: Props) {
  const growthScore = factors.growth_score ?? 0
  const growthDetails = factors.details.growth

  const rows: FactorRow[] = [
    {
      label: 'ストレスチェック',
      score: factors.stress_score,
      maxScore: 35,
      detail: factors.details.is_high_stress ? '高ストレス判定あり' : '高ストレスなし',
    },
    {
      label: 'パルスサーベイ',
      score: factors.survey_score,
      maxScore: 30,
      detail:
        factors.details.latest_survey_score !== null
          ? `最新スコア ${factors.details.latest_survey_score.toFixed(1)} / 5.0`
          : '回答データなし',
    },
    {
      label: '残業・勤怠',
      score: factors.overtime_score,
      maxScore: 20,
      detail: `先月残業 ${factors.details.overtime_hours_last_month.toFixed(1)}h（前月比 ${
        factors.details.overtime_delta_hours >= 0 ? '+' : ''
      }${factors.details.overtime_delta_hours.toFixed(1)}h）`,
    },
    {
      label: 'アンケート未回答',
      score: factors.absence_score,
      maxScore: 15,
      detail: `直近3回中 ${factors.details.unanswered_questionnaire_count}回 未回答`,
    },
    {
      label: '成長・評価',
      score: growthScore,
      maxScore: 40,
      detail: formatGrowthDetail(growthDetails),
    },
  ]

  return (
    <div className="space-y-3 rounded-lg border border-gray-200 bg-gray-50 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">リスク因子内訳</p>
      {rows.map(row => (
        <div key={row.label}>
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-gray-700">{row.label}</span>
            <span className={`font-semibold ${row.score > 0 ? 'text-red-600' : 'text-gray-400'}`}>
              {row.score} / {row.maxScore} pt
            </span>
          </div>
          <div className="relative h-2 w-full overflow-hidden rounded-full bg-gray-200">
            <div
              className={`absolute left-0 top-0 h-full rounded-full transition-all ${
                row.score === 0
                  ? 'bg-gray-300'
                  : row.score >= row.maxScore * 0.7
                    ? 'bg-red-400'
                    : 'bg-yellow-400'
              }`}
              style={{ width: `${(row.score / row.maxScore) * 100}%` }}
            />
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{row.detail}</p>
        </div>
      ))}
    </div>
  )
}
