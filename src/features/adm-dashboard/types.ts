/** /adm メインダッシュボードに表示する集約データ */
export interface AdmDashboardSummary {
  headcount: {
    /** 在籍社員数（産業医を除く） */
    activeEmployees: number
    /** 在籍中の産業医数 */
    companyDoctorCount: number
    /** 今月入社の社員数 */
    hiredThisMonth: number
    /** 離職率（年換算、%） */
    turnoverRatePercent: number | null
    /** 採用中（公開中）ポジション数 */
    openJobPostings: number
  }
  pulseSurvey: {
    /** 直近パルスサーベイの回答率（%） */
    responseRatePercent: number | null
    /** 直近パルスサーベイのスコア（0-5スケール） */
    score: number | null
  }
  skillMap: {
    /** スキルマップに登録されたスキル数 */
    registeredSkillCount: number
  }
  oneOnOne: {
    /** 直近30日の1on1実施件数 */
    sessionsLast30Days: number
    /** 30日以上未実施の対象者数 */
    overdueCount: number
  }
  stressCheck: {
    /** 実施中期間の受検率（%）。実施中期間が無い場合は null */
    submissionRatePercent: number | null
    /** 高ストレス者数（実施中期間が無い場合は0） */
    highStressCount: number
  }
  eLearning: {
    /** 公開中のコース数 */
    publishedCourseCount: number
    /** 受講中（未完了）の割り当て数 */
    inProgressAssignmentCount: number
  }
  questionnaire: {
    /** 実施中（status='active'）のアンケート件数 */
    activeCount: number
    /** 実施中アンケートの平均回答率（%） */
    averageResponseRatePercent: number | null
  }
  wellbeing: {
    /** 直近30日の感謝・称賛(Kudos)送信件数 */
    kudosCountLast30Days: number
    /** 直近30日のコンディション平均スコア（匿名化閾値n<5の場合はnull） */
    conditionAverageScore: number | null
    /** 直近30日のコンディション回答者数 */
    conditionRespondentCount: number
    /** 未対応の相談件数 */
    pendingConsultationCount: number
    /** 開催予定の社内イベント数 */
    upcomingEventCount: number
  }
  evaluation: {
    /** 選択中評価期間の完了率（flow_status='confirmed' の割合、%） */
    completionRatePercent: number | null
    /** 選択中の評価期間 ID */
    selectedPeriodId: string | null
    /** 選択中の評価期間名 */
    selectedPeriodName: string | null
    /** 期間選択 UI 用の一覧 */
    periods: { id: string; name: string }[]
  }
  careerDiscussion: {
    /** 直近180日のキャリア面談実施率（在籍従業員に対する割合、%） */
    ratePercent: number | null
    /** 予約済み・未実施の面談件数 */
    upcomingAppointmentCount: number
    /** 90日以上未実施の従業員数 */
    overdueEmployeeCount: number
  }
}
