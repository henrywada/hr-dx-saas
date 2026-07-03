// src/features/executive-summary/types.ts

/** ハイライトカード1件分（離職リスク・エンゲージメントアラート・1on1未実施） */
export interface ExecutiveAlertHighlight {
  key: 'turnoverRisk' | 'engagementAlert' | 'oneOnOneOverdue'
  label: string
  description: string
  count: number
  unit: string
  /** count > 0 なら true（赤系表示・要対応） */
  isAlert: boolean
  /** ドリルダウン先（既存の各詳細ダッシュボード） */
  href: string
}

/** 横断KPI要点1件分 */
export interface ExecutiveKpiHeadline {
  label: string
  value: number | null
  unit: string
}

/** エグゼクティブサマリー画面全体のデータ */
export interface ExecutiveSummaryData {
  highlights: ExecutiveAlertHighlight[]
  kpiHeadlines: ExecutiveKpiHeadline[]
  /** 集計基準年月（YYYY-MM） */
  yearMonth: string
  /** データ取得日時（ISO 8601） */
  fetchedAt: string
}
