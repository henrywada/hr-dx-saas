/** パルスサーベイ 月次集計 */
export interface PulseTrendPoint {
  period: string // 'YYYY-MM'
  label: string // 'YYYY年M月度'
  score: number // 0.0〜5.0（DBスコア ÷2）
  responseRate: number // 0〜100（%）
}

/** ストレスチェック 実施期間別集計 */
export interface StressTrendPoint {
  periodTitle: string // stress_check_periods.title
  periodStart: string // 'YYYY-MM-DD'
  highStressRate: number // 0〜100（%）
  totalCount: number
  highStressCount: number
}

/** アンケート（Echo）実施期間別集計 */
export interface QuestionnaireTrendPoint {
  periodLabel: string // questionnaire_periods.label
  periodStart: string // 'YYYY-MM-DD'
  responseRate: number // 0〜100（%）
  submittedCount: number
  totalCount: number
}

/** 部署別スコア（3ソース統合） */
export interface DepartmentEngagementRow {
  divisionId: string
  divisionName: string
  /** 組織階層番号（divisions.layer）。Top階層が1、数字が大きいほど下位階層 */
  layer: number | null
  pulseScore: number | null
  highStressRate: number | null
  questionnaireResponseRate: number | null
  compositeScore: number // 0〜100 の合成スコア
  status: 'good' | 'caution' | 'alert'
}

/** ダッシュボード最上位データ */
export interface EngagementDashboardData {
  /** パルスサーベイ: 直近12ヶ月の月次推移 */
  pulseTrend: PulseTrendPoint[]
  /** 最新期のパルスサーベイスコア */
  latestPulseScore: number | null
  latestPulsePeriod: string | null
  /** ストレスチェック: 直近3期の高ストレス率推移 */
  stressTrend: StressTrendPoint[]
  /** 最新期の高ストレス率 */
  latestHighStressRate: number | null
  /** アンケート: 直近6期の回答率推移 */
  questionnaireTrend: QuestionnaireTrendPoint[]
  /** 最新期のアンケート回答率 */
  latestQuestionnaireResponseRate: number | null
  /** 部署別エンゲージメントヒートマップ */
  departments: DepartmentEngagementRow[]
  /** データ有無フラグ */
  hasPulseData: boolean
  hasStressData: boolean
  hasQuestionnaireData: boolean
  /** 評価・1on1・スキル・eラーニングの成長KPI（P6 フェーズ3） */
  growthKpi: GrowthDevelopmentKpi
}

/** 成長・育成レイヤーの横断KPI */
export interface GrowthDevelopmentKpi {
  evaluationCompletionRatePercent: number | null
  elCompletionRatePercent: number | null
  skillGapRatePercent: number | null
  oneOnOneSessionsLast30Days: number
  oneOnOneOverdueCount: number
}
