import type { EmployeeRawData, ScoreFactors, RiskLevel } from './types'

function calcStressScore(isHighStress: boolean): number {
  return isHighStress ? 35 : 0
}

/**
 * パルスサーベイ因子（0-5スケール）
 * < 3.0 → 30pt, < 4.0 → 15pt
 */
function calcSurveyScore(latestSurveyScore: number | null): number {
  if (latestSurveyScore === null) return 0
  if (latestSurveyScore < 3.0) return 30
  if (latestSurveyScore < 4.0) return 15
  return 0
}

/**
 * 残業因子
 * 前月比 +20h 以上 OR 月80h超 → 20pt
 * 月45h超 → 10pt
 */
function calcOvertimeScore(
  overtimeHoursLastMonth: number,
  overtimeHoursTwoMonthsAgo: number
): number {
  const delta = overtimeHoursLastMonth - overtimeHoursTwoMonthsAgo
  if (overtimeHoursLastMonth > 80 || delta >= 20) return 20
  if (overtimeHoursLastMonth > 45) return 10
  return 0
}

/**
 * アンケート未回答因子
 * 直近3回中2回以上未回答 → 15pt, 1回 → 7pt
 */
function calcAbsenceScore(unansweredCount: number): number {
  if (unansweredCount >= 2) return 15
  if (unansweredCount === 1) return 7
  return 0
}

/** 成長・評価層因子（各8〜12pt、合計最大40pt） */
function calcGrowthScore(data: EmployeeRawData): number {
  let score = 0
  if (data.one_on_one_overdue_30d) score += 12
  if (data.evaluation_not_confirmed) score += 12
  if (data.has_skill_gap) score += 8
  if (data.has_incomplete_el) score += 8
  return score
}

function calcRiskLevel(score: number): RiskLevel {
  if (score >= 60) return 'high'
  if (score >= 30) return 'medium'
  return 'low'
}

export function calculateRiskScore(data: EmployeeRawData): {
  risk_score: number
  risk_level: RiskLevel
  score_factors: ScoreFactors
} {
  const stress_score = calcStressScore(data.is_high_stress)
  const survey_score = calcSurveyScore(data.latest_survey_score)
  const overtime_score = calcOvertimeScore(
    data.overtime_hours_last_month,
    data.overtime_hours_two_months_ago
  )
  const absence_score = calcAbsenceScore(data.unanswered_questionnaire_count)
  const growth_score = calcGrowthScore(data)
  const risk_score =
    stress_score + survey_score + overtime_score + absence_score + growth_score

  return {
    risk_score,
    risk_level: calcRiskLevel(risk_score),
    score_factors: {
      stress_score,
      survey_score,
      overtime_score,
      absence_score,
      growth_score,
      details: {
        is_high_stress: data.is_high_stress,
        latest_survey_score: data.latest_survey_score,
        overtime_hours_last_month: data.overtime_hours_last_month,
        overtime_delta_hours: data.overtime_hours_last_month - data.overtime_hours_two_months_ago,
        unanswered_questionnaire_count: data.unanswered_questionnaire_count,
        growth: {
          one_on_one_overdue_30d: data.one_on_one_overdue_30d,
          evaluation_not_confirmed: data.evaluation_not_confirmed,
          has_skill_gap: data.has_skill_gap,
          has_incomplete_el: data.has_incomplete_el,
        },
      },
    },
  }
}
