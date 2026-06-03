// src/features/hr-kpi/types.ts

/** 採用KPI */
export interface RecruitKpi {
  /** 今月の応募数 */
  applicantsThisMonth: number
  /** アクティブ候補者の選考通過率（応募→内定・入社）%  */
  passThroughRate: number | null
  /** 充足率（hired / 公開求人数）% */
  fillRate: number | null
  /** 公開中の求人数 */
  openJobPostings: number
}

/** 定着KPI */
export interface RetentionKpi {
  /** 直近12ヶ月の退職者数（active_status が inactive になった件数） */
  turnoverCountLast12Months: number
  /** 在籍従業員総数 */
  totalActiveEmployees: number
  /** 離職率（%、直近12ヶ月） */
  turnoverRatePercent: number | null
  /** 平均在籍年数（月単位、activeな従業員のhired_dateから算出） */
  avgTenureMonths: number | null
}

/** 生産性KPI */
export interface ProductivityKpi {
  /** 当月の1人あたり平均残業時間（hours） */
  avgOvertimeHoursThisMonth: number | null
  /** 当年度の有休取得率（%） */
  paidLeaveUtilizationPercent: number | null
  /** 36協定特別条項対象者数（当月・未解消） */
  article36SubjectCount: number
}

/** エンゲージメントKPI */
export interface EngagementKpi {
  /** 直近パルスサーベイ期間の平均スコア（0-5.0スケール、DB値÷2で換算） */
  latestPulseSurveyScore: number | null
  /** 直近パルスサーベイの回答率（%） */
  latestPulseResponseRate: number | null
  /** 直近ストレスチェック期間の高ストレス率（%） */
  highStressRatePercent: number | null
}

/** 育成KPI */
export interface DevelopmentKpi {
  /** スキルギャップ率（スキル割り当て済み従業員のうち要件が存在する職種を持つ割合）% */
  skillGapRatePercent: number | null
  /** eラーニング研修完了率（完了数/総割り当て数）% */
  elCompletionRatePercent: number | null
  /** eラーニング割り当て総数 */
  activeElAssignments: number
}

/** ダッシュボード全体のKPIバンドル */
export interface HrKpiBundle {
  recruit: RecruitKpi
  retention: RetentionKpi
  productivity: ProductivityKpi
  engagement: EngagementKpi
  development: DevelopmentKpi
  /** 集計基準年月（YYYY-MM） */
  yearMonth: string
  /** データ取得日時（ISO 8601） */
  fetchedAt: string
}
