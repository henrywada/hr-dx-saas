// src/features/executive-summary/csv-utils.ts
// クライアント側から安全にインポートできる純粋なCSVユーティリティ
import type { ExecutiveSummaryData } from './types'

/** CSVエクスポート用：ハイライト＋KPI要点をフラットな行配列に変換する */
export function summaryToCsvRows(summary: ExecutiveSummaryData): string[][] {
  const fmt = (v: number | null, unit: string) => (v != null ? `${v}${unit}` : 'データなし')

  const rows: string[][] = [['区分', '項目', '値', '集計基準月']]

  for (const h of summary.highlights) {
    rows.push(['要対応シグナル', h.label, `${h.count}${h.unit}`, summary.yearMonth])
  }
  for (const k of summary.kpiHeadlines) {
    rows.push(['横断KPI', k.label, fmt(k.value, k.unit), summary.yearMonth])
  }

  return rows
}
